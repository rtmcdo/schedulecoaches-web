# Stripe Integration - Production Deployment Guide

## Overview

This guide covers deploying the schedulecoaches.com website and API to production with Stripe subscription payments. The system consists of:

- **Frontend:** Vue.js SPA hosted on Azure Static Web Apps
- **Backend:** Azure Functions (Flex Consumption) for API endpoints
- **Database:** Azure SQL (shared with pbcoach app)
- **Authentication:** Google Sign-In (direct integration, not via Entra)
- **Payment:** Stripe subscriptions with webhooks

---

## 1. Azure Infrastructure Setup

### 1.1 Azure Static Web App (Frontend)

**Resource:** `schedulecoaches-web` (or similar name for production)
**Region:** Central US (or your preferred region)

```bash
# Create Static Web App
az staticwebapp create \
  --name schedulecoaches-web-prod \
  --resource-group prd-schedulecoachesweb \
  --location centralus \
  --sku Free
```

**Configuration:**
- Enable custom domain: `schedulecoaches.com`
- Configure SSL certificate (auto via Azure)
- No API - API deployed separately to Function App

### 1.2 Azure Function App (Backend API)

**Resource:** `schedulecoaches-api-prod`
**Plan:** Flex Consumption
**Region:** Central US (same as Static Web App for lower latency)

```bash
# Create Function App (Flex Consumption)
az functionapp create \
  --name schedulecoaches-api-prod \
  --resource-group prd-schedulecoachesweb \
  --runtime node \
  --runtime-version 20 \
  --functions-version 4 \
  --storage-account <storage-account-name> \
  --flexconsumption-location centralus
```

**Important Notes:**
- Flex Consumption is the newer plan (replacing classic Consumption)
- Supports Always Ready instances for better cold start performance
- Uses Azure Files for deployment storage

### 1.3 CORS Configuration

**Function App CORS:**
```bash
az functionapp cors add \
  --name schedulecoaches-api-prod \
  --resource-group prd-schedulecoachesweb \
  --allowed-origins "https://schedulecoaches.com"
```

**Static Web App CSP Headers:**
See `staticwebapp.config.json`:
```json
{
  "globalHeaders": {
    "content-security-policy": "default-src 'self' https://*.google.com https://*.googleapis.com https://appleid.cdn-apple.com https://accounts.google.com https://js.stripe.com https://checkout.stripe.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.google.com https://*.googleapis.com https://appleid.cdn-apple.com https://accounts.google.com https://js.stripe.com; style-src 'self' 'unsafe-inline' https://accounts.google.com; img-src 'self' data: https:; font-src 'self' data: https:; frame-src https://checkout.stripe.com https://js.stripe.com https://accounts.google.com https://appleid.apple.com; connect-src 'self' https://*.google.com https://*.googleapis.com https://appleid.apple.com https://api.stripe.com https://schedulecoaches-api-prod-<unique-id>.azurewebsites.net;"
  }
}
```

---

## 2. Environment Variables

### 2.1 Frontend (.env.production)

**File:** `.env.production`

```bash
# Stripe Configuration (PRODUCTION KEYS)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_<your_production_key>

# API Configuration
VITE_API_BASE_URL=https://schedulecoaches-api-prod-<unique-id>.azurewebsites.net

# Microsoft Entra External ID Configuration (Production)
# Note: Not actively used for auth, but may be referenced
VITE_ENTRA_TENANT_ID=da976fe1-dd40-4c9d-a828-acfa45634f85
VITE_ENTRA_TENANT_SUBDOMAIN=pickleballcoach
VITE_ENTRA_CLIENT_ID=e6c5b70f-e2d7-472d-a363-230a252ccbd5

# Google Sign-In Configuration (shared with pbcoach app)
VITE_GOOGLE_WEB_CLIENT_ID=461286793692-b6ctal9mckokqpa2i3nj3r26v3osm4ta.apps.googleusercontent.com

# Apple Sign-In Configuration (if implemented)
VITE_APPLE_CLIENT_ID=your_apple_service_id_here
VITE_APPLE_REDIRECT_URI=https://schedulecoaches.com/auth/callback
```

**GitHub Secrets (for CI/CD):**
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe production publishable key
- `VITE_API_BASE_URL` - Function App URL

### 2.2 Backend (Azure Function App Settings)

