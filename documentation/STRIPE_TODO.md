# Stripe Configuration TODO

**Last Updated**: 2025-10-21

## Overview

This document outlines the Stripe configuration steps required for production deployment of schedulecoaches.com subscription system.

## Prerequisites

- [ ] API deployed to Azure Functions with public URL
- [ ] Production Stripe account (not test mode)
- [ ] Stripe API keys (publishable and secret)

## 1. Stripe Products and Prices

### Create Subscription Product

1. Go to Stripe Dashboard → **Products**
2. Click **"Add product"**
3. Configure product:
   - **Name**: "Pickleball Coach Monthly Subscription"
   - **Description**: "Monthly subscription for pbcoach app access"
   - **Pricing model**: Recurring
   - **Price**: $29.99/month (or your chosen price)
   - **Billing period**: Monthly
   - **Currency**: USD

4. **Copy the Price ID** (starts with `price_...`)
   - Example: `price_1ABC123def456GHI789jkl`

5. Add Price ID to environment variables:
   ```
   STRIPE_PRICE_ID=price_1ABC123def456GHI789jkl
   ```

### Optional: Create Price Lookup Key

1. In the product pricing section, add a **lookup key**:
   - Lookup key: `pickleball_monthly`
   - This allows referencing the price by name instead of ID

## 2. Webhook Configuration

### Create Production Webhook Endpoint

1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Click **"Add endpoint"**
3. Configure endpoint:

   **Endpoint URL**:
   ```
   https://your-api-domain.azurewebsites.net/api/webhook
   ```

   Or with custom domain:
   ```
   https://api.schedulecoaches.com/webhook
   ```

4. **Select events to listen for**:
   - [x] `checkout.session.completed`
   - [x] `customer.subscription.updated`
   - [x] `customer.subscription.deleted`
   - [x] `invoice.payment_succeeded`
   - [x] `invoice.payment_failed`

5. Click **"Add endpoint"**

6. **Copy the Signing Secret** (starts with `whsec_...`)
   - Example: `whsec_1ABC123def456GHI789jklMNO012pqr`

## 3. Environment Variables

### Azure Function App Settings

Add these to your Azure Function App Configuration:

```bash
# Stripe API Keys (from Stripe Dashboard → Developers → API keys)
STRIPE_SECRET_KEY=sk_live_... # PRODUCTION secret key (NOT test key)
STRIPE_PUBLISHABLE_KEY=pk_live_... # PRODUCTION publishable key (NOT test key)

# Webhook Signing Secret (from step 2 above)
STRIPE_WEBHOOK_SECRET=whsec_1ABC123def456GHI789jklMNO012pqr

# Price ID (from step 1 above)
STRIPE_PRICE_ID=price_1ABC123def456GHI789jkl

# Domain (for checkout redirect URLs)
DOMAIN=https://schedulecoaches.com

# Database Connection
SQL_CONNECTION_STRING=Server=pbcoach-sql.database.windows.net;Database=pbcoach-db;User Id=pbcoachadmin;Password=...;Encrypt=true
```

### Frontend Environment Variables

Update `.env.production` or Vite config:

```bash
# Stripe Publishable Key (PRODUCTION)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...

# API Base URL
VITE_API_BASE_URL=https://api.schedulecoaches.com

# Entra ID Config (same as test, already configured)
VITE_ENTRA_TENANT_ID=da976fe1-dd40-4c9d-a828-acfa45634f85
VITE_ENTRA_TENANT_SUBDOMAIN=pickleballcoach
VITE_ENTRA_CLIENT_ID=e6c5b70f-e2d7-472d-a363-230a252ccbd5
```

## 4. Test the Webhook

### Test Webhook Delivery

1. After deployment, trigger a test event:
   - Stripe Dashboard → **Developers** → **Webhooks**
   - Click on your webhook endpoint
   - Click **"Send test webhook"**
   - Select `checkout.session.completed`
   - Click **"Send test webhook"**

2. Check webhook logs:
   - Should show `200 OK` response
   - Check Azure Function logs for webhook processing

### Test with Real Payment

**IMPORTANT**: Use Stripe test cards in test mode first!

1. **Test Mode** (before going live):
   - Use test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any CVC
   - Complete checkout flow

