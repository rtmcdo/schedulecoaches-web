# Stripe Test Environment Configuration

## Quick Reference for Current Stripe Test Setup

**Last Updated:** 2025-10-26

---

## Azure Resources

### Static Web App (Frontend)
- **Name:** `ashy-bay-083e00b10`
- **URL:** https://schedulecoaches.com (production domain)
- **Region:** Central US
- **Plan:** Free

### Function App (Backend API)
- **Name:** `schedulecoaches-api`
- **URL:** https://schedulecoaches-api-cge6gsaye2g4aeg3.centralus-01.azurewebsites.net
- **Region:** Central US
- **Plan:** Flex Consumption
- **Runtime:** Node.js 20

### Database
- **Server:** pbcoach-sql.database.windows.net
- **Database:** pbcoach-db
- **User:** pbcoachadmin
- **Note:** Shared with pbcoach mobile app

---

## Stripe Configuration (Test Mode)

### Account
- **Account ID:** `acct_1SEDYLD6mhSpxzrE`
- **Name:** JRM Software, LLC sandbox

### Keys
```bash
# Publishable Key (Frontend)
pk_test_51SEDYLD6mhSpxzrE... (see Stripe Dashboard or Azure secrets)

# Secret Key (Backend)
sk_test_51SEDYLD6mhSpxzrE... (NEVER commit - stored in Azure Function App settings)
```

### Product & Pricing
- **Product ID:** `prod_TAevVQFQMCOUQL`
- **Product Name:** Pickleball Coach
- **Price ID:** `price_1SEJc7D6mhSpxzrEel4fENpF`
- **Lookup Key:** `pickleball_monthly`
- **Amount:** $20.00/month (test mode)

### Webhook
- **Endpoint URL:** https://schedulecoaches-api-cge6gsaye2g4aeg3.centralus-01.azurewebsites.net/api/webhook
- **Signing Secret:** `whsec_gDwDVWga9PSa5Wx275wLUhUGn1lB4yyf`
- **Events:**
  - ✅ checkout.session.completed
  - ✅ customer.subscription.updated
  - ✅ customer.subscription.deleted
  - ✅ invoice.payment_succeeded
  - ✅ invoice.payment_failed

---

## Environment Variables

### Frontend (.env.production)
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51SEDYLD6mhSpxzrE... (see Azure Static Web App settings)
VITE_API_BASE_URL=https://schedulecoaches-api-cge6gsaye2g4aeg3.centralus-01.azurewebsites.net
VITE_GOOGLE_WEB_CLIENT_ID=461286793692-b6ctal9mckokqpa2i3nj3r26v3osm4ta.apps.googleusercontent.com
VITE_ENTRA_TENANT_ID=da976fe1-dd40-4c9d-a828-acfa45634f85
VITE_ENTRA_TENANT_SUBDOMAIN=pickleballcoach
VITE_ENTRA_CLIENT_ID=e6c5b70f-e2d7-472d-a363-230a252ccbd5
```

### Backend (Azure Function App Settings)
```bash
GOOGLE_CLIENT_ID=461286793692-b6ctal9mckokqpa2i3nj3r26v3osm4ta.apps.googleusercontent.com
SQL_CONNECTION_STRING=Server=pbcoach-sql.database.windows.net;Database=pbcoach-db;User Id=pbcoachadmin;Password=[REDACTED];Encrypt=true
STRIPE_SECRET_KEY=sk_test_51SEDYLD6mhSpxzrE... (see Azure Function App settings)
STRIPE_WEBHOOK_SECRET=whsec_... (see Stripe Dashboard or Azure Function App settings)
STRIPE_PRICE_ID=price_1SEJc7D6mhSpxzrEel4fENpF
DOMAIN=https://schedulecoaches.com
```

---

## Google OAuth Configuration

### Web Application Client
- **Client ID:** 461286793692-b6ctal9mckokqpa2i3nj3r26v3osm4ta.apps.googleusercontent.com
- **Authorized JavaScript origins:**
  - https://schedulecoaches.com
  - http://localhost:5173 (for local dev)
- **Authorized redirect URIs:**
  - https://schedulecoaches.com/auth/callback
  - http://localhost:5173/auth/callback (for local dev)

**Note:** This is shared with the pbcoach mobile app.

---

## Test User Account

### Test Account (pickleballcoach72@gmail.com)
- **Email:** pickleballcoach72@gmail.com
- **Provider:** Google
- **User ID (Database):** c214a030-de25-4f82-8a42-096e240c210f
- **Role:** coach
- **Subscription Status:** Should be 'active' after successful payment test
- **Google Account ID:** (stored in googleAccountId column)

### Database Verification Query
```sql
SELECT
    id,
    email,
    role,
    subscriptionStatus,
    stripeCustomerId,
    stripeSubscriptionId,
    googleAccountId,
    createdAt,
    isActive
FROM Users
WHERE email = 'pickleballcoach72@gmail.com';
```

---

## API Endpoints

### Base URL
```
https://schedulecoaches-api-cge6gsaye2g4aeg3.centralus-01.azurewebsites.net
```

### Endpoints

#### 1. GET /api/auth-me
**Purpose:** Create or retrieve user account, link accounts by email

**Headers:**
```
Authorization: Bearer <google_id_token>
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "coach",
    "hasCoachProfile": false,
    "needsProfileCompletion": true
  },
  "needsProfileCompletion": true,
  "hasActiveSubscription": false
}
```

#### 2. POST /api/create-checkout-session
**Purpose:** Create Stripe checkout session for subscription payment

**Headers:**
```
Authorization: Bearer <google_id_token>
Content-Type: application/json
```

**Body:**
```json
{
  "lookup_key": "pickleball_monthly"
}
```

**Response (200):**
```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

