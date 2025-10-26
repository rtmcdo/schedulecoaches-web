import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { authenticate } from '../utils/auth';
import { getCorsHeaders } from '../middleware/cors';
import { getConnection } from '../utils/database';
import Stripe from 'stripe';
import sql from 'mssql';

/**
 * Create Stripe Billing Portal Session endpoint
 *
 * This endpoint:
 * 1. Authenticates users via Bearer token
 * 2. Looks up user's Stripe customer ID from database
 * 3. Creates a Stripe billing portal session
 * 4. Returns portal URL for frontend to redirect to
 *
 * The Stripe Billing Portal allows customers to:
 * - Update payment methods
 * - View invoices and receipts
 * - Cancel subscriptions
 * - Update billing information
 */
export async function createPortalSessionHandler(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('[createPortalSession] Processing request');

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return {
            status: 204,
            headers: getCorsHeaders(request)
        };
    }

    // Authenticate user
    const auth = await authenticate(request, context);
    if (!auth.authenticated || !auth.user) {
        return {
            status: 401,
            body: JSON.stringify({
                error: auth.error || 'Authentication required'
            }),
            headers: getCorsHeaders(request)
        };
    }

    const user = auth.user;

    try {
        // Look up user in database to get Stripe customer ID
        const pool = await getConnection();

        // Determine provider column based on token
        const provider = user.provider;
        const providerColumn = provider === 'google'
            ? 'googleAccountId'
            : provider === 'microsoft'
                ? 'microsoftAccountId'
                : provider === 'apple'
                    ? 'appleAccountId'
                    : 'entraAccountId';

        const userResult = await pool.request()
            .input('accountId', sql.NVarChar, user.id)
            .input('email', sql.NVarChar, user.email)
            .query(`
                SELECT id, email, stripeCustomerId
                FROM Users
                WHERE ${providerColumn} = @accountId
                   OR azureAdId = @accountId
                   OR (email IS NOT NULL AND LOWER(email) = LOWER(@email))
            `);

        if (!userResult.recordset || userResult.recordset.length === 0) {
            return {
                status: 404,
                body: JSON.stringify({
                    error: 'User not found in database. Please ensure your account was created via /api/auth-me first.'
                }),
                headers: getCorsHeaders(request)
            };
        }

        const dbUser = userResult.recordset[0];
        const stripeCustomerId = dbUser.stripeCustomerId;

        if (!stripeCustomerId) {
            return {
                status: 400,
                body: JSON.stringify({
                    error: 'No Stripe customer ID found. Please complete a payment first.'
                }),
                headers: getCorsHeaders(request)
            };
        }

        context.log('[createPortalSession] Found Stripe customer:', stripeCustomerId);

        // Initialize Stripe
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeSecretKey) {
            throw new Error('STRIPE_SECRET_KEY environment variable not set');
        }
        const stripe = new Stripe(stripeSecretKey, {
            apiVersion: '2023-10-16'
        });

        // Get domain for return URL
        const domain = process.env.DOMAIN || 'http://localhost:5173';

        // Create billing portal session
        // Add ?from=stripe to prevent redirect loop when user returns
        const session = await stripe.billingPortal.sessions.create({
            customer: stripeCustomerId,
            return_url: `${domain}/account?from=stripe`
        });

        context.log('[createPortalSession] Portal session created:', session.id);

        return {
            status: 200,
            body: JSON.stringify({
                url: session.url
            }),
            headers: getCorsHeaders(request)
        };

    } catch (error: any) {
        context.error('[createPortalSession] Error:', error);

        return {
            status: 500,
            body: JSON.stringify({
                error: 'Failed to create billing portal session',
                message: error.message
            }),
            headers: getCorsHeaders(request)
        };
    }
}

// Register the function with Azure Functions
app.http('createPortalSession', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'create-portal-session',
    handler: createPortalSessionHandler
});

// Export for testing
export { createPortalSessionHandler as createPortalSession };
