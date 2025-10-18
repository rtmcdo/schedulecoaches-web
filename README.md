# ScheduleCoaches.com

Marketing website for Pickleball Coach and Tennis Coach mobile applications. Built with Vue 3, TypeScript, Vite, and Tailwind CSS.

## Overview

ScheduleCoaches.com serves as the primary marketing and subscription platform for the Pickleball Coach and Tennis Coach mobile applications. The site features a modern, clean design with hero sections, feature showcases, and seamless Stripe checkout integration.

## Tech Stack

- **Frontend**: Vue 3 (Composition API), TypeScript
- **Build Tool**: Vite
- **Routing**: Vue Router
- **Styling**: Tailwind CSS
- **Hosting**: Azure Static Web Apps
- **Backend**: Azure Functions (Node.js)
- **Payments**: Stripe Checkout
- **CI/CD**: GitHub Actions

## Prerequisites

- Node.js 18+ and npm
- Git
- Azure account (for deployment)
- Stripe account (for payment processing)

## Local Development Setup

### 1. Clone the repository

```bash
git clone https://github.com/rtmcdo/schedulecoaches-web.git
cd schedulecoaches-web
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example environment file and update with your values:

```bash
cp .env.example .env
```

Edit `.env` and add your configuration:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
VITE_API_BASE_URL=http://localhost:7071/api
```

### 4. Set up Azure Functions API

The `/api` directory contains the backend Azure Functions for Stripe integration.

```bash
cd api
npm install
cp local.settings.json.example local.settings.json
```

Edit `api/local.settings.json` and add your Stripe API keys. See `api/README.md` for detailed setup instructions.

### 5. Run development servers

**Terminal 1 - Frontend:**
```bash
npm run dev
```

**Terminal 2 - API (in separate terminal):**
```bash
cd api
npm start
# or
func start
```

The frontend will be available at `http://localhost:5173` and the API at `http://localhost:7071/api`

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run type-check` - Run TypeScript type checking

## Project Structure

```
schedulecoaches-web/
├── .github/
│   └── workflows/
│       └── azure-static-web-apps.yml  # CI/CD workflow
├── api/                               # Azure Functions backend
│   ├── create-checkout-session/       # Stripe checkout endpoint
│   ├── create-portal-session/         # Stripe portal endpoint
│   ├── webhook/                       # Stripe webhook handler
│   ├── host.json                      # Azure Functions config
│   ├── local.settings.json            # Local environment vars (gitignored)
│   ├── local.settings.json.example    # Template for local settings
│   ├── package.json                   # API dependencies
│   └── README.md                      # API documentation
├── documentation/                      # Project documentation
├── src/
│   ├── assets/                        # Images, logos, screenshots
│   ├── components/                    # Reusable Vue components
│   ├── composables/                   # Vue composables (useStripeCheckout)
│   ├── router/                        # Vue Router configuration
│   │   └── index.ts
│   ├── views/                         # Page components
│   │   ├── Home.vue
│   │   ├── PickleballCoach.vue
│   │   ├── CheckoutSuccess.vue
│   │   ├── CheckoutCancel.vue
│   │   ├── FAQ.vue
│   │   ├── Contact.vue
│   │   ├── PrivacyPolicy.vue
│   │   └── TermsOfService.vue
│   ├── App.vue                        # Root component
│   ├── main.ts                        # Application entry point
│   ├── style.css                      # Global styles with Tailwind
│   └── vite-env.d.ts                  # TypeScript definitions
├── index.html                         # HTML entry point
├── vite.config.ts                     # Vite configuration
├── tailwind.config.js                 # Tailwind CSS configuration
├── tsconfig.json                      # TypeScript configuration
└── package.json

```

## Deployment

### Azure Static Web Apps

The site automatically deploys to Azure Static Web Apps when pushing to the `main` branch via GitHub Actions.

#### Initial Azure Setup

1. **Create Azure Static Web App**:
   - Go to Azure Portal → Create Resource → Static Web App
   - Choose your subscription and resource group
   - Name: `schedulecoaches-web`
   - Region: Choose closest to your users
   - Source: GitHub
   - Connect your GitHub repository
   - Build preset: Custom
   - App location: `/`
   - Output location: `dist`

2. **Configure Environment Variables**:

   In Azure Portal, go to your Static Web App → Configuration → Application settings:

   **Frontend Environment Variables:**
   - `VITE_STRIPE_PUBLISHABLE_KEY` - Your Stripe live publishable key (pk_live_...)
   - `VITE_API_BASE_URL` - Leave blank (API is at /api by default)

   **Backend/API Environment Variables:**
   - `STRIPE_SECRET_KEY` - Your Stripe live secret key (sk_live_...)
   - `STRIPE_PUBLISHABLE_KEY` - Your Stripe live publishable key (pk_live_...)
   - `STRIPE_WEBHOOK_SECRET` - Your Stripe webhook signing secret (whsec_...)
   - `DOMAIN` - Your production domain (https://schedulecoaches.com)

3. **Configure Stripe Webhook**:

   In Stripe Dashboard:
   - Go to Developers → Webhooks
   - Add endpoint: `https://your-site.azurestaticapps.net/api/webhook`
   - Select events: All subscription events, invoice events
   - Copy the webhook signing secret to Azure app settings

4. **Configure Custom Domain**:
   - In Azure Portal, go to your Static Web App
   - Navigate to Custom domains
   - Add custom domain: `schedulecoaches.com`
   - Follow DNS verification steps
   - Add www subdomain and configure redirect

### DNS Configuration

Add the following DNS records:

```
Type: CNAME
Name: www
Value: [your-azure-static-app].azurestaticapps.net

Type: TXT (for verification)
Name: @
Value: [verification-token-from-azure]
```

## Environment Variables

### Development
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe test mode publishable key (pk_test_...)
- `VITE_API_BASE_URL` - Local API endpoint (http://localhost:7071/api)

### Production
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe live mode publishable key (pk_live_...)
- `VITE_API_BASE_URL` - Production API endpoint (https://your-api.azurewebsites.net/api)

## Development Phases

This project follows an 11-phase implementation plan. See `documentation/schedulecoaches-website-plan.md` for detailed information.

**Current Status**: 🚧 Phase 5 In Progress - Stripe Subscription Integration

### Completed Phases
- ✅ Phase 1: Project Setup & Infrastructure
- ✅ Phase 2: Core Layout & Navigation
- ✅ Phase 3: Homepage Hero & Sport Selection
- ✅ Phase 4: Pickleball Coach Feature Detail Page

### Phase 5 Progress (Stripe Integration)
- [x] Frontend integration (Vue composables, checkout buttons, success/cancel pages)
- [x] Azure Functions backend setup (create-checkout-session, create-portal-session, webhook)
- [x] Environment variables configuration
- [ ] Local testing with Stripe CLI
- [ ] Production deployment and testing

### Next Phases
- Phase 6: FAQ Page
- Phase 7: Contact Page
- Phase 8: Privacy Policy & Terms of Service
- Phase 9: Testing & QA
- Phase 10: Performance Optimization
- Phase 11: Final Deployment & Launch

## Contributing

This is a private project. For questions or issues, contact the project maintainer.

## License

ISC License - Copyright (c) 2025