#### 3. POST /api/webhook
**Purpose:** Receive Stripe webhook events

**Headers:**
```
stripe-signature: <webhook_signature>
Content-Type: application/json
```

**Events Handled:**
- checkout.session.completed → Upgrade to coach_paid
- customer.subscription.updated → Update subscription status
- customer.subscription.deleted → Downgrade to coach_cancelled
- invoice.payment_succeeded → Ensure coach_paid
- invoice.payment_failed → Downgrade to coach_past_due

#### 4. GET /api/subscription-status
**Purpose:** Check subscription status without creating user

**Headers:**
```
Authorization: Bearer <google_id_token>
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "coach",
    "subscriptionStatus": "active"
  },
  "hasActiveSubscription": true,
  "needsPayment": false,
  "isInGracePeriod": false
}
```

---

## Testing Commands

### Stripe CLI Commands

```bash
# Login to Stripe CLI
stripe login

# List recent events
stripe events list --limit 10

# List checkout sessions
stripe checkout sessions list --limit 5

# List subscriptions
stripe subscriptions list --limit 5

# Retrieve specific checkout session
stripe checkout sessions retrieve cs_test_...

# Trigger test webhook
stripe trigger checkout.session.completed

# Listen to webhooks (for local testing)
stripe listen --forward-to http://localhost:7073/api/webhook
```

### Azure CLI Commands

```bash
# Restart Function App
az functionapp restart \
  --name schedulecoaches-api \
  --resource-group prd-schedulecoachesweb

# List Function App settings
az functionapp config appsettings list \
  --name schedulecoaches-api \
  --resource-group prd-schedulecoachesweb

# Update setting
az functionapp config appsettings set \
  --name schedulecoaches-api \
  --resource-group prd-schedulecoachesweb \
  --settings KEY="value"

# View logs
az functionapp logs tail \
  --name schedulecoaches-api \
  --resource-group prd-schedulecoachesweb
```

### Database Queries

```sql
-- Check user exists
SELECT * FROM Users WHERE email = 'test@example.com';

-- Check subscription status
SELECT
    email,
    role,
    subscriptionStatus,
    stripeCustomerId,
    stripeSubscriptionId
FROM Users
WHERE email = 'test@example.com';

-- Count users by subscription status
SELECT
    subscriptionStatus,
    COUNT(*) as count
FROM Users
WHERE role = 'coach'
GROUP BY subscriptionStatus;

-- Find recent signups
SELECT
    email,
    role,
    subscriptionStatus,
    createdAt
FROM Users
WHERE createdAt > DATEADD(day, -7, GETUTCDATE())
ORDER BY createdAt DESC;
```

---

## Common Test Scenarios

### Scenario 1: New User Signup with Google + Payment

1. Visit https://schedulecoaches.com
2. Click "Continue with Google"
3. Authenticate with Google account
4. **Expected:** Redirected to Stripe checkout
5. Complete payment with test card: `4242 4242 4242 4242`
6. **Expected:** Redirected to success page
7. **Expected:** Database updated with subscriptionStatus='active'

### Scenario 2: Existing User Login

1. Visit https://schedulecoaches.com/login
2. Click "Continue with Google"
3. Authenticate with existing account
4. **Expected:** Redirected to account page (if subscription active)
5. **Expected:** Redirected to payment (if subscription inactive)

### Scenario 3: Webhook Processing

1. Complete payment in Stripe
2. Check Stripe Dashboard → Webhooks → Recent deliveries
3. **Expected:** HTTP 200 response from webhook endpoint
4. **Expected:** Database updated within 5 seconds
5. Check Function App logs for webhook processing logs

---

## Troubleshooting

### Issue: Google Sign-In fails
**Check:**
- GOOGLE_CLIENT_ID matches in both frontend and backend
- Domain is authorized in Google Cloud Console
- Browser console for specific error messages

### Issue: Stripe checkout fails to create
**Check:**
- STRIPE_SECRET_KEY is correct
- STRIPE_PRICE_ID exists and is active
- User exists in database (auth-me was called first)
- Function App logs for error messages

### Issue: Webhook not updating database
**Check:**
- Stripe webhook logs - was it delivered?
- STRIPE_WEBHOOK_SECRET matches webhook in Stripe Dashboard
- Function App logs - did webhook process?
- Database - check if stripeCustomerId was set

### Issue: CORS errors
**Check:**
- Function App CORS settings include schedulecoaches.com
- CSP headers in staticwebapp.config.json include Function App domain
- Function App was restarted after CORS configuration

---

## Links and Resources

### Dashboards
- **Azure Portal:** https://portal.azure.com
- **Stripe Dashboard (Test):** https://dashboard.stripe.com/test
- **Google Cloud Console:** https://console.cloud.google.com

### Documentation
- **Production Deployment Guide:** `documentation/PRODUCTION_DEPLOYMENT.md`
- **Subscription Status Documentation:** `documentation/SUBSCRIPTION_STATUS.md`
- **Implementation Plan:** `documentation/schedulecoaches-backend-api-implementation-plan.md`

### GitHub
- **Repository:** https://github.com/[your-org]/schedulecoaches-web
- **Actions:** https://github.com/[your-org]/schedulecoaches-web/actions

---

**Document Version:** 1.0
**Last Updated:** 2025-10-26
**Maintained By:** ScheduleCoaches Team
