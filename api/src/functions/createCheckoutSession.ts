import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { authenticate } from '../utils/auth';
import { getCorsHeaders } from '../middleware/cors';
import { getConnection } from '../utils/database';
import Stripe from 'stripe';
import sql from 'mssql';

/**
 * Create Stripe Checkout Session endpoint for schedulecoaches.com
 *
 * This endpoint:
 * 1. Authenticates users via Bearer token
 * 2. Creates a Stripe checkout session for subscription payment
 * 3. Pre-fills user email and includes user ID in metadata for webhook processing
 * 4. Returns checkout URL for frontend to redirect to Stripe
 *
 * Flow:
 * 1. User authenticates and calls this endpoint
 * 2. Backend creates Stripe checkout session with user email pre-filled
 * 3. Frontend redirects user to Stripe checkout page
 * 4. After payment, Stripe redirects to success page
 * 5. Stripe webhook (Phase 5) updates user role to 'coach_paid'
 */
export async function createCheckoutSessionHandler(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('[createCheckoutSession] Processing request');

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
        // Parse request body
        const body = await request.json() as any;
        const lookup_key = body.lookup_key || 'pickleball_monthly';
        const referral_code = body.referral_code;
        const customMetadata = body.metadata || {};

        // Look up user in database to get database row ID (not token subject ID)
        // The webhook needs the database UUID to update the user's subscription status
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
                SELECT id, email
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
        const dbUserId = dbUser.id; // This is the database UUID, not the token subject

        context.log('[createCheckoutSession] Found user in database:', dbUserId, 'for email:', user.email);

        // Initialize Stripe
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeSecretKey) {
            throw new Error('STRIPE_SECRET_KEY environment variable not set');
        }
        const stripe = new Stripe(stripeSecretKey, {
            apiVersion: '2023-10-16'
        });

        // Price mapping - maps lookup keys to Stripe Price IDs
        // TODO: Add lookup_key to Stripe prices and remove this hardcoded mapping
        const PRICE_MAP: Record<string, string> = {
            'pickleball_monthly': process.env.STRIPE_PRICE_ID || 'price_1SJd4cJaM1HQdA8LxAzSBG12'
        };

        // Get price ID from mapping (fallback to API lookup)
        let priceId = PRICE_MAP[lookup_key];

        if (!priceId) {
            context.log('[createCheckoutSession] Price not in map, fetching from Stripe API');
            // Try to get the price using the lookup key from Stripe
            const prices = await stripe.prices.list({
                lookup_keys: [lookup_key],
                expand: ['data.product']
            });

            if (!prices.data || prices.data.length === 0) {
                return {
                    status: 404,
                    body: JSON.stringify({
                        error: 'Price not found for the given lookup key'
                    }),
                    headers: getCorsHeaders(request)
                };
            }

            priceId = prices.data[0].id;
        }

        // Get domain for redirect URLs
        const domain = process.env.DOMAIN || 'http://localhost:5173';

        // Create checkout session
        const sessionParams: Stripe.Checkout.SessionCreateParams = {
            billing_address_collection: 'auto',
            line_items: [
                {
                    price: priceId,
                    quantity: 1
                }
            ],
            mode: 'subscription',
            success_url: `${domain}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${domain}/sign-up`,
            customer_email: user.email,
            metadata: {
                user_id: dbUserId,  // Database row ID (UUID), not token subject
                user_email: user.email,
                ...customMetadata  // Preserve any custom metadata from request body
            }
        };

        // Add referral_code if provided
        if (referral_code) {
            sessionParams.metadata!.referral_code = referral_code;
        }

        context.log('[createCheckoutSession] Creating Stripe session for user:', user.email);
        const session = await stripe.checkout.sessions.create(sessionParams);

        return {
            status: 200,
            body: JSON.stringify({
                url: session.url
            }),
            headers: getCorsHeaders(request)
        };

    } catch (error: any) {
        context.error('[createCheckoutSession] Error:', error);

        return {
            status: 500,
            body: JSON.stringify({
                error: 'Failed to create checkout session',
                message: error.message
            }),
            headers: getCorsHeaders(request)
        };
    }
}

// Register the function with Azure Functions
app.http('createCheckoutSession', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'create-checkout-session',
    handler: createCheckoutSessionHandler
});

// Export for testing
export { createCheckoutSessionHandler as createCheckoutSession };
