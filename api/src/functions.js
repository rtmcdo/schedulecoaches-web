const { app } = require('@azure/functions');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// NOTE: create-checkout-session and webhook have been migrated to TypeScript
// This file now only contains the billing portal endpoint (will be migrated in future phase)

// CREATE PORTAL SESSION
app.http('create-portal-session', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'create-portal-session',
  handler: async (request, context) => {
    try {
      const body = await request.json();
      const { session_id } = body;

      if (!session_id) {
        return {
          status: 400,
          jsonBody: {
            error: 'session_id is required'
          }
        };
      }

      // Retrieve the checkout session to get the customer details
      const checkoutSession = await stripe.checkout.sessions.retrieve(session_id);
      const customerAccount = checkoutSession.customer_account;
      const customer = checkoutSession.customer;

      if (!customerAccount && !customer) {
        return {
          status: 400,
          jsonBody: {
            error: 'No customer found for this session'
          }
        };
      }

      const domain = process.env.DOMAIN || 'http://localhost:5173';

      // Create billing portal session
      const portalSession = await stripe.billingPortal.sessions.create({
        // Prefer customer_account when available (Stripe Accounts v2)
        ...(customerAccount
          ? { customer_account: customerAccount }
          : { customer: typeof customer === 'string' ? customer : customer.id }),
        return_url: domain,
      });

      return {
        status: 200,
        jsonBody: {
          url: portalSession.url
        }
      };
    } catch (error) {
      context.error('Error creating portal session:', error);
      return {
        status: 500,
        jsonBody: {
          error: 'Failed to create portal session',
          message: error.message
        }
      };
    }
  }
});