```bash
# Set all environment variables
az functionapp config appsettings set \
  --name schedulecoaches-api-prod \
  --resource-group prd-schedulecoachesweb \
  --settings \
    GOOGLE_CLIENT_ID="461286793692-b6ctal9mckokqpa2i3nj3r26v3osm4ta.apps.googleusercontent.com" \
    SQL_CONNECTION_STRING="Server=pbcoach-sql.database.windows.net;Database=pbcoach-db;User Id=pbcoachadmin;Password=<password>;Encrypt=true" \
    STRIPE_SECRET_KEY="sk_live_<your_production_key>" \
    STRIPE_WEBHOOK_SECRET="whsec_<your_webhook_secret>" \
    STRIPE_PRICE_ID="price_<your_production_price_id>" \
    DOMAIN="https://schedulecoaches.com"
```

**Required Settings:**

| Setting | Description | Example |
|---------|-------------|---------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (shared with pbcoach app) | `461286793692-...` |
| `SQL_CONNECTION_STRING` | Azure SQL connection string (shared database) | `Server=pbcoach-sql...` |
| `STRIPE_SECRET_KEY` | Stripe production secret key | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_...` |
| `STRIPE_PRICE_ID` | Default price ID for subscription | `price_...` |
| `DOMAIN` | Production domain for Stripe redirects | `https://schedulecoaches.com` |

---

## 3. Stripe Configuration

### 3.1 Create Production Product

```bash
# Switch to production mode in Stripe Dashboard
# Or use Stripe CLI with live keys

stripe products create \
  --name "Pickleball Coach" \
  --description "Monthly subscription for Pickleball Coach app" \
  --live
```

### 3.2 Create Production Price

```bash
# Create monthly subscription price
stripe prices create \
  --product <product_id> \
  --unit-amount 2000 \
  --currency usd \
  --recurring interval=month \
  --lookup-key pickleball_monthly \
  --live
```

**Important:** The `lookup_key` must be `pickleball_monthly` to match the frontend code.

### 3.3 Configure Webhook Endpoint

**Webhook URL:** `https://schedulecoaches-api-prod-<unique-id>.azurewebsites.net/api/webhook`

**Events to Listen:**
- ✅ `checkout.session.completed` - Payment completed, upgrade user to coach_paid
- ✅ `customer.subscription.updated` - Subscription changed (active/past_due/canceled)
- ✅ `customer.subscription.deleted` - Subscription cancelled
- ✅ `invoice.payment_succeeded` - Renewal payment succeeded
- ✅ `invoice.payment_failed` - Payment failed, downgrade to coach_past_due

**Steps:**
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Enter webhook URL
4. Select events listed above
5. Click "Add endpoint"
6. Click "Reveal" to get signing secret
7. Copy signing secret and add to Function App settings as `STRIPE_WEBHOOK_SECRET`

### 3.4 Test Webhook

```bash
# Use Stripe CLI to test webhook locally first
stripe listen --forward-to https://schedulecoaches-api-prod-<unique-id>.azurewebsites.net/api/webhook

# Trigger test event
stripe trigger checkout.session.completed
```

---

## 4. Database Schema

The schedulecoaches.com website uses the **same database** as the pbcoach mobile app (`pbcoach-db`).

### 4.1 User Role States

**Roles managed by schedulecoaches.com:**

| Role | Subscription Status | Description | Can Login to App? |
|------|---------------------|-------------|-------------------|
| `coach` | `unpaid` | Account created, no payment | ❌ No |
| `coach` | `free` | Free tier (legacy) | ✅ Yes |
| `coach` | `active` | Active subscription | ✅ Yes |
| `coach` | `past_due` | Payment failed, grace period | ⚠️ Limited |
| `coach` | `cancelled` | Subscription cancelled | ❌ No |
| `admin` | `active` | Administrator access | ✅ Yes |

**Important:** The `role` column stays as `coach` forever. The `subscriptionStatus` column changes based on payment status.

### 4.2 Required Columns

The following columns are used by schedulecoaches.com:

```sql
-- User authentication
googleAccountId NVARCHAR(255)        -- Google OAuth subject ID
azureAdId NVARCHAR(255)              -- Microsoft/Entra ID (legacy)
appleAccountId NVARCHAR(255)         -- Apple Sign-In ID (future)

-- Subscription management
role NVARCHAR(50)                    -- Always 'coach' (or 'admin')
subscriptionStatus NVARCHAR(50)      -- unpaid/free/active/past_due/cancelled
stripeCustomerId NVARCHAR(255)       -- Stripe customer ID (cus_...)
stripeSubscriptionId NVARCHAR(255)   -- Stripe subscription ID (sub_...)
subscriptionEndDate DATETIME         -- When subscription expires
```

### 4.3 Database Verification Query

```sql
-- Check if user was upgraded after payment
SELECT
    email,
    role,
    subscriptionStatus,
    stripeCustomerId,
    stripeSubscriptionId,
    createdAt
FROM Users
WHERE email = 'test@example.com';
```

---

## 5. GitHub Actions Workflows

### 5.1 Frontend Deployment Workflow

