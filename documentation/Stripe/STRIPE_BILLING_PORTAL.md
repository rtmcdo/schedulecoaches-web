# Stripe Billing Portal Setup Guide

This guide explains how to configure and use the Stripe Billing Portal for ScheduleCoaches.

## Overview

The Stripe Billing Portal is a secure, Stripe-hosted page where customers can:
- Update payment methods
- View invoices and receipts
- View subscription details
- Cancel subscriptions
- Update billing information
- Manage tax IDs (if enabled)

## Architecture

### Flow
1. User logs into schedulecoaches.com and navigates to `/account`
2. User clicks "Manage Billing & Payment" button
3. Frontend calls `/api/create-portal-session` with Bearer token
4. Backend validates user authentication
5. Backend looks up user's Stripe customer ID from database
6. Backend creates a Stripe billing portal session
7. Backend returns portal URL to frontend
8. Frontend redirects user to Stripe-hosted portal
9. User manages their subscription on Stripe
10. User returns to `/account` page via portal's return URL
11. Stripe sends webhooks for any subscription changes

### Files Involved

**Backend:**
- `api/src/functions/createPortalSession.ts` - Creates billing portal sessions

**Frontend:**
- `src/views/Account.vue` - Account management page with portal button

**Database:**
- Users table must have `stripeCustomerId` populated (happens during checkout)

## Configuration Steps

### 1. Configure Portal in Stripe Dashboard (Test Mode)

1. Go to [Stripe Dashboard - Customer Portal](https://dashboard.stripe.com/test/settings/billing/portal)
2. Toggle on **Customer Portal** to enable it
3. Configure the following settings:

#### Business Information
- **Business name**: Schedule Coaches
- **Support email**: support@schedulecoaches.com
- **Privacy policy**: https://schedulecoaches.com/privacy
- **Terms of service**: https://schedulecoaches.com/terms

#### Features

**Customer information:**
- ✅ Allow customers to update email address
- ✅ Allow customers to update billing address

**Payment methods:**
- ✅ Allow customers to update payment methods
- ✅ Allow customers to add payment methods

**Invoice history:**
- ✅ Allow customers to view invoice history

**Subscriptions:**
- ⬜ Allow customers to switch plans (disable for now)
- ✅ Allow customers to cancel subscriptions
  - When to cancel: **At the end of billing period** (recommended)
  - Cancellation surveys: Optional - can collect feedback

**Tax IDs:**
- ⬜ Allow customers to add tax IDs (optional - enable if using Stripe Tax)

#### Branding
- **Brand color**: Use your primary color (#0066FF or similar)
- **Logo**: Upload Schedule Coaches logo
- **Icon**: Upload favicon

#### Return URL
- **Default return URL**: `https://schedulecoaches.com/account`
  - For local testing: `http://localhost:5173/account`

### 2. Configure Portal in Stripe Dashboard (Live Mode)

Once testing is complete:

1. Switch to Live mode in Stripe Dashboard
2. Go to [Stripe Dashboard - Customer Portal](https://dashboard.stripe.com/settings/billing/portal)
3. Configure with the same settings as test mode
4. Ensure return URL is set to production: `https://schedulecoaches.com/account`

### 3. Verify Environment Variables

Ensure these are set in Azure Function App:

**Test Environment:**
```bash
STRIPE_SECRET_KEY=sk_test_...
DOMAIN=https://schedulecoaches.com
```

**Production Environment:**
```bash
STRIPE_SECRET_KEY=sk_live_...
DOMAIN=https://schedulecoaches.com
```

### 4. Test the Flow

1. Create a test subscription:
   - Sign up at schedulecoaches.com
   - Complete checkout with test card `4242 4242 4242 4242`

2. Navigate to `/account` page

3. Click "Manage Billing & Payment"

4. Verify you're redirected to Stripe portal

5. Test portal features:
   - Update payment method
   - View invoices
   - Cancel subscription (test that it cancels at period end)

6. Return to schedulecoaches.com via "Return to Schedule Coaches" link

## Webhooks

The following webhooks are already configured in `api/src/functions/stripeWebhook.ts`:

### Subscription Events
- `customer.subscription.updated` - Handles plan changes, cancellations
- `customer.subscription.deleted` - Handles immediate cancellations

### Payment Method Events
- `payment_method.attached` - Customer adds a payment method
- `payment_method.detached` - Customer removes a payment method

### Customer Events
- `customer.updated` - Customer updates billing info

### Invoice Events
- Already handled for subscription billing

## Security Notes

1. **Authentication Required**: Portal sessions can only be created by authenticated users
2. **Customer ID Validation**: Backend validates user owns the Stripe customer ID
3. **Short-lived URLs**: Portal session URLs expire after a short time
4. **HTTPS Only**: Portal only works over HTTPS in production

## Troubleshooting

### "No Stripe customer ID found" Error

**Cause**: User has not completed a payment yet

**Solution**: User must complete checkout first to create Stripe customer record

### "User not found in database" Error

**Cause**: User record doesn't exist in Users table

**Solution**: User must authenticate via `/api/auth-me` first

### Portal shows "No subscriptions"

**Cause**: User has no active or past subscriptions

**Solution**: User must complete checkout to create subscription

### Return URL not working

**Cause**: Portal return URL not configured correctly

**Solution**:
1. Check portal configuration in Stripe Dashboard
2. Ensure `DOMAIN` environment variable is set correctly
3. Verify return URL matches frontend route

## API Reference

### Create Portal Session

**Endpoint**: `POST /api/create-portal-session`

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**: None required

**Response**:
```json
{
  "url": "https://billing.stripe.com/session/..."
}
```

**Errors**:
- `401` - Authentication failed
- `404` - User not found in database
- `400` - No Stripe customer ID found
- `500` - Failed to create portal session

## Future Enhancements

1. **Multiple Configurations**: Create different portal configs for different customer tiers
2. **Plan Switching**: Enable customers to upgrade/downgrade plans
3. **Proration**: Configure how to handle mid-cycle plan changes
4. **Tax ID Collection**: Enable for customers who need tax IDs on invoices
5. **Custom Flows**: Use `flow_data` parameter for specific actions (cancel, update payment, etc.)

## Resources

- [Stripe Customer Portal Docs](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)
- [Portal Configuration API](https://stripe.com/docs/api/customer_portal/configuration)
- [Webhook Events](https://stripe.com/docs/api/events/types)

## Last Updated

January 2025
