# ScheduleCoaches API

This directory contains Azure Functions that handle Stripe subscription integration for the ScheduleCoaches website.

## Prerequisites

- Node.js 18+ installed
- Azure Functions Core Tools installed (for local development)
- Stripe account with test API keys

## Setup

1. **Install dependencies:**
   ```bash
   cd api
   npm install
   ```

2. **Configure environment variables:**

   Copy `local.settings.json.example` to `local.settings.json`:
   ```bash
   cp local.settings.json.example local.settings.json
   ```

3. **Add your Stripe API keys:**

   Update `local.settings.json` with your Stripe test keys:
   - `STRIPE_SECRET_KEY`: Your Stripe secret key (sk_test_...)
   - `STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key (pk_test_...)
   - `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook signing secret (whsec_...)
   - `DOMAIN`: Your frontend URL (default: http://localhost:5173)

   Get your keys from: https://dashboard.stripe.com/test/apikeys

4. **Set up Stripe products and pricing:**

   In your Stripe Dashboard:
   - Create a product named "Pickleball Coach - Monthly Subscription"
   - Create a recurring price ($20/month)
   - Add lookup_key: `pickleball_monthly`

## Running Locally

Start the Azure Functions locally:

```bash
cd api
npm start
# or
func start
```

The API will be available at:
- `http://localhost:7071/api/create-checkout-session`
- `http://localhost:7071/api/create-portal-session`
- `http://localhost:7071/api/webhook`

## Testing Webhooks Locally

Use the Stripe CLI to forward webhook events to your local endpoint:

```bash
stripe listen --forward-to localhost:7071/api/webhook
```

The CLI will output a webhook signing secret (whsec_...). Add this to your `local.settings.json` as `STRIPE_WEBHOOK_SECRET`.

Test a webhook:
```bash
stripe trigger customer.subscription.created
```

## API Endpoints

### POST /api/create-checkout-session

Creates a Stripe Checkout session for subscription signup.

**Request Body:**
```json
{
  "lookup_key": "pickleball_monthly",
  "referral_code": "optional_referral_code"
}
```

**Response:**
```json
{
  "url": "https://checkout.stripe.com/c/pay/..."
}
```

### POST /api/create-portal-session

Creates a Stripe Customer Portal session for billing management.

**Request Body:**
```json
{
  "session_id": "cs_test_..."
}
```

**Response:**
```json
{
  "url": "https://billing.stripe.com/p/session/..."
}
```

### POST /api/webhook

Receives and processes Stripe webhook events.

**Headers:**
- `stripe-signature`: Webhook signature for verification

**Handled Events:**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.trial_will_end`
- `invoice.paid`
- `invoice.payment_failed`
- `entitlements.active_entitlement_summary.updated`

## Deployment

When deploying to Azure Static Web Apps:

1. The `/api` folder is automatically detected and deployed as Azure Functions
2. Set environment variables in Azure Static Web Apps Configuration:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `DOMAIN` (your production domain)

3. Update your Stripe webhook endpoint to point to:
   `https://your-site.azurestaticapps.net/api/webhook`

## Security Notes

- Never commit `local.settings.json` to version control (it's in .gitignore)
- Always use test keys (sk_test_..., pk_test_...) for development
- Always verify webhook signatures in production
- Use environment variables for all sensitive configuration

## Learn More

- [Stripe Checkout Documentation](https://stripe.com/docs/payments/checkout)
- [Stripe Customer Portal Documentation](https://stripe.com/docs/billing/subscriptions/customer-portal)
- [Azure Functions Documentation](https://docs.microsoft.com/en-us/azure/azure-functions/)
- [Azure Static Web Apps API Documentation](https://docs.microsoft.com/en-us/azure/static-web-apps/apis-functions)