**File:** `.github/workflows/azure-static-web-apps-ashy-bay-083e00b10.yml`

```yaml
name: Deploy Frontend to Azure Static Web Apps

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build And Deploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "/"
          api_location: ""
          output_location: "dist"
        env:
          VITE_STRIPE_PUBLISHABLE_KEY: ${{ secrets.VITE_STRIPE_PUBLISHABLE_KEY }}
          VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}
```

**Required Secrets:**
- `AZURE_STATIC_WEB_APPS_API_TOKEN` - Deployment token from Azure Portal
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe production publishable key
- `VITE_API_BASE_URL` - Function App URL

### 5.2 Backend Deployment Workflow

**File:** `.github/workflows/main_schedulecoaches-api.yml`

```yaml
name: Deploy Backend to Azure Function App

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20.x'

      - name: Resolve Project Dependencies
        run: |
          pushd './api'
          npm install
          npm run build --if-present
          popd

      - name: Zip artifact for deployment
        run: cd api && zip ../release.zip ./* -r

      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: node-app
          path: release.zip

  deploy:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Download artifact
        uses: actions/download-artifact@v3
        with:
          name: node-app

      - name: Unzip artifact
        run: unzip release.zip

      - name: Run Azure Functions Action
        uses: Azure/functions-action@v1
        with:
          app-name: 'schedulecoaches-api-prod'
          package: '.'
          publish-profile: ${{ secrets.AZUREAPPSERVICE_PUBLISHPROFILE }}
```

**Required Secrets:**
- `AZUREAPPSERVICE_PUBLISHPROFILE` - Publish profile from Azure Portal

---

## 6. Testing Procedures

### 6.1 Pre-Production Testing Checklist

**Test Environment Setup:**
- [ ] Use Stripe **test mode** keys
- [ ] Use test Google account for authentication
- [ ] Use test Stripe cards (4242 4242 4242 4242)

**Frontend Tests:**
- [ ] Google Sign-In popup appears
- [ ] User redirected to Stripe checkout
- [ ] Stripe checkout shows correct price ($20/month for test)
- [ ] Payment completes successfully
- [ ] User redirected to success page

**Backend Tests:**
- [ ] User created in database with `role='coach'`, `subscriptionStatus='unpaid'`
- [ ] Stripe checkout session created with correct metadata
- [ ] Webhook receives `checkout.session.completed` event
- [ ] Database updated: `subscriptionStatus='active'`, Stripe IDs populated
- [ ] User can login to pbcoach app with same credentials

**Database Verification:**
```sql
-- After successful payment
SELECT
    email,
    role,                      -- Should be 'coach'
    subscriptionStatus,        -- Should be 'active'
    stripeCustomerId,          -- Should be 'cus_...'
    stripeSubscriptionId,      -- Should be 'sub_...'
    googleAccountId            -- Should be Google OAuth ID
FROM Users
WHERE email = 'test@example.com';
```

### 6.2 Production Smoke Test

After deploying to production:

1. **Create test account:** Use a real email you control
2. **Complete payment:** Use real card (will be charged)
3. **Verify database:** Check user upgraded to `active`
4. **Test app login:** Login to pbcoach app with same credentials
5. **Cancel subscription:** Go to Stripe Dashboard → Cancel test subscription
6. **Refund payment:** Refund the test payment

---

## 7. Rollback Procedures

### 7.1 Frontend Rollback

Azure Static Web Apps keeps deployment history:

```bash
# List deployments
az staticwebapp list-deployments \
  --name schedulecoaches-web-prod \
  --resource-group prd-schedulecoachesweb

# Rollback to previous deployment
# Use Azure Portal → Static Web Apps → Deployments → Select previous → Activate
```

### 7.2 Backend Rollback

Function App keeps deployment slots:

```bash
# Swap deployment slots
az functionapp deployment slot swap \
  --name schedulecoaches-api-prod \
  --resource-group prd-schedulecoachesweb \
  --slot staging \
  --target-slot production
```

Or redeploy previous GitHub commit by triggering workflow.

---

## 8. Monitoring and Troubleshooting

### 8.1 Application Insights

**Enable Application Insights:**
```bash
az monitor app-insights component create \
  --app schedulecoaches-api-prod-insights \
  --location centralus \
  --resource-group prd-schedulecoachesweb \
  --application-type web

# Link to Function App
az functionapp config appsettings set \
  --name schedulecoaches-api-prod \
  --resource-group prd-schedulecoachesweb \
  --settings APPLICATIONINSIGHTS_CONNECTION_STRING="<connection-string>"
```

**Key Metrics:**
- Request rate (requests/second)
- Response time (p50, p95, p99)
- Failure rate (%)
- Webhook delivery success rate

