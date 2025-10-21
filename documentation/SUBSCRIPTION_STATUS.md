# Subscription Status Tracking System

## Overview

ScheduleCoaches uses Stripe to manage subscriptions. Users must have an active paid subscription to use the pbcoach mobile app. The backend needs to track subscription status and enforce access control.

## User Role States

The system uses the `role` field in the Users table with these values:

| Role | Description | Can Use App? |
|------|-------------|--------------|
| `coach_unpaid` | Account created, no payment yet | ❌ No |
| `coach_paid` | Active subscription, payment current | ✅ Yes |
| `coach_cancelled` | Subscription cancelled | ❌ No |
| `coach_past_due` | Payment failed, in grace period | ⚠️ Limited (read-only) |
| `client` | Non-paying user (shouldn't happen in schedulecoaches) | ❌ No |
| `admin` | System administrator | ✅ Yes (always) |

## Flow

### 1. Account Creation (Sign Up)

**Location:** `schedulecoaches.com/sign-up`

1. User clicks "Continue with Email/Google/Apple"
2. Entra ID creates authentication account
3. User redirected to `/auth/callback`
4. `/auth-me` endpoint called
5. Backend creates user with `role: 'coach_unpaid'`
6. Frontend redirects to Stripe checkout
7. After payment → Stripe webhook updates role

### 2. Stripe Webhook Events

Backend must listen for these Stripe webhook events:

#### `checkout.session.completed`
- User completed payment
- **Action:** Update `role` to `'coach_paid'`
- **Action:** Store `stripeCustomerId` and `stripeSubscriptionId` in Users table

#### `customer.subscription.updated`
- Subscription status changed
- **Check status:**
  - `active` → Update `role` to `'coach_paid'`
  - `past_due` → Update `role` to `'coach_past_due'`
  - `canceled` / `unpaid` → Update `role` to `'coach_cancelled'`

#### `customer.subscription.deleted`
- Subscription ended
- **Action:** Update `role` to `'coach_cancelled'`

#### `invoice.payment_succeeded`
- Payment successful (renewal)
- **Action:** Ensure `role` is `'coach_paid'`

#### `invoice.payment_failed`
- Payment failed
- **Action:** Update `role` to `'coach_past_due'`

### 3. App Access Control

**Location:** pbcoach mobile app login

When user logs into pbcoach app:
1. App calls `/auth-me` after authentication
2. Backend returns user with `role` field
3. App checks role:
   - `coach_paid` → Allow full access
   - `coach_unpaid` → Show "Complete your subscription at schedulecoaches.com"
   - `coach_cancelled` → Show "Reactivate your subscription at schedulecoaches.com"
   - `coach_past_due` → Show warning banner, allow read-only access
   - `admin` → Allow full access

## Database Schema Changes

### Users Table

Add/modify these columns:

```sql
ALTER TABLE Users ADD stripeCustomerId NVARCHAR(255) NULL;
ALTER TABLE Users ADD stripeSubscriptionId NVARCHAR(255) NULL;
ALTER TABLE Users ADD subscriptionStatus NVARCHAR(50) NULL; -- 'active', 'past_due', 'canceled', etc.
ALTER TABLE Users ADD subscriptionEndDate DATETIME2 NULL;
```

### Notes:
- `role` field determines access (coach_paid, coach_unpaid, etc.)
- `subscriptionStatus` mirrors Stripe's subscription status for debugging
- `subscriptionEndDate` helps with grace period logic

## Backend Implementation Checklist

### API Endpoints

- [x] `GET /api/auth-me` - Returns user with role (already exists)
- [ ] `POST /api/stripe-webhook` - Handle Stripe webhook events
- [ ] `GET /api/subscription-status` - Check current subscription status (optional)
- [ ] `POST /api/cancel-subscription` - Allow user to cancel (optional, could use Stripe portal)

### Stripe Webhook Handler

Create `/api/stripe-webhook` endpoint:

```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import Stripe from 'stripe';
import sql from 'mssql';
import { getConnection } from '../utils/database';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function stripeWebhook(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const sig = request.headers.get('stripe-signature');
  const body = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    return { status: 400, body: `Webhook Error: ${err.message}` };
  }

  const pool = await getConnection();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;

      // Find user by email from checkout session
      const email = session.customer_email;

      await pool.request()
        .input('email', sql.NVarChar, email)
        .input('customerId', sql.NVarChar, session.customer)
        .input('subscriptionId', sql.NVarChar, session.subscription)
        .query(`
          UPDATE Users
          SET role = 'coach_paid',
              stripeCustomerId = @customerId,
              stripeSubscriptionId = @subscriptionId,
              subscriptionStatus = 'active'
          WHERE LOWER(email) = LOWER(@email)
        `);

      context.log('✅ Subscription activated for:', email);
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;

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
      }

      await pool.request()
        .input('subscriptionId', sql.NVarChar, subscription.id)
        .input('role', sql.NVarChar, role)
        .input('status', sql.NVarChar, subscription.status)
        .input('endDate', sql.DateTime2, subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null)
        .query(`
          UPDATE Users
          SET role = @role,
              subscriptionStatus = @status,
              subscriptionEndDate = @endDate
          WHERE stripeSubscriptionId = @subscriptionId
        `);

      context.log('✅ Subscription updated:', subscription.id, 'Status:', subscription.status);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;

      await pool.request()
        .input('subscriptionId', sql.NVarChar, subscription.id)
        .query(`
          UPDATE Users
          SET role = 'coach_cancelled',
              subscriptionStatus = 'canceled'
          WHERE stripeSubscriptionId = @subscriptionId
        `);

      context.log('✅ Subscription cancelled:', subscription.id);
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;

      await pool.request()
        .input('subscriptionId', sql.NVarChar, invoice.subscription)
        .query(`
          UPDATE Users
          SET role = 'coach_paid',
              subscriptionStatus = 'active'
          WHERE stripeSubscriptionId = @subscriptionId
        `);

      context.log('✅ Payment succeeded for subscription:', invoice.subscription);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;

      await pool.request()
        .input('subscriptionId', sql.NVarChar, invoice.subscription)
        .query(`
          UPDATE Users
          SET role = 'coach_past_due',
              subscriptionStatus = 'past_due'
          WHERE stripeSubscriptionId = @subscriptionId
        `);

      context.log('⚠️ Payment failed for subscription:', invoice.subscription);
      break;
    }
  }

  return { status: 200, body: JSON.stringify({ received: true }) };
}
```

### Testing Webhooks Locally

1. Install Stripe CLI: `brew install stripe/stripe-brew/stripe`
2. Login: `stripe login`
3. Forward webhooks: `stripe listen --forward-to http://localhost:7071/api/stripe-webhook`
4. Get webhook secret from output and add to `.env`
5. Test events: `stripe trigger checkout.session.completed`

## Frontend Success Page

After Stripe checkout completes, redirect to `/success` page:

### Success Page Features

- ✅ "Payment Successful!" message
- ✅ "Your subscription is now active"
- ✅ App download buttons (App Store + Google Play)
- ✅ "Login to the app with your credentials" instructions
- ✅ Support email link
- ✅ Link to manage subscription (Stripe portal)

## Subscription Management

Users can manage their subscription (update payment method, cancel, etc.) via:

1. **Stripe Customer Portal** (recommended)
   - Create portal session via API
   - Redirect user to Stripe-hosted portal
   - Stripe handles all subscription management

2. **Custom Pages** (more work)
   - Build UI in schedulecoaches.com
   - Call Stripe API to update subscription
   - More control, but more maintenance

**Recommendation:** Use Stripe Customer Portal for simplicity.

## Grace Period Logic

For `coach_past_due` role:
- Allow login to app
- Show prominent warning banner: "Payment failed. Please update your payment method."
- Allow read-only access (view clients, view calendar)
- Block creating new sessions
- After 7 days past due → Stripe will cancel subscription → role becomes `coach_cancelled`

## Questions to Resolve

1. **Grace period duration?** Default is 7 days, but can be customized in Stripe
2. **Free trial?** Do we want to offer a free trial period?
3. **Multiple plans?** Just $20/month, or will there be other pricing tiers?
4. **Annual billing?** Discount for annual subscriptions?

## Related Files

- Backend: `/api/stripe-webhook` (needs to be created)
- Backend: `/api/auth-me` (needs role check logic)
- Frontend: `/src/views/Success.vue` (needs to be created)
- Database: Users table schema update
