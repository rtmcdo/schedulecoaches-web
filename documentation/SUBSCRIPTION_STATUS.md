# Subscription Status Tracking System

**Last Updated**: 2025-10-21
**Schema Version**: v2 (role + subscriptionStatus pattern)

## Overview

ScheduleCoaches uses Stripe to manage subscriptions. Users must have an active paid subscription to use the pbcoach mobile app. The backend tracks subscription status separately from user role for proper separation of concerns.

**IMPORTANT**: This system aligns with the pbcoach schema using `role` + `subscriptionStatus` fields (NOT combined role values like `coach_unpaid`, `coach_paid`).

## User Role + Subscription Status

The system uses TWO separate fields:

### 1. `role` Field (What the user IS)

Aligns with pbcoach schema:

| Role | Description | Used By |
|------|-------------|---------|
| `coach` | Coach user providing services | schedulecoaches.com signups |
| `client` | User booking sessions | pbcoach app bookings |
| `admin` | System administrator | Manual assignment |

### 2. `subscriptionStatus` Field (Payment state)

Tracks subscription/payment state:

| Status | Description | Can Use App? |
|--------|-------------|--------------|
| `free` | Free/exempt account (demo, employee, partner) - no Stripe required | ✅ Yes |
| `unpaid` | Account created, no payment yet | ❌ No |
| `active` | Active subscription, payment current | ✅ Yes |
| `canceled` | Subscription cancelled | ❌ No |
| `past_due` | Payment failed, in grace period | ⚠️ Limited (read-only) |
| `trialing` | Free trial period (if enabled) | ✅ Yes |
| `incomplete` | Initial payment incomplete | ❌ No |
| `incomplete_expired` | Payment incomplete, expired | ❌ No |

### Access Control Logic

```typescript
// Determine if user can access pbcoach app
function canAccessApp(user: User): boolean {
  // Admins always have access
  if (user.role === 'admin') return true;

  // Coaches need active subscription or free access
  if (user.role === 'coach') {
    return user.subscriptionStatus === 'free' ||    // Demo/employee accounts
           user.subscriptionStatus === 'active' ||   // Paying customers
           user.subscriptionStatus === 'trialing' || // Free trial
           user.subscriptionStatus === 'past_due';   // Grace period (read-only)
  }

  // Clients don't need subscriptions (they book, not provide coaching)
  return user.role === 'client';
}
```

## Flow

### 1. Account Creation (Sign Up)

**Location:** `schedulecoaches.com/sign-up`

1. User clicks "Continue with Email/Google/Apple"
2. Entra ID creates authentication account
3. User redirected to `/auth/callback`
4. `/auth-me` endpoint called
5. Backend creates user with:
   - `role: 'coach'`
   - `subscriptionStatus: 'unpaid'`
6. Frontend redirects to Stripe checkout
7. After payment → Stripe webhook updates subscriptionStatus

### 2. Stripe Webhook Events

Backend listens for these Stripe webhook events and updates **ONLY subscriptionStatus** (NOT role):

#### `checkout.session.completed`
- User completed payment
- **Action:** Update `subscriptionStatus` to `'active'`
- **Action:** Store `stripeCustomerId` and `stripeSubscriptionId` in Users table
- **Note:** Role stays as `'coach'`

#### `customer.subscription.updated`
- Subscription status changed
- **Action:** Update `subscriptionStatus` to match Stripe status:
  - `active` → `subscriptionStatus = 'active'`
  - `past_due` → `subscriptionStatus = 'past_due'`
  - `canceled` / `unpaid` → `subscriptionStatus = 'canceled'`
  - `trialing` → `subscriptionStatus = 'trialing'`
  - `incomplete` → `subscriptionStatus = 'incomplete'`
  - `incomplete_expired` → `subscriptionStatus = 'incomplete_expired'`
- **Note:** Role stays as `'coach'`

#### `customer.subscription.deleted`
- Subscription ended
- **Action:** Update `subscriptionStatus` to `'canceled'`
- **Note:** Role stays as `'coach'`

#### `invoice.payment_succeeded`
- Payment successful (renewal)
- **Action:** Update `subscriptionStatus` to `'active'`
- **Note:** Role stays as `'coach'`

#### `invoice.payment_failed`
- Payment failed
- **Action:** Update `subscriptionStatus` to `'past_due'`
- **Note:** Role stays as `'coach'`
- **Note:** User gets grace period with limited access