### 8.2 Stripe Dashboard Monitoring

**Webhook Monitoring:**
- Go to Stripe Dashboard → Developers → Webhooks
- Click on webhook endpoint
- Check "Recent deliveries" for failures
- Common issues:
  - 400: Invalid signature (wrong `STRIPE_WEBHOOK_SECRET`)
  - 404: User not found (check database)
  - 500: Server error (check Function App logs)

### 8.3 Common Issues and Solutions

**Issue 1: Webhook signature verification failed**
- **Error:** `No signatures found matching the expected signature`
- **Solution:** Ensure `STRIPE_WEBHOOK_SECRET` matches webhook in Stripe Dashboard
- **Verify:** Restart Function App after updating secret

**Issue 2: User not upgraded after payment**
- **Check:** Stripe webhook logs - was webhook delivered?
- **Check:** Function App logs - did webhook process successfully?
- **Check:** Database - was `subscriptionStatus` updated?
- **Solution:** Manually trigger webhook event using Stripe CLI

**Issue 3: CORS errors**
- **Error:** `No 'Access-Control-Allow-Origin' header`
- **Solution:** Add domain to Function App CORS settings
- **Verify:** Restart Function App after CORS change

**Issue 4: Google Sign-In fails**
- **Check:** `GOOGLE_CLIENT_ID` in Function App settings
- **Check:** Authorized domains in Google Cloud Console
- **Solution:** Add `schedulecoaches.com` to authorized domains

---

## 9. Production Cutover Plan

### Phase 1: Pre-Production (1-2 weeks before launch)
- [ ] Deploy to production infrastructure with test Stripe keys
- [ ] Run full integration tests
- [ ] Perform load testing (if needed)
- [ ] Update DNS to point to Azure Static Web App

### Phase 2: Production Launch (Launch Day)
- [ ] Switch Stripe keys from test to live mode
- [ ] Update `STRIPE_SECRET_KEY` in Function App
- [ ] Update `STRIPE_WEBHOOK_SECRET` with production webhook secret
- [ ] Update frontend `VITE_STRIPE_PUBLISHABLE_KEY` secret in GitHub
- [ ] Trigger frontend redeployment
- [ ] Restart Function App
- [ ] Run smoke test with real payment
- [ ] Monitor logs for 24 hours

### Phase 3: Post-Launch (Week 1)
- [ ] Monitor webhook delivery success rate
- [ ] Monitor user signup conversion rate
- [ ] Monitor payment success rate
- [ ] Check for any error patterns in logs
- [ ] Set up alerts for critical failures

---

## 10. Security Checklist

**Production Security:**
- [ ] Use HTTPS only (enforced by Azure)
- [ ] Stripe webhook signature verification enabled
- [ ] SQL connection uses TLS encryption (`Encrypt=true`)
- [ ] Environment variables stored in Azure (not in code)
- [ ] CSP headers configured to prevent XSS
- [ ] CORS limited to schedulecoaches.com domain only
- [ ] No sensitive data in frontend code
- [ ] No test/dev credentials in production

**Secrets Rotation:**
- [ ] Rotate Stripe keys every 90 days
- [ ] Rotate database password every 90 days
- [ ] Rotate webhook secrets after any security incident

---

## Appendix: Quick Reference

### Function App Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth-me` | GET | Create/get user account, link by email |
| `/api/create-checkout-session` | POST | Create Stripe checkout session |
| `/api/webhook` | POST | Stripe webhook handler |
| `/api/subscription-status` | GET | Get subscription status (no user creation) |

### Stripe Webhook Events

| Event | Action | Database Update |
|-------|--------|-----------------|
| `checkout.session.completed` | Payment completed | `subscriptionStatus = 'active'` |
| `customer.subscription.updated` | Subscription changed | Update status based on Stripe status |
| `customer.subscription.deleted` | Subscription cancelled | `subscriptionStatus = 'cancelled'` |
| `invoice.payment_succeeded` | Renewal succeeded | `subscriptionStatus = 'active'` |
| `invoice.payment_failed` | Payment failed | `subscriptionStatus = 'past_due'` |

### Test Cards (Stripe Test Mode)

| Card Number | Description |
|-------------|-------------|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 9995` | Declined |
| `4000 0000 0000 3220` | 3D Secure required |

---

## Support and Contact

**Technical Issues:**
- Check Azure Function App logs
- Check Stripe webhook logs
- Check Application Insights

**Stripe Support:**
- https://support.stripe.com

**Azure Support:**
- https://portal.azure.com → Support

---

**Document Version:** 1.0
**Last Updated:** 2025-10-26
**Author:** Claude Code
**Maintainer:** ScheduleCoaches Team
