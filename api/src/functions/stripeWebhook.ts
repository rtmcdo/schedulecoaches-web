import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import Stripe from 'stripe';
import sql from 'mssql';
import { getConnection } from '../utils/database';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Stripe Webhook Handler
 *
 * Processes Stripe webhook events to update user subscription status in the database.
 *
 * Events handled:
 * - checkout.session.completed: User completed payment, upgrade to coach_paid
 * - customer.subscription.updated: Subscription status changed, update role accordingly
 * - customer.subscription.deleted: Subscription cancelled, downgrade to coach_cancelled
 * - invoice.payment_succeeded: Payment successful, ensure coach_paid
 * - invoice.payment_failed: Payment failed, downgrade to coach_past_due
 *
 * @route POST /api/webhook
 */
export async function stripeWebhook(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  let event: Stripe.Event;

  try {
    // Get the raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      context.warn('Webhook received without stripe-signature header');
      return {
        status: 400,
        body: 'Missing stripe-signature header'
      };
    }

    // Verify webhook signature
    if (webhookSecret) {
      try {
        event = stripe.webhooks.constructEvent(
          body,
          signature,
          webhookSecret
        );
        context.log(`✅ Webhook signature verified: ${event.type}`);
      } catch (err: any) {
        context.error('❌ Webhook signature verification failed:', err.message);
        return {
          status: 400,
          body: `Webhook Error: ${err.message}`
        };
      }
    } else {
      // If no webhook secret is configured, just parse the body (NOT RECOMMENDED for production)
      context.warn('⚠️ STRIPE_WEBHOOK_SECRET not configured - webhook signature not verified');
      event = JSON.parse(body);
    }

    // Get database connection
    const pool = await getConnection();

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        context.log(`📦 Processing checkout.session.completed: ${session.id}`);

        // Get user_id from metadata (set in createCheckoutSession)
        const userId = session.metadata?.user_id;
        const email = session.customer_email || session.metadata?.user_email;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!userId && !email) {
          context.error('❌ No user_id or email found in checkout session metadata');
          return {
            status: 400,
            body: 'Missing user_id or email in session metadata'
          };
        }

        // Validate userId is a GUID before using sql.UniqueIdentifier
        // If not a valid GUID, fallback to email lookup
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const isValidGuid = userId && uuidRegex.test(userId);

        if (!isValidGuid && userId) {
          context.warn(`⚠️ metadata.user_id is not a valid GUID (${userId}), falling back to email lookup`);
        }

        // Update user to coach_paid
        const request = pool.request()
          .input('email', sql.NVarChar, email)
          .input('customerId', sql.NVarChar, customerId)
          .input('subscriptionId', sql.NVarChar, subscriptionId);

        // Only add userId parameter if it's a valid GUID
        if (isValidGuid) {
          request.input('userId', sql.UniqueIdentifier, userId);
        }

        const result = await request.query(`
            UPDATE Users
            SET role = 'coach_paid',
                stripeCustomerId = @customerId,
                stripeSubscriptionId = @subscriptionId,
                subscriptionStatus = 'active'
            WHERE ${isValidGuid ? 'id = @userId OR' : ''} LOWER(email) = LOWER(@email)
          `);

        if (result.rowsAffected[0] === 0) {
          context.error(`❌ User not found for checkout session: userId=${userId}, email=${email}`);
          return {
            status: 404,
            body: 'User not found'
          };
        }

        context.log(`✅ Subscription activated for user: ${userId || email} (customer: ${customerId}, subscription: ${subscriptionId})`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        context.log(`🔄 Processing customer.subscription.updated: ${subscription.id} (status: ${subscription.status})`);

        // Determine role based on subscription status
        let role = 'coach_unpaid';
        switch (subscription.status) {
          case 'active':
            role = 'coach_paid';
            break;
          case 'past_due':
            role = 'coach_past_due';
            break;
          case 'canceled':
          case 'unpaid':
            role = 'coach_cancelled';
            break;
          case 'incomplete':
          case 'incomplete_expired':
          case 'trialing':
            // Keep as coach_unpaid for incomplete/trial states
            role = 'coach_unpaid';
            break;
        }

        const endDate = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null;

        const result = await pool.request()
          .input('subscriptionId', sql.NVarChar, subscription.id)
          .input('role', sql.NVarChar, role)
          .input('status', sql.NVarChar, subscription.status)
          .input('endDate', sql.DateTime2, endDate)
          .query(`
            UPDATE Users
            SET role = @role,
                subscriptionStatus = @status,
                subscriptionEndDate = @endDate
            WHERE stripeSubscriptionId = @subscriptionId
          `);

        if (result.rowsAffected[0] === 0) {
          context.warn(`⚠️ No user found with subscription ID: ${subscription.id}`);
        } else {
          context.log(`✅ Subscription updated: ${subscription.id} → role: ${role}, status: ${subscription.status}, endDate: ${endDate?.toISOString()}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        context.log(`🗑️ Processing customer.subscription.deleted: ${subscription.id}`);

        const result = await pool.request()
          .input('subscriptionId', sql.NVarChar, subscription.id)
          .query(`
            UPDATE Users
            SET role = 'coach_cancelled',
                subscriptionStatus = 'canceled'
            WHERE stripeSubscriptionId = @subscriptionId
          `);

        if (result.rowsAffected[0] === 0) {
          context.warn(`⚠️ No user found with subscription ID: ${subscription.id}`);
        } else {
          context.log(`✅ Subscription cancelled: ${subscription.id} → role: coach_cancelled`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        context.log(`💰 Processing invoice.payment_succeeded: ${invoice.id} (subscription: ${subscriptionId})`);

        if (!subscriptionId) {
          context.warn('⚠️ Invoice has no subscription ID, skipping');
          break;
        }

        const result = await pool.request()
          .input('subscriptionId', sql.NVarChar, subscriptionId)
          .query(`
            UPDATE Users
            SET role = 'coach_paid',
                subscriptionStatus = 'active'
            WHERE stripeSubscriptionId = @subscriptionId
          `);

        if (result.rowsAffected[0] === 0) {
          context.warn(`⚠️ No user found with subscription ID: ${subscriptionId}`);
        } else {
          context.log(`✅ Payment succeeded for subscription: ${subscriptionId} → role: coach_paid`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        context.log(`⚠️ Processing invoice.payment_failed: ${invoice.id} (subscription: ${subscriptionId})`);

        if (!subscriptionId) {
          context.warn('⚠️ Invoice has no subscription ID, skipping');
          break;
        }

        const result = await pool.request()
          .input('subscriptionId', sql.NVarChar, subscriptionId)
          .query(`
            UPDATE Users
            SET role = 'coach_past_due',
                subscriptionStatus = 'past_due'
            WHERE stripeSubscriptionId = @subscriptionId
          `);

        if (result.rowsAffected[0] === 0) {
          context.warn(`⚠️ No user found with subscription ID: ${subscriptionId}`);
        } else {
          context.log(`⚠️ Payment failed for subscription: ${subscriptionId} → role: coach_past_due`);
        }
        break;
      }

      default:
        context.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    return {
      status: 200,
      body: JSON.stringify({ received: true })
    };

  } catch (error: any) {
    context.error('❌ Error processing webhook:', error);
    return {
      status: 500,
      body: `Webhook Error: ${error.message}`
    };
  }
}

// Register the function
app.http('webhook', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'webhook',
  handler: stripeWebhook
});