### 3. App Access Control

**Location:** pbcoach mobile app login
**Status:** ⚠️ **CRITICAL REQUIREMENT - NOT YET IMPLEMENTED IN APP**

**IMPORTANT**: The pbcoach mobile app MUST implement subscription status checking on login. Without this check, users with `subscriptionStatus = 'unpaid'` or `'canceled'` will be able to access the app even though they haven't paid.

#### Required Implementation in pbcoach App

When user logs into pbcoach app:

1. **Call `/api/auth-me` after authentication**
   - This endpoint returns the user object with `role` and `subscriptionStatus` fields

2. **Check `subscriptionStatus` field and enforce access control**

   **Full Access (Allow login):**
   - `role === 'admin'` → Allow full access (admins always allowed)
   - `role === 'coach' && subscriptionStatus === 'free'` → Allow full access (demo/employee accounts)
   - `role === 'coach' && subscriptionStatus === 'active'` → Allow full access (paying customers)
   - `role === 'coach' && subscriptionStatus === 'trialing'` → Allow full access (free trial)
   - `role === 'client'` → Allow booking only (clients don't need subscriptions)

   **Limited Access (Read-only, show warning):**
   - `role === 'coach' && subscriptionStatus === 'past_due'` → Show warning banner, allow read-only mode

   **Block Access (Show upgrade message):**
   - `role === 'coach' && subscriptionStatus === 'unpaid'` → **BLOCK LOGIN**, show: "Complete your subscription at schedulecoaches.com"
   - `role === 'coach' && subscriptionStatus === 'canceled'` → **BLOCK LOGIN**, show: "Reactivate your subscription at schedulecoaches.com"
   - `role === 'coach' && subscriptionStatus === 'incomplete'` → **BLOCK LOGIN**, show: "Complete payment at schedulecoaches.com"
   - `role === 'coach' && subscriptionStatus === 'incomplete_expired'` → **BLOCK LOGIN**, show: "Subscribe at schedulecoaches.com"

3. **Store subscription status in app state**
   - Cache the status to check on every app launch
   - Refresh status periodically (e.g., daily or on app resume)

#### Example App Implementation

```typescript
// In app login flow (after Entra/Google/Apple auth)
async function completeLogin(authToken: string) {
  // Call backend to get user profile
  const response = await fetch('https://api.schedulecoaches.com/auth-me', {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });

  const { user } = await response.json();

  // Check subscription status
  if (user.role === 'coach') {
    const blockedStatuses = ['unpaid', 'canceled', 'incomplete', 'incomplete_expired'];

    if (blockedStatuses.includes(user.subscriptionStatus)) {
      // BLOCK ACCESS - Show upgrade screen
      showSubscriptionRequiredScreen(user.subscriptionStatus);
      return;
    }

    if (user.subscriptionStatus === 'past_due') {
      // Allow access but show warning
      showPaymentFailedWarning();
    }
  }

  // Allow login
  proceedToApp(user);
}

function showSubscriptionRequiredScreen(status: string) {
  // Show full-screen overlay blocking app access
  const messages = {
    'unpaid': 'Complete your subscription at schedulecoaches.com to get started',
    'canceled': 'Your subscription has been canceled. Reactivate at schedulecoaches.com',
    'incomplete': 'Complete your payment at schedulecoaches.com',
    'incomplete_expired': 'Subscribe at schedulecoaches.com to use the app'
  };

  showModal({
    title: 'Subscription Required',
    message: messages[status] || 'An active subscription is required',
    primaryButton: { text: 'Subscribe', action: () => openURL('https://schedulecoaches.com/sign-up') },
    secondaryButton: { text: 'Logout', action: logout }
  });
}
```

#### Why This Is Critical

1. **Revenue Protection**: Without this check, users can create accounts but never pay
2. **Subscription Enforcement**: Users who cancel can continue using the app
3. **Business Model**: The app is subscription-based - access must be tied to payment
4. **User Experience**: Clear messaging about why they can't access the app

## Database Schema

### Users Table Columns

```sql
-- Role field (what the user IS)
role NVARCHAR(50) NOT NULL, -- 'client' | 'coach' | 'admin'

-- Subscription fields (payment state)
stripeCustomerId NVARCHAR(255) NULL,
stripeSubscriptionId NVARCHAR(255) NULL,
subscriptionStatus NVARCHAR(50) NULL, -- 'free' | 'unpaid' | 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' | 'incomplete_expired'
subscriptionEndDate DATETIME2 NULL
```

### Filtered Unique Indexes

```sql
-- Prevent duplicate Stripe customer IDs
CREATE UNIQUE NONCLUSTERED INDEX IX_Users_StripeCustomerId
    ON Users(stripeCustomerId)
    WHERE stripeCustomerId IS NOT NULL;

-- Prevent duplicate Stripe subscription IDs
CREATE UNIQUE NONCLUSTERED INDEX IX_Users_StripeSubscriptionId
    ON Users(stripeSubscriptionId)
    WHERE stripeSubscriptionId IS NOT NULL;

-- Index for subscription status queries
CREATE NONCLUSTERED INDEX IX_Users_SubscriptionStatus
    ON Users(subscriptionStatus)
    WHERE subscriptionStatus IS NOT NULL;
```

## Backend Implementation

### API Endpoints

- [x] `GET /api/auth-me` - Returns user with role and subscriptionStatus
- [x] `POST /api/webhook` - Handles Stripe webhook events
- [x] `POST /api/create-checkout-session` - Creates Stripe checkout session
- [ ] `GET /api/subscription-status` - Check current subscription status (optional)
- [ ] `POST /api/cancel-subscription` - Allow user to cancel (optional, could use Stripe portal)

### Webhook Handler

Location: `api/src/functions/stripeWebhook.ts`

Key implementation notes:
- ✅ All event handlers update **ONLY subscriptionStatus**, NOT role
- ✅ Role field is managed separately (coach/client/admin)
- ✅ Parameterized SQL queries prevent SQL injection
- ✅ Comprehensive emoji-prefixed logging
- ✅ Graceful error handling for missing users
- ✅ Signature verification with STRIPE_WEBHOOK_SECRET

## Migration from Old Pattern

**Old Pattern** (v1 - DEPRECATED):
- Used combined role values: `coach_unpaid`, `coach_paid`, `coach_cancelled`, `coach_past_due`
- Role and subscription state were conflated

**New Pattern** (v2 - CURRENT):
- Separate `role` and `subscriptionStatus` fields
- `role` describes what the user IS (`coach`, `client`, `admin`)
- `subscriptionStatus` describes payment state (`unpaid`, `active`, `canceled`, etc.)

**Migration Path**:
1. ✅ Update types to use new pattern (`api/src/types/user.ts`)
2. ✅ Update authMe endpoint to create users with `role='coach'` + `subscriptionStatus='unpaid'`
3. ✅ Update webhook handlers to only update `subscriptionStatus`
4. ⏸️ Run database migration to add subscription columns (Phase 6)
5. ⏸️ Backfill existing users with proper `subscriptionStatus` values
6. ⏸️ Update pbcoach app to read new fields

See [PHASE_6_MIGRATION.md](./PHASE_6_MIGRATION.md) for detailed migration plan.

## Grace Period Logic

For `subscriptionStatus === 'past_due'`:
- Allow login to app
- Show prominent warning banner: "Payment failed. Please update your payment method."
- Allow read-only access (view clients, view calendar)
- Block creating new sessions
- After 7 days past due → Stripe will cancel subscription → `subscriptionStatus` becomes `'canceled'`

## Testing Webhooks Locally

1. Install Stripe CLI: `brew install stripe/stripe-brew/stripe`
2. Login: `stripe login`
3. Forward webhooks: `stripe listen --forward-to http://localhost:7073/api/webhook`
4. Get webhook secret from output and add to `.env`
5. Test events:
   ```bash
   stripe trigger checkout.session.completed
   stripe trigger customer.subscription.updated
   stripe trigger customer.subscription.deleted
   stripe trigger invoice.payment_failed
   stripe trigger invoice.payment_succeeded
   ```

## Related Files

- Backend Types: `/api/src/types/user.ts`
- Auth Endpoint: `/api/src/functions/authMe.ts`
- Webhook Handler: `/api/src/functions/stripeWebhook.ts`
- Migration Plan: `./PHASE_6_MIGRATION.md`
- API Implementation Plan: `./schedulecoaches-backend-api-implementation-plan.md`
