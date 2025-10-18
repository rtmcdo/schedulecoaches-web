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
- **Payments**: Stripe Checkout (integration coming in Phase 5)
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

### 4. Run development server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

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
├── documentation/                      # Project documentation
├── src/
│   ├── assets/                        # Images, logos, screenshots
│   ├── components/                    # Reusable Vue components
│   ├── router/                        # Vue Router configuration
│   │   └── index.ts
│   ├── views/                         # Page components
│   │   ├── Home.vue
│   │   ├── PickleballCoach.vue
│   │   ├── FAQ.vue
│   │   ├── Contact.vue
│   │   ├── PrivacyPolicy.vue
│   │   ├── TermsOfService.vue
│   │   └── CheckoutSuccess.vue
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

2. **Configure GitHub Secrets**:

   The Azure setup will automatically create the `AZURE_STATIC_WEB_APPS_API_TOKEN` secret. Add the following additional secrets in your GitHub repository:

   - Navigate to: Settings → Secrets and variables → Actions
   - Add the following secrets:
     - `VITE_STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key (production)
     - `VITE_API_BASE_URL` - Your production API URL

3. **Configure Custom Domain**:
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

**Current Status**: ✅ Phase 1 Complete - Project Setup & Infrastructure

### Completed Tasks (Phase 1)
- [x] Initialize Vue 3 project with Vite and TypeScript
- [x] Install and configure Vue Router
- [x] Install and configure Tailwind CSS
- [x] Set up project folder structure
- [x] Create environment variables configuration
- [x] Set up GitHub Actions workflow for Azure Static Web Apps
- [x] Create README with setup instructions

### Next Steps (Phase 2)
- [ ] Build core layout with header and footer components
- [ ] Implement responsive navigation
- [ ] Add mobile hamburger menu

## Contributing

This is a private project. For questions or issues, contact the project maintainer.

## License

ISC License - Copyright (c) 2025
