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
 * - checkout.session.completed: User completed payment/trial signup, set to trialing or active
 * - customer.subscription.updated: Subscription status changed, update status accordingly
 * - customer.subscription.deleted: Subscription cancelled, set to canceled
 * - customer.subscription.trial_will_end: Trial ending in 3 days (for email reminders)
 * - invoice.payment_succeeded: Payment successful, ensure active status
 * - invoice.payment_failed: Payment failed, set to past_due
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

        // Fetch the subscription to check for trial
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        // Determine if user is trialing or active
        const isTrialing = subscription.status === 'trialing';
        const subscriptionStatus = isTrialing ? 'trialing' : 'active';
        const trialEndDate = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;

        // Update user subscription status
        const request = pool.request()
          .input('email', sql.NVarChar, email)
          .input('customerId', sql.NVarChar, customerId)
          .input('subscriptionId', sql.NVarChar, subscriptionId)
          .input('subscriptionStatus', sql.NVarChar, subscriptionStatus)
          .input('trialEndDate', sql.DateTime2, trialEndDate);

        // Only add userId parameter if it's a valid GUID
        if (isValidGuid) {
          request.input('userId', sql.UniqueIdentifier, userId);
        }

        const result = await request.query(`
            UPDATE Users
            SET stripeCustomerId = @customerId,
                stripeSubscriptionId = @subscriptionId,
                subscriptionStatus = @subscriptionStatus,
                subscriptionEndDate = @trialEndDate
            WHERE ${isValidGuid ? 'id = @userId OR' : ''} LOWER(email) = LOWER(@email)
          `);

        if (result.rowsAffected[0] === 0) {
          context.error(`❌ User not found for checkout session: userId=${userId}, email=${email}`);
          return {
            status: 404,
            body: 'User not found'
          };
        }

        if (isTrialing) {
          context.log(`✅ Trial started for user: ${userId || email} (ends: ${trialEndDate?.toISOString()})`);
        } else {
          context.log(`✅ Subscription activated for user: ${userId || email} (customer: ${customerId}, subscription: ${subscriptionId})`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        context.log(`🔄 Processing customer.subscription.updated: ${subscription.id} (status: ${subscription.status})`);

        // Map Stripe subscription status to our subscriptionStatus values
        let subscriptionStatus: string = subscription.status;

        // Normalize Stripe status values to our schema
        if (subscription.status === 'canceled') {
          subscriptionStatus = 'canceled';
        } else if (subscription.status === 'unpaid') {
          subscriptionStatus = 'canceled'; // Treat unpaid as canceled
        }

        const endDate = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null;

        const result = await pool.request()
          .input('subscriptionId', sql.NVarChar, subscription.id)
          .input('status', sql.NVarChar, subscriptionStatus)
          .input('endDate', sql.DateTime2, endDate)
          .query(`
            UPDATE Users
            SET subscriptionStatus = @status,
                subscriptionEndDate = @endDate
            WHERE stripeSubscriptionId = @subscriptionId
          `);

        if (result.rowsAffected[0] === 0) {
          context.warn(`⚠️ No user found with subscription ID: ${subscription.id}`);
        } else {
          context.log(`✅ Subscription updated: ${subscription.id} → status: ${subscriptionStatus}, endDate: ${endDate?.toISOString()}`);
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
            SET subscriptionStatus = 'canceled'
            WHERE stripeSubscriptionId = @subscriptionId
          `);

        if (result.rowsAffected[0] === 0) {
          context.warn(`⚠️ No user found with subscription ID: ${subscription.id}`);
        } else {
          context.log(`✅ Subscription cancelled: ${subscription.id} → status: canceled`);
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
            SET subscriptionStatus = 'active'
            WHERE stripeSubscriptionId = @subscriptionId
          `);

        if (result.rowsAffected[0] === 0) {
          context.warn(`⚠️ No user found with subscription ID: ${subscriptionId}`);
        } else {
          context.log(`✅ Payment succeeded for subscription: ${subscriptionId} → status: active`);
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
            SET subscriptionStatus = 'past_due'
            WHERE stripeSubscriptionId = @subscriptionId
          `);

        if (result.rowsAffected[0] === 0) {
          context.warn(`⚠️ No user found with subscription ID: ${subscriptionId}`);
        } else {
          context.log(`⚠️ Payment failed for subscription: ${subscriptionId} → status: past_due`);
        }
        break;
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription;
        context.log(`⏰ Processing customer.subscription.trial_will_end: ${subscription.id}`);

        // This event fires 3 days before trial ends
        // TODO: Send email reminder to user that trial is ending
        // For now, just log it
        const trialEndDate = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;
        context.log(`ℹ️ Trial ending soon for subscription ${subscription.id} (ends: ${trialEndDate?.toISOString()})`);

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
