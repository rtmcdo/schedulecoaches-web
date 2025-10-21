const { app } = require('@azure/functions');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// NOTE: create-checkout-session has been migrated to TypeScript (createCheckoutSession.ts)
// This file now only contains portal and webhook endpoints (will be migrated in Phase 5)

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

// WEBHOOK
app.http('webhook', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'webhook',
  handler: async (request, context) => {
    let event;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    try {
      // Get the raw body for signature verification
      const body = await request.text();
      const signature = request.headers.get('stripe-signature');

      if (!signature) {
        return {
          status: 400,
          body: 'Missing stripe-signature header'
        };
      }

      // Verify webhook signature
      if (endpointSecret) {
        try {
          event = stripe.webhooks.constructEvent(
            body,
            signature,
            endpointSecret
          );
        } catch (err) {
          context.error('Webhook signature verification failed:', err.message);
          return {
            status: 400,
            body: `Webhook Error: ${err.message}`
          };
        }
      } else {
        // If no webhook secret is configured, just parse the body
        event = JSON.parse(body);
      }

      // Handle the event
      let subscription;
      let status;

      switch (event.type) {
        case 'customer.subscription.trial_will_end':
          subscription = event.data.object;
          status = subscription.status;
          context.log(`Subscription status is ${status}.`);
          // TODO: Handle subscription trial ending
          // e.g., send reminder email to customer
          break;

        case 'customer.subscription.deleted':
          subscription = event.data.object;
          status = subscription.status;
          context.log(`Subscription status is ${status}.`);
          // TODO: Handle subscription deletion
          // e.g., revoke access, update database
          break;

        case 'customer.subscription.created':
          subscription = event.data.object;
          status = subscription.status;
          context.log(`Subscription status is ${status}.`);
          // TODO: Handle subscription creation
          // e.g., grant access, update database
          break;

        case 'customer.subscription.updated':
          subscription = event.data.object;
          status = subscription.status;
          context.log(`Subscription status is ${status}.`);
          // TODO: Handle subscription update
          // e.g., update database with new status
          break;

        case 'entitlements.active_entitlement_summary.updated':
          subscription = event.data.object;
          context.log(`Active entitlement summary updated for ${subscription}.`);
          // TODO: Handle entitlement update
          break;

        case 'invoice.paid':
          const invoice = event.data.object;
          context.log(`Invoice ${invoice.id} was paid.`);
          // TODO: Handle successful payment
          break;

        case 'invoice.payment_failed':
          const failedInvoice = event.data.object;
          context.log(`Invoice ${failedInvoice.id} payment failed.`);
          // TODO: Handle failed payment
          // e.g., send email notification, restrict access
          break;

        default:
          context.log(`Unhandled event type: ${event.type}`);
      }

      // Return a 200 response to acknowledge receipt of the event
      return {
        status: 200,
        body: JSON.stringify({ received: true })
      };

    } catch (error) {
      context.error('Error processing webhook:', error);
      return {
        status: 500,
        body: `Webhook Error: ${error.message}`
      };
    }
  }
});
