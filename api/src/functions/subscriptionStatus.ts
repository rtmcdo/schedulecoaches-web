import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { authenticate } from '../utils/auth';
import { getCorsHeaders } from '../middleware/cors';
import sql from 'mssql';
import { getConnection } from '../utils/database';

/**
 * Subscription Status Endpoint
 *
 * Lightweight endpoint for checking current subscription status.
 * Unlike /api/auth-me, this endpoint does NOT create users or link accounts.
 * It simply returns subscription data for existing authenticated users.
 *
 * Use cases:
 * - Frontend polling to check if subscription was updated after payment
 * - Checking subscription status without triggering user creation logic
 * - Lighter weight than auth-me for status checks
 */
export async function subscriptionStatusHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const apiVersion = process.env.API_VERSION || 'dev-local';
    context.log(`[subscriptionStatus] Processing request (apiVersion=${apiVersion})`);

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

    try {
        const pool = await getConnection();

        // Try to find user by provider account ID or email
        const result = await pool.request()
            .input('accountId', sql.NVarChar, accountId)
            .input('email', sql.NVarChar, user.email || null)
            .query(`
                SELECT
                    id,
                    email,
                    firstName,
                    lastName,
                    role,
                    stripeCustomerId,
                    stripeSubscriptionId,
                    subscriptionStatus,
                    subscriptionEndDate,
                    isActive
                FROM Users
                WHERE ${providerColumn} = @accountId
                    OR azureAdId = @accountId
                    OR (@email IS NOT NULL AND LOWER(email) = LOWER(@email))
            `);

        const dbUser = result.recordset[0];

        if (!dbUser) {
            // User not found - they need to sign up first via /api/auth-me
            context.log('[subscriptionStatus] User not found:', user.email);
            return {
                status: 404,
                body: JSON.stringify({
                    error: 'User not found',
                    message: 'Please complete signup at schedulecoaches.com first'
                }),
                headers: getCorsHeaders(request)
            };
        }

        // Determine subscription flags
        const hasActiveSubscription = dbUser.subscriptionStatus === 'active' ||
                                       dbUser.subscriptionStatus === 'free' ||
                                       dbUser.subscriptionStatus === 'trialing' ||
                                       dbUser.role === 'admin';

        const needsPayment = dbUser.role === 'coach' &&
                            (dbUser.subscriptionStatus === 'unpaid' ||
                             dbUser.subscriptionStatus === 'canceled' ||
                             dbUser.subscriptionStatus === 'incomplete' ||
                             dbUser.subscriptionStatus === 'incomplete_expired');

        const isInGracePeriod = dbUser.subscriptionStatus === 'past_due';

        // Return subscription status with caching headers
        context.log('[subscriptionStatus] Returning status for user:', dbUser.email, 'status:', dbUser.subscriptionStatus);

        // Cache for 1 minute to reduce database load for polling scenarios
        const cacheHeaders = {
            'Cache-Control': 'private, max-age=60',
            'ETag': `"${dbUser.id}-${dbUser.subscriptionStatus || 'none'}"`,
        };

        return {
            status: 200,
            body: JSON.stringify({
                id: dbUser.id,
                email: dbUser.email,
                firstName: dbUser.firstName,
                lastName: dbUser.lastName,
                role: dbUser.role,
                subscriptionStatus: dbUser.subscriptionStatus,
                subscriptionEndDate: dbUser.subscriptionEndDate,
                stripeCustomerId: dbUser.stripeCustomerId,
                hasActiveSubscription,
                needsPayment,
                isInGracePeriod
            }),
            headers: {
                ...getCorsHeaders(request),
                ...cacheHeaders
            }
        };

    } catch (error: any) {
        context.error('[subscriptionStatus] Error:', error);

        return {
            status: 500,
            body: JSON.stringify({
                error: 'Failed to get subscription status',
                details: error.message
            }),
            headers: getCorsHeaders(request)
        };
    }
}

// Register the function with Azure Functions
app.http('subscriptionStatus', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'subscription-status',
    handler: subscriptionStatusHandler
});

// Export for testing
export { subscriptionStatusHandler as subscriptionStatus };
