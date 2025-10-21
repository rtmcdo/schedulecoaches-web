import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { authenticate } from '../utils/auth';
import { getCorsHeaders } from '../middleware/cors';
import sql from 'mssql';
import { getConnection } from '../utils/database';
import crypto from 'crypto';

/**
 * Authentication endpoint for schedulecoaches.com
 *
 * This endpoint:
 * 1. Authenticates users via Entra ID, Google, or Apple tokens
 * 2. Creates stub accounts with role 'coach_unpaid' for new users
 * 3. Links accounts by email if user exists with different provider
 * 4. Returns subscription status for frontend
 *
 * Flow:
 * - New user signs up -> created with role 'coach_unpaid'
 * - After Stripe payment -> webhook updates to 'coach_paid'
 * - Can then login to pbcoach mobile app with same credentials
 */
export async function authMeHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const apiVersion = process.env.API_VERSION || 'dev-local';
    context.log(`[authMe] Processing request (apiVersion=${apiVersion})`);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return {
            status: 204,
            headers: getCorsHeaders(request)
        };
    }

    // Authenticate user with token
    const auth = await authenticate(request, context);
    if (!auth.authenticated || !auth.user) {
        return {
            status: 401,
            body: JSON.stringify({
                error: auth.error || 'Authentication failed'
            }),
            headers: getCorsHeaders(request)
        };
    }

    // After authentication check, user is guaranteed to be defined
    const user = auth.user;
    const provider: 'entra' | 'google' | 'apple' | 'microsoft' = user.provider === 'google'
        ? 'google'
        : user.provider === 'microsoft'
            ? 'microsoft'
            : user.provider === 'apple'
                ? 'apple'
                : 'entra';
    const accountId: string = user.id;

    // Determine which database column to use for this provider
    const providerColumn = provider === 'google'
        ? 'googleAccountId'
        : provider === 'microsoft'
            ? 'microsoftAccountId'
            : provider === 'apple'
                ? 'appleAccountId'
                : 'entraAccountId';

    // Normalize name fields from token
    const normalizedFirstName = user.firstName || user.name?.split(' ')[0] || '';
    const normalizedLastName = user.lastName || (user.name ? user.name.split(' ').slice(1).join(' ') : '');

    // Check if user is admin
    const ADMIN_GROUP_ID = 'ee937a26-8887-417c-af3d-bc6d9b4722e2';
    const ADMIN_EMAILS = ['ryan@jrmsoftware.com'];
    const normalizedEmail = user.email?.toLowerCase();
    const isAdmin = user.groups?.includes(ADMIN_GROUP_ID) || ADMIN_EMAILS.includes(normalizedEmail) || false;

    try {
        const pool = await getConnection();

        // Try to find user by provider account ID
        const result = await pool.request()
            .input('accountId', sql.NVarChar, accountId)
            .query(`
                SELECT
                    id,
                    email,
                    firstName,
                    lastName,
                    phone,
                    role,
                    isActive,
                    stripeCustomerId,
                    stripeSubscriptionId,
                    subscriptionStatus,
                    subscriptionEndDate
                FROM Users
                WHERE ${providerColumn} = @accountId OR azureAdId = @accountId
            `);
        let dbUser = result.recordset[0];

        // If not found by account ID, try to find by email and link the account
        if (!dbUser && user.email) {
            const emailLookup = await pool.request()
                .input('email', sql.NVarChar, user.email)
                .query(`
                    SELECT
                        id,
                        email,
                        firstName,
                        lastName,
                        phone,
                        role,
                        isActive,
                        stripeCustomerId,
                        stripeSubscriptionId,
                        subscriptionStatus,
                        subscriptionEndDate
                    FROM Users
                    WHERE LOWER(email) = LOWER(@email)
                `);

            if (emailLookup.recordset.length > 0) {
                dbUser = emailLookup.recordset[0];
                context.log('[authMe] Found user by email, linking provider account');

                // Link this provider's account ID to the existing user for future lookups
                // Only set azureAdId if provider is Entra or Microsoft (preserve existing value otherwise)
                const updateQuery = provider === 'entra' || provider === 'microsoft'
                    ? `UPDATE Users SET ${providerColumn} = @accountId, azureAdId = @accountId WHERE id = @userId`
                    : `UPDATE Users SET ${providerColumn} = @accountId WHERE id = @userId`;

                await pool.request()
                    .input('userId', sql.UniqueIdentifier, dbUser.id)
                    .input('accountId', sql.NVarChar, accountId)
                    .query(updateQuery);
            }
        }

        // If user doesn't exist, create stub account
        if (!dbUser) {
            context.log('[authMe] User not found, creating new stub account:', user.email);
            const newUserId = crypto.randomUUID();
            const role = isAdmin ? 'admin' : 'coach';
            const subscriptionStatus = isAdmin ? 'active' : 'unpaid'; // Admins always active, coaches start unpaid
            context.log('[authMe] Assigning role:', role, 'subscriptionStatus:', subscriptionStatus, '(isAdmin:', isAdmin, ')');

            const entraAccountId = provider === 'entra' ? accountId : null;
            const googleAccountId = provider === 'google' ? accountId : null;
            const microsoftAccountId = provider === 'microsoft' ? accountId : null;
            const appleAccountId = provider === 'apple' ? accountId : null;
            // Only set azureAdId for Entra and Microsoft providers
            const azureAdId = (provider === 'entra' || provider === 'microsoft') ? accountId : null;

            try {
                // Insert new user with race condition protection
                const insertResult = await pool.request()
                    .input('userId', sql.UniqueIdentifier, newUserId)
                    .input('azureAdId', sql.NVarChar, azureAdId)
                    .input('entraAccountId', sql.NVarChar, entraAccountId)
                    .input('googleAccountId', sql.NVarChar, googleAccountId)
                    .input('microsoftAccountId', sql.NVarChar, microsoftAccountId)
                    .input('appleAccountId', sql.NVarChar, appleAccountId)
                    .input('email', sql.NVarChar, user.email || null)
                    .input('firstName', sql.NVarChar, normalizedFirstName)
                    .input('lastName', sql.NVarChar, normalizedLastName)
                    .input('role', sql.NVarChar, role)
                    .input('subscriptionStatus', sql.NVarChar, subscriptionStatus)
                    .query(`
                        INSERT INTO Users (
                            id,
                            azureAdId,
                            entraAccountId,
                            googleAccountId,
                            microsoftAccountId,
                            appleAccountId,
                            email,
                            firstName,
                            lastName,
                            role,
                            subscriptionStatus,
                            isActive,
                            createdAt
                        )
                        SELECT
                            @userId,
                            @azureAdId,
                            @entraAccountId,
                            @googleAccountId,
                            @microsoftAccountId,
                            @appleAccountId,
                            @email,
                            @firstName,
                            @lastName,
                            @role,
                            @subscriptionStatus,
                            1,
                            GETUTCDATE()
                        WHERE NOT EXISTS (
                            SELECT 1 FROM Users
                            WHERE ${providerColumn} = @accountId
                                OR (@email IS NOT NULL AND LOWER(email) = LOWER(@email))
                        )
                    `);

                const wasInserted = insertResult.rowsAffected?.[0] === 1;

                if (!wasInserted) {
                    // Another request created the user concurrently
                    context.log('[authMe] User was created concurrently, loading existing record');
                    const existingUserResult = await pool.request()
                        .input('accountId', sql.NVarChar, accountId)
                        .input('email', sql.NVarChar, user.email || null)
                        .query(`
                            SELECT
                                id,
                                email,
                                firstName,
                                lastName,
                                phone,
                                role,
                                isActive,
                                stripeCustomerId,
                                stripeSubscriptionId,
                                subscriptionStatus,
                                subscriptionEndDate
                            FROM Users
                            WHERE ${providerColumn} = @accountId
                                OR (@email IS NOT NULL AND LOWER(email) = LOWER(@email))
                        `);

                    dbUser = existingUserResult.recordset[0];

                    if (!dbUser) {
                        throw new Error('Failed to load user after concurrent creation');
                    }
                } else {
                    // Set the new user data
                    dbUser = {
                        id: newUserId,
                        email: user.email,
                        firstName: normalizedFirstName,
                        lastName: normalizedLastName,
                        phone: null,
                        role,
                        isActive: true,
                        stripeCustomerId: null,
                        stripeSubscriptionId: null,
                        subscriptionStatus: null,
                        subscriptionEndDate: null
                    };

                    context.log('[authMe] Created new user with ID:', newUserId);
                }
            } catch (insertError: any) {
                context.error('[authMe] Insert error details:', {
                    message: insertError.message,
                    code: insertError.code,
                    state: insertError.state,
                    number: insertError.number,
                    lineNumber: insertError.lineNumber,
                    procName: insertError.procName
                });
                throw insertError;
            }
        }

        // Ensure provider-specific account columns are populated for future lookups
        if (dbUser) {
            // Only set azureAdId if provider is Entra/Microsoft and azureAdId is currently null/empty
            const updateQuery = provider === 'entra' || provider === 'microsoft'
                ? `UPDATE Users
                   SET ${providerColumn} = @accountId,
                       azureAdId = CASE WHEN azureAdId IS NULL OR azureAdId = '' THEN @accountId ELSE azureAdId END
                   WHERE id = @userId`
                : `UPDATE Users
                   SET ${providerColumn} = @accountId
                   WHERE id = @userId`;

            await pool.request()
                .input('userId', sql.UniqueIdentifier, dbUser.id)
                .input('accountId', sql.NVarChar, accountId)
                .query(updateQuery);
        }

        // Ensure admins have admin role (takes precedence over subscription roles)
        if (isAdmin && dbUser.role !== 'admin') {
            context.log('[authMe] Upgrading user role to admin based on group membership:', dbUser.email);
            await pool.request()
                .input('userId', sql.UniqueIdentifier, dbUser.id)
                .query(`
                    UPDATE Users
                    SET role = 'admin'
                    WHERE id = @userId
                `);
            dbUser.role = 'admin';
        }
        // Downgrade from admin if no longer in admin group
        else if (!isAdmin && dbUser.role === 'admin') {
            context.log('[authMe] Downgrading user from admin to coach - no longer in admin group:', dbUser.email);
            await pool.request()
                .input('userId', sql.UniqueIdentifier, dbUser.id)
                .query(`
                    UPDATE Users
                    SET role = 'coach',
                        subscriptionStatus = COALESCE(subscriptionStatus, 'unpaid')
                    WHERE id = @userId
                `);
            dbUser.role = 'coach';
            dbUser.subscriptionStatus = dbUser.subscriptionStatus || 'unpaid';
        }

        // Refresh first/last name if missing in database
        const needsNameUpdate = (!dbUser.firstName && normalizedFirstName) || (!dbUser.lastName && normalizedLastName);
        if (needsNameUpdate) {
            const updateRequest = pool.request()
                .input('userId', sql.UniqueIdentifier, dbUser.id);

            if (!dbUser.firstName && normalizedFirstName) {
                updateRequest.input('firstName', sql.NVarChar, normalizedFirstName);
            }
            if (!dbUser.lastName && normalizedLastName) {
                updateRequest.input('lastName', sql.NVarChar, normalizedLastName);
            }

            await updateRequest.query(`
                UPDATE Users
                SET
                    ${!dbUser.firstName && normalizedFirstName ? 'firstName = @firstName' : ''}
                    ${!dbUser.firstName && normalizedFirstName && !dbUser.lastName && normalizedLastName ? ',' : ''}
                    ${!dbUser.lastName && normalizedLastName ? 'lastName = @lastName' : ''}
                WHERE id = @userId
            `);

            dbUser.firstName = dbUser.firstName || normalizedFirstName;
            dbUser.lastName = dbUser.lastName || normalizedLastName;
        }

        // Determine if user needs to complete profile or payment
        // Note: Base on subscriptionStatus, not role (database has old role values like coach_paid)
        // Clients have NULL subscriptionStatus so won't match; admins have 'active' not 'unpaid'
        const needsProfileCompletion = !dbUser.stripeCustomerId &&
                                       dbUser.subscriptionStatus === 'unpaid';
        const hasActiveSubscription = dbUser.subscriptionStatus === 'active' ||
                                       dbUser.subscriptionStatus === 'free' ||
                                       dbUser.subscriptionStatus === 'trialing' ||
                                       dbUser.role === 'admin';

        // Return user with subscription status
        context.log('[authMe] Returning user with role:', dbUser.role, 'for email:', dbUser.email);
        return {
            status: 200,
            body: JSON.stringify({
                user: {
                    ...dbUser,
                    needsProfileCompletion,
                    hasActiveSubscription
                }
            }),
            headers: getCorsHeaders(request)
        };

    } catch (error: any) {
        context.error('[authMe] Error:', error);

        return {
            status: 500,
            body: JSON.stringify({
                error: 'Failed to get or create user',
                details: error.message
            }),
            headers: getCorsHeaders(request)
        };
    }
}

// Register the function with Azure Functions
app.http('authMe', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'auth-me',
    handler: authMeHandler
});

// Export for testing
export { authMeHandler as authMe };