2. **Production Mode**:
   - Use a real card (your own for testing)
   - Complete signup → checkout → payment
   - Verify webhook updates user in database
   - Check user's `subscriptionStatus` changed to `active`

## 5. Verify Webhook Events

After a test payment, verify these webhook events were received:

1. **checkout.session.completed**
   - User's `subscriptionStatus` → `active`
   - `stripeCustomerId` saved
   - `stripeSubscriptionId` saved

2. Check Stripe Dashboard:
   - **Customers** → Should see new customer
   - **Subscriptions** → Should see active subscription
   - **Webhooks** → Should show successful deliveries

## 6. Customer Portal (Optional)

The customer portal allows users to manage their subscription (cancel, update payment method, etc.)

### Enable Customer Portal

1. Stripe Dashboard → **Settings** → **Billing** → **Customer portal**
2. Enable portal and configure:
   - [ ] Allow customers to cancel subscriptions
   - [ ] Allow customers to update payment methods
   - [ ] Allow customers to view invoices
   - [ ] Set cancellation behavior (immediate or at end of period)

3. The portal is already integrated via `/api/create-portal-session` endpoint

## 7. Testing Checklist

### Pre-Production Tests (Test Mode)

- [ ] Create account with test email
- [ ] Complete checkout with test card `4242 4242 4242 4242`
- [ ] Verify webhook received (`checkout.session.completed`)
- [ ] Check database: user's `subscriptionStatus` is `active`
- [ ] Check Stripe Dashboard: subscription created
- [ ] Test failed payment with card `4000 0000 0000 0341`
- [ ] Verify webhook received (`invoice.payment_failed`)
- [ ] Check database: user's `subscriptionStatus` is `past_due`

### Production Tests

- [ ] Switch to live mode (use live API keys)
- [ ] Create real account with your email
- [ ] Complete checkout with real card
- [ ] Verify webhook received
- [ ] Check database: subscription active
- [ ] Login to pbcoach app with same credentials
- [ ] Verify app allows access (has active subscription)
- [ ] Test customer portal (cancel/update subscription)

## 8. Monitoring

### Set Up Alerts

1. **Stripe Dashboard → Developers → Webhooks**
   - Monitor for failed webhook deliveries
   - Set up email notifications for failures

2. **Azure Function Monitoring**
   - Monitor `/api/webhook` endpoint for errors
   - Set up alerts for 500 errors
   - Monitor database connection issues

### Key Metrics to Track

- Webhook delivery success rate (should be >99%)
- Failed payment rate
- Subscription churn rate
- Average time from signup to payment

## 9. Common Issues

### Webhook Not Received

**Symptoms**: Payment completes but user's `subscriptionStatus` stays `unpaid`

**Fixes**:
1. Check webhook endpoint URL is correct
2. Verify webhook signing secret matches
3. Check Azure Function logs for errors
4. Test webhook delivery in Stripe Dashboard

### Webhook Signature Invalid

**Symptoms**: Webhook returns 400 error "Invalid signature"

**Fixes**:
1. Verify `STRIPE_WEBHOOK_SECRET` matches the webhook's signing secret
2. Don't modify webhook request body before verification
3. Check for middleware that modifies request

### Database Not Updated

**Symptoms**: Webhook received but database not updated

**Fixes**:
1. Check webhook logs for SQL errors
2. Verify user exists in database (check by email or Stripe customer ID)
3. Check database connection string is correct

## 10. Going Live Checklist

Before enabling production payments:

- [ ] All environment variables configured in Azure
- [ ] Webhook endpoint created and tested
- [ ] Test payment completed successfully
- [ ] Database updates working correctly
- [ ] Frontend using production Stripe key
- [ ] API using production Stripe key
- [ ] Customer portal configured
- [ ] Monitoring and alerts set up
- [ ] Tested full signup → payment → app login flow

## Related Documentation

- [Subscription Status System](./SUBSCRIPTION_STATUS.md)
- [Backend API Implementation Plan](./schedulecoaches-backend-api-implementation-plan.md)
- [Entra Setup Guide](./ENTRA_SETUP.md)

## Support

For Stripe-specific questions:
- Stripe Docs: https://stripe.com/docs
- Stripe Support: https://support.stripe.com/

For implementation questions:
- See backend code: `/api/src/functions/stripeWebhook.ts`
- See checkout code: `/api/src/functions/createCheckoutSession.ts`
