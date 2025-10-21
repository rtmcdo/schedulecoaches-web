const { app } = require('@azure/functions');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Price mapping - maps lookup keys to Stripe Price IDs
// TODO: Add lookup_key to Stripe prices and remove this mapping
const PRICE_MAP = {
  'pickleball_monthly': 'price_1SJd4cJaM1HQdA8LxAzSBG12'
};

// CREATE CHECKOUT SESSION
app.http('create-checkout-session', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'create-checkout-session',
  handler: async (request, context) => {
    try {
      const body = await request.json();
      const { lookup_key, referral_code, customer_email, metadata } = body;

      if (!lookup_key) {
        return {
          status: 400,
          jsonBody: {
            error: 'lookup_key is required'
          }
        };
      }

      // Get price ID from mapping (fallback to API lookup)
      let priceId = PRICE_MAP[lookup_key];

      if (!priceId) {
        // Try to get the price using the lookup key from Stripe
        const prices = await stripe.prices.list({
          lookup_keys: [lookup_key],
          expand: ['data.product'],
        });

        if (!prices.data || prices.data.length === 0) {
          return {
            status: 404,
            jsonBody: {
              error: 'Price not found for the given lookup key'
            }
          };
        }

        priceId = prices.data[0].id;
      }

      const domain = process.env.DOMAIN || 'http://localhost:5173';

      // Create checkout session
      const sessionParams = {
        billing_address_collection: 'auto',
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${domain}/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${domain}/checkout-cancel`,
      };

      // Pre-fill customer email if provided
      if (customer_email) {
        sessionParams.customer_email = customer_email;
      }

      // Add metadata (user_id, referral_code, etc.)
      sessionParams.metadata = {};
      if (metadata && metadata.user_id) {
        sessionParams.metadata.user_id = metadata.user_id;
      }
      if (referral_code) {
        sessionParams.metadata.referral_code = referral_code;
      }

      const session = await stripe.checkout.sessions.create(sessionParams);

      return {
        status: 200,
        jsonBody: {
          url: session.url
        }
      };
    } catch (error) {
      context.error('Error creating checkout session:', error);
      return {
        status: 500,
        jsonBody: {
          error: 'Failed to create checkout session',
          message: error.message
        }
      };
    }
  }
});

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
