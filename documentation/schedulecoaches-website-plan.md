# ScheduleCoaches.com Marketing Website - Implementation Plan

**Created**: 2025-10-17
**Last Updated**: 2025-10-20
**Feature**: Public-facing marketing website and subscription platform for pbcoach mobile app
**Status**: 🟡 In Progress - Phase 4 Complete
**Approach**: Build a Vue.js static website with Tailwind CSS and Azure Static Web Apps managed functions for backend API, integrating Entra ID authentication and Stripe subscriptions

**Related Documentation:**
- [Backend API Implementation Plan](./schedulecoaches-backend-api-implementation-plan.md) - Detailed backend architecture (11 phases)
- [Subscription Status Tracking](./SUBSCRIPTION_STATUS.md) - User roles and subscription lifecycle
- [Project Guidelines](./.claude/claude.md) - Development restrictions and configuration

---

## Overview

ScheduleCoaches.com will serve as the primary marketing and subscription platform for the Pickleball Coach and Tennis Coach mobile applications. The site will feature a modern, clean design (mirroring pickleballjournal.com) with hero sections, feature showcases using app screenshots, and seamless Stripe checkout integration.

**Key Business Goals:**
- Convert visitors to paid subscribers through compelling feature presentation
- Process monthly subscriptions via Stripe with referral code tracking
- Authorize app access based on subscription status
- Provide sport-specific landing pages (Pickleball Coach active, Tennis Coach coming soon)
- Establish professional brand presence for both sports coaching apps

**Important Notes:**
- Separate repository from main coaching app
- Pickleball Coach launches with full feature detail page
- Tennis Coach shows teaser on homepage but no detail page initially
- Referral system must track codes for commission payouts
- User account creation occurs after payment, syncs with iOS app authentication

---

## Phase 1: Project Setup & Infrastructure
**Target**: Initialize Vue.js project with Tailwind CSS, establish repository, configure Azure Static Web Apps deployment
**Status**: 🟢 Complete
**Completed**: 2025-10-18
**Actual Duration**: 1 day

### Tasks
- [x] Create new Git repository `schedulecoaches-web`
- [x] Initialize Vue 3 project with Vite
  - [x] Configure TypeScript support
  - [x] Add Vue Router for multi-page navigation
- [x] Install and configure Tailwind CSS v3.4.0
  - [x] Set up custom color palette (mirror pbjournal blue theme)
  - [x] Configure typography and spacing utilities
- [x] Set up project structure
  - [x] `/src/views/` - Page components (Home, PickleballCoach, FAQ, etc.)
  - [x] `/src/components/` - Reusable components (Hero, FeatureCard, CTA, etc.)
  - [x] `/src/assets/` - Images, screenshots, logos
  - [x] `/src/router/` - Vue Router configuration
- [x] Set up GitHub Actions deployment workflow (ready for Azure)
  - [ ] Create Azure Static Web App resource (pending deployment)
  - [ ] Configure custom domain schedulecoaches.com (pending Azure setup)
- [x] Add environment variables configuration
  - [x] Stripe publishable key placeholder
  - [x] API base URL for subscription verification

### Acceptance Criteria
- Vue app runs locally on `npm run dev`
- Tailwind CSS styles compile and apply correctly
- GitHub Actions successfully deploys to Azure on push to main
- Custom domain schedulecoaches.com points to Azure Static Web App
- README documents local setup and deployment process

### Notes
```
Reference pbweb structure but adapt for Vue:
- Next.js page.tsx → Vue SFCs in /src/views/
- Next.js layout.tsx → Vue App.vue + router-view
- React components → Vue Composition API components
- framer-motion → Vue transitions/GSAP if needed
```

---

## Phase 2: Core Layout & Navigation
**Target**: Build site-wide layout with header, footer, and responsive navigation
**Status**: 🟢 Complete
**Completed**: 2025-10-18
**Actual Duration**: <1 day

### Tasks
- [x] Create `App.vue` with global layout structure
- [x] Build `HeaderNav.vue` component
  - [x] Text-based logo "ScheduleCoaches" (left side)
  - [x] Navigation with Sports dropdown menu (Pickleball, Tennis)
  - [x] Additional links: Home, FAQ, Contact
  - [x] "Buy Now" CTA button (right side, prominent)
  - [x] Mobile hamburger menu with expandable Sports section
  - [x] Smooth transitions and hover effects
- [x] Build `FooterNav.vue` component
  - [x] Links to Privacy Policy, Terms of Service, Contact
  - [x] Social media icons (Facebook, Instagram)
  - [x] Copyright notice (JRM Software LLC)
  - [x] Tagline: "Professional coaching business management for sport coaches"
- [x] Vue Router routes implemented (completed in Phase 1, expanded in Phase 2):
  - [x] `/` - Home
  - [x] `/pickleball-coach` - Pickleball Coach detail page
  - [x] `/tennis-coach` - Tennis Coach detail page (placeholder)
  - [x] `/faq` - FAQ page
  - [x] `/contact` - Contact/Support page
  - [x] `/privacy-policy` - Privacy Policy
  - [x] `/terms-of-service` - Terms of Service
- [x] Add smooth scroll behavior for anchor links
- [x] Implement responsive breakpoints matching pbjournal

### Acceptance Criteria
- ✅ Header sticky on scroll with subtle shadow
- ✅ Navigation works on desktop and mobile (hamburger menu)
- ✅ Sports dropdown menu functions properly on both desktop and mobile
- ✅ All routes render without errors
- ✅ Footer displays correctly on all pages
- ✅ Responsive design tested on mobile, tablet, desktop

### Implementation Notes
- Sports dropdown implemented with Vue transitions for smooth animations
- Desktop: Click-to-open dropdown with Pickleball and Tennis options
- Mobile: Expandable section with chevron icon rotation
- Added `/tennis-coach` route for future Tennis Coach feature page
- Dropdown state management ensures proper cleanup on navigation

### Notes
```
Mobile breakpoints:
- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px

Header should have transparent background initially,
solid white background on scroll (like pbjournal)
```

---

## Phase 3: Homepage Hero & Sport Selection
**Target**: Create compelling homepage with hero section and sport-specific call-to-actions
**Status**: 🟢 Complete
**Completed**: 2025-10-18
**Actual Duration**: <1 day

### Tasks
- [x] Build `HeroSection.vue` component
  - [x] Large headline: "Manage Your Coaching Business"
  - [x] Subheadline highlighting Pickleball & Tennis coaching
  - [x] Two prominent sport cards:
    - [x] **Pickleball Coach** - "Learn More" button → `/pickleball-coach`
    - [x] **Tennis Coach** - "Coming Soon" badge with diagonal ribbon
  - [x] Feature highlights with checkmark icons
- [x] Add gradient background with animated blurred circles
- [x] Implement hover effects on sport cards (lift, shadow, border)
- [x] Add hero section animations (fade-in with staggered timing)
- [x] SVG icons for features (no image optimization needed yet)
- [x] Ensure mobile-responsive layout (cards stack vertically)
- [x] Added "Get Started Today" CTA button below cards

### Acceptance Criteria
- ✅ Hero section loads with smooth animations
- ✅ Sport cards clearly distinguish active (Pickleball) vs coming soon (Tennis)
- ✅ Layout adapts gracefully on all screen sizes
- ✅ "Learn More" button navigates to Pickleball Coach detail page
- ✅ Hover effects provide visual feedback
- ✅ Tennis card shows clear "Coming Soon" status

### Implementation Details
- Vue transitions with staggered delays (0ms, 300ms, 500ms) for smooth entrance
- Gradient background (primary-50 → white → blue-50)
- Sport cards with shadow-lg hover:shadow-2xl transitions
- Transform hover effects (translateY -0.5rem, scale 1.05 on CTA)
- Green checkmarks for active Pickleball features
- Gray checkmarks for Tennis features (coming soon state)
- Diagonal "COMING SOON" ribbon on Tennis card
- Fully responsive grid (1 column mobile, 2 columns desktop)

### Notes
```
Hero hierarchy:
1. Main headline (text-5xl font-bold)
2. Supporting text (text-xl text-gray-600)
3. Sport selection cards (hover:scale-105 transition)

Tennis Coach card shows screenshot but disabled state
with "Coming Soon" overlay badge
```

---

## Phase 4: Pickleball Coach Feature Detail Page
**Target**: Build comprehensive feature showcase page with app screenshots and bullet points
**Status**: 🟢 Complete
**Completed**: 2025-10-18
**Actual Duration**: 1 day

### Tasks
- [x] Create `PickleballCoach.vue` view
- [x] Build `FeatureSection.vue` reusable component
  - [x] Props: title, description, features[], screenshot, imagePosition (left/right)
  - [x] Alternating left/right image layout
  - [x] 4 bullet points with green checkmark icons per section
- [x] Implement four main feature sections:
  - [x] **Dashboard & Analytics** - Schedule overview, appointments, revenue tracking, coaching activities
  - [x] **Calendar Management** - Weekly/monthly views, drag-and-drop, recurring availability, calendar sync
  - [x] **Client Management** - Client profiles, session history, packages, automated reminders
  - [x] **Business Settings** - Session types (private coaching and clinics), pricing, booking URL & QR code, availability
- [x] Add hero section at top with pricing badge and dual CTAs
- [x] Build feature grid section with 8 quick feature icons
- [x] Add `PricingSection.vue` component with $20/month pricing
- [x] Add multiple CTAs throughout page (hero, pricing, bottom CTA section)
- [x] Include app screenshots from pbcoach.vnext
  - [x] 4 main feature screenshots (dashboard, calendar, clients, settings)
  - [x] Additional screenshots (session-types, availability)

### Acceptance Criteria
- ✅ Feature sections alternate left/right screenshot positioning
- ✅ Bullet points display with green checkmark icons (SVG)
- ✅ All screenshots render in phone frame mockup with proper aspect ratio
- ✅ Multiple "Buy Now" / "Start Free Trial" CTAs are prominent and consistent
- ✅ Page is fully responsive on mobile (sections stack, cards adapt)
- ✅ Screenshots are easily swappable via public/assets/screenshots/ folder

### Implementation Details
- **FeatureSection.vue**: Reusable component with TypeScript interfaces
  - Accepts title, description, features array, screenshot path, imagePosition prop
  - Phone frame mockup with decorative blur elements (primary-100 and blue-100)
  - Alternating layouts using grid-flow-dense and conditional col-start classes
- **PricingSection.vue**: Standalone pricing component
  - $20/month pricing with gradient background
  - 5 included features with green checkmarks
  - "Start Your Free Trial" CTA linking to /checkout-success
- **PickleballCoach.vue**: Full feature page implementation
  - Hero section with "Only $20/month" badge and dual CTAs
  - 4 FeatureSection components with alternating backgrounds (white, gray-50)
  - Feature grid with 8 icons: Smart Scheduling, Client Database, SMS & Email Reminders, Revenue Tracking, Mobile Apps, Booking URL & QR Code, Session Types, Session Packages
  - Bottom CTA section with gradient background (primary-600 to blue-600)
- **Screenshots**: 6 PNG files copied to public/assets/screenshots/
  - dashboard.png, calendar.png, clients.png, settings.png, session-types.png, availability.png
  - Renamed from simulator format for easier reference

### Notes
```
Feature section structure (implemented):
- Section container: container mx-auto px-6
- Grid: grid-cols-1 lg:grid-cols-2 gap-12
- Image: Phone frame mockup with rounded-[3rem] shadow-2xl
- Bullet points: space-y-4 with green checkmark SVG icons

Icons used (inline SVG):
- Dashboard: Chart/Graph icon
- Calendar: Calendar icon
- Clients: Users/People icon
- Settings: Gear/Cog icon
- Notifications: Bell icon
- Revenue: Dollar/Currency icon
- Mobile: Phone icon
- Links: Link icon
- Documents: File icon
- Checklist: Clipboard icon
```

---

## Phase 5: Stripe Subscription Integration
**Target**: Implement Stripe Checkout with monthly subscription plan and referral code support
**Status**: 🔴 Not Started
**Estimated Duration**: 2-3 days
**Reference**: Stripe sample code in `/stripe` directory, official Billing quickstart guide

### Tasks

#### Step 1: Stripe Dashboard Setup
- [ ] Create Product in Stripe Dashboard
  - [ ] Name: "Pickleball Coach Monthly"
  - [ ] Price: $20.00 USD
  - [ ] Billing period: Monthly
  - [ ] Assign lookup_key: `pickleball_monthly`
- [ ] (Optional) Enable additional payment methods
  - [ ] Apple Pay, Google Pay via Dashboard settings
  - [ ] Checkout will dynamically display based on customer location
- [ ] Create test product for development
  - [ ] Use test mode pricing

#### Step 2: Build Frontend (Vue.js)
- [ ] Update existing checkout buttons to call API
  - [ ] Replace all "Buy Now" / "Start Free Trial" RouterLinks
  - [ ] Update `src/components/PricingSection.vue`
  - [ ] Update `src/views/PickleballCoach.vue` CTAs
  - [ ] Update `src/components/HeroSection.vue` "Get Started" button
- [ ] Create checkout handler composable
  - [ ] `src/composables/useStripeCheckout.ts`
  - [ ] Handles POST to `/api/create-checkout-session`
  - [ ] Shows loading state during session creation
  - [ ] Redirects to Stripe hosted checkout
- [ ] (Optional) Add referral code input
  - [ ] Input field on pricing section
  - [ ] Validates format before checkout
  - [ ] Passes code to API endpoint
- [ ] Update `/checkout-success` view
  - [ ] Show subscription confirmation message
  - [ ] Display App Store download link
  - [ ] Add "Manage Billing" button → customer portal
  - [ ] Retrieve session_id from URL query params
- [ ] Create `/checkout-cancel` view (optional)
  - [ ] Simple page when user clicks back in Stripe Checkout

#### Step 3: Build Backend (Azure Functions - Node.js)
- [ ] Set up Azure Functions project structure
  - [ ] Create `/api` directory in project root
  - [ ] Initialize Node.js Azure Functions
  - [ ] Install dependencies: `stripe`, `@azure/functions`
- [ ] Create `/api/create-checkout-session` function
  - [ ] Accept POST request with `lookup_key` and optional `referral_code`
  - [ ] Initialize Stripe with secret API key (from environment variable)
  - [ ] Retrieve price using `stripe.prices.list({ lookup_keys: [lookup_key] })`
  - [ ] Create checkout session with:
    - [ ] `mode: 'subscription'`
    - [ ] `line_items` with retrieved price
    - [ ] `success_url` pointing to `/checkout-success?session_id={CHECKOUT_SESSION_ID}`
    - [ ] `cancel_url` pointing to `/checkout-cancel`
    - [ ] `billing_address_collection: 'auto'`
    - [ ] Optional: `metadata` for referral code tracking
  - [ ] Return session URL as JSON
- [ ] Create `/api/create-portal-session` function
  - [ ] Accept POST with `session_id`
  - [ ] Retrieve checkout session: `stripe.checkout.sessions.retrieve(session_id)`
  - [ ] Create portal session: `stripe.billingPortal.sessions.create({ customer_account })`
  - [ ] Return portal URL as JSON
- [ ] Create `/api/webhook` function
  - [ ] Use `express.raw()` middleware for signature verification
  - [ ] Get webhook secret from environment variables
  - [ ] Verify webhook signature: `stripe.webhooks.constructEvent()`
  - [ ] Handle events:
    - [ ] `customer.subscription.created` - Create user account, grant access
    - [ ] `customer.subscription.updated` - Update subscription status
    - [ ] `customer.subscription.deleted` - Revoke access
    - [ ] `customer.subscription.trial_will_end` - Send reminder email
    - [ ] `entitlements.active_entitlement_summary.updated` - Update entitlements
  - [ ] Return 200 response to acknowledge receipt

#### Step 4: Configuration & Environment Variables
- [ ] Add environment variables
  - [ ] `STRIPE_SECRET_KEY` - Stripe secret API key (test and live)
  - [ ] `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (frontend)
  - [ ] `STRIPE_WEBHOOK_SECRET` - Webhook signing secret
  - [ ] `SUCCESS_URL` - Full URL for success page
  - [ ] `CANCEL_URL` - Full URL for cancel page
- [ ] Configure Azure Static Web Apps to include `/api` folder
  - [ ] Update `staticwebapp.config.json` or GitHub Actions workflow
  - [ ] Set environment variables in Azure portal

#### Step 5: Testing
- [ ] Test locally using Stripe CLI
  - [ ] Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
  - [ ] Login: `stripe login`
  - [ ] Forward webhooks: `stripe listen --forward-to localhost:7071/api/webhook`
  - [ ] Get webhook signing secret from CLI output
- [ ] Test checkout flow with test cards
  - [ ] Success: `4242 4242 4242 4242`
  - [ ] Requires authentication: `4000 0025 0000 3155`
  - [ ] Declined: `4000 0000 0000 9995`
- [ ] Verify webhook events fire correctly
  - [ ] Check Azure Functions logs
  - [ ] Verify database records created
- [ ] Test customer portal
  - [ ] Verify customers can update payment methods
  - [ ] Test subscription cancellation flow

### Acceptance Criteria
- ✅ Product and price created in Stripe Dashboard with lookup_key
- ✅ Clicking "Buy Now" calls Azure Function to create checkout session
- ✅ Customer redirects to Stripe-hosted checkout page
- ✅ Successful payment redirects to `/checkout-success`
- ✅ Webhook receives and verifies subscription events
- ✅ User account created in database on successful subscription
- ✅ Customer portal allows subscription management
- ✅ Test cards work correctly in test mode
- ✅ Referral code (if provided) tracked in metadata

### Notes
```
Architecture:
- Frontend (Vue.js) → API (Azure Functions) → Stripe API
- Stripe → Webhook (Azure Function) → Database

Stripe Checkout flow:
1. User clicks "Buy Now" → Vue app calls /api/create-checkout-session
2. Azure Function retrieves price by lookup_key
3. Azure Function creates Stripe checkout session
4. Customer redirects to Stripe hosted checkout (session.url)
5. Customer completes payment on Stripe
6. Stripe redirects to /checkout-success?session_id=xxx
7. Stripe sends webhook event to /api/webhook
8. Webhook creates user account and activates subscription
9. User can manage billing via /api/create-portal-session

Sample code location:
- /stripe/server.js - Express server (adapt to Azure Functions)
- /stripe/public/*.html - HTML pages (adapt to Vue components)

Test cards:
- Success: 4242 4242 4242 4242
- 3D Secure: 4000 0025 0000 3155
- Declined: 4000 0000 0000 9995

Webhook secret:
- Test mode: Get from Stripe CLI during local testing
- Live mode: Get from Stripe Dashboard → Webhooks

lookup_key benefits:
- No need to hardcode price IDs in frontend code
- Can update prices in Dashboard without code changes
- Use same code for test and production

Optional enhancements (Phase 2):
- Add trial period to checkout session
- Automate tax collection with Stripe Tax
- Apply referral code discounts via Coupons API
- Send welcome email on subscription creation
```

---

## Phase 6: Referral Code System & Tracking
**Target**: Build referral code management system for commission tracking
**Status**: 🔴 Not Started
**Estimated Duration**: 2 days

### Tasks
- [ ] Create `ReferralCodes` database table
  - [ ] Columns: id, code, coachId, discountPercent, timesUsed, totalRevenue, isActive, createdAt
- [ ] Create `Referrals` database table
  - [ ] Columns: id, referralCodeId, subscriberId, subscriptionId, revenueGenerated, commissionOwed, status, createdAt
- [ ] Build `/api/validate-referral-code` endpoint
  - [ ] Check if code exists and is active
  - [ ] Return discount amount
- [ ] Update checkout webhook to track referral
  - [ ] On subscription created, insert into Referrals table
  - [ ] Link to ReferralCode, store subscription amount
  - [ ] Calculate commission owed (e.g., 20% of first month)
- [ ] Create admin dashboard view (in main coaching app)
  - [ ] List all referral codes with usage stats
  - [ ] Show revenue generated per code
  - [ ] Commission payout status
- [ ] Generate unique referral codes for each coach
  - [ ] Format: `COACH-XXXXX` or custom slug
  - [ ] Validate uniqueness

### Acceptance Criteria
- Referral codes can be created and stored in database
- Valid codes apply discount during checkout
- Successful referrals are recorded with subscription details
- Commission amounts are calculated and tracked
- Admin can view referral performance metrics
- Payouts can be marked as completed

### Notes
```
Commission structure example:
- Standard: 20% of first month subscription
- Lifetime: 10% of all subscription renewals (Phase 2)

Referral code validation:
- Case-insensitive
- Alphanumeric only
- Minimum 5 characters
- Must be active (isActive = true)
```

---

## Phase 7: FAQ, Legal Pages, and Contact
**Target**: Complete informational and legal pages required for launch
**Status**: 🔴 Not Started
**Estimated Duration**: 1-2 days

### Tasks
- [ ] Build `FAQ.vue` page
  - [ ] Create `FAQItem.vue` component (collapsible accordion)
  - [ ] Add 10-15 common questions:
    - [ ] "How does the subscription work?"
    - [ ] "Can I cancel anytime?"
    - [ ] "Do you offer refunds?"
    - [ ] "How do referral codes work?"
    - [ ] "Is there a free trial?"
    - [ ] "What features are included?"
    - [ ] "Can I use the app on multiple devices?"
    - [ ] "How do I get support?"
- [ ] Create `PrivacyPolicy.vue` page
  - [ ] Draft privacy policy (data collection, usage, cookies)
  - [ ] Include Stripe payment processing disclosure
  - [ ] GDPR/CCPA compliance statements
- [ ] Create `TermsOfService.vue` page
  - [ ] Subscription terms (billing, cancellation, refunds)
  - [ ] User conduct and prohibited uses
  - [ ] Intellectual property rights
  - [ ] Limitation of liability
- [ ] Build `Contact.vue` page
  - [ ] Contact form: name, email, subject, message
  - [ ] Submits to `/api/contact-form` endpoint
  - [ ] Shows success/error message
  - [ ] Alternative: Email link (support@schedulecoaches.com)
- [ ] Link legal pages in footer

### Acceptance Criteria
- FAQ items expand/collapse smoothly
- All questions are clearly answered
- Privacy Policy and Terms of Service are complete and legally sound
- Contact form successfully sends messages
- All pages are mobile-responsive
- Footer links navigate to correct pages

### Notes
```
Consider legal review before launch:
- Privacy Policy should be reviewed by legal counsel
- Terms of Service should define subscription terms clearly
- Ensure compliance with App Store requirements

Contact form API can use:
- Azure Functions with SendGrid for email
- Or direct mailto: link as MVP
```

---

## Phase 8: iOS App Authorization Integration
**Target**: Connect subscription status to iOS app authentication
**Status**: 🔴 Not Started
**Estimated Duration**: 2-3 days

### Tasks
- [ ] Add `subscriptionStatus` to Users table
  - [ ] Columns: userId, stripeCustomerId, stripeSubscriptionId, status, planType, currentPeriodEnd
- [ ] Create `/api/verify-subscription` endpoint
  - [ ] Input: userId or email
  - [ ] Query Stripe API for current subscription status
  - [ ] Return: isActive, planType, expiresAt
- [ ] Update coaching app authentication flow
  - [ ] After login, call `/api/verify-subscription`
  - [ ] If subscription inactive, show paywall
  - [ ] Redirect to schedulecoaches.com/buy
- [ ] Handle subscription lifecycle events
  - [ ] Active → allow full app access
  - [ ] Past due → grace period (7 days), show warning
  - [ ] Canceled → revoke access after current period ends
  - [ ] Reactivated → restore access immediately
- [ ] Add subscription management link in app
  - [ ] Deep link to Stripe customer portal
  - [ ] Allow users to update payment, cancel subscription
- [ ] Test subscription verification flow end-to-end

### Acceptance Criteria
- New subscribers gain immediate app access after payment
- Inactive subscriptions correctly block app access
- Subscription status updates propagate to app in real-time (or on next launch)
- Users can manage their subscription via Stripe portal
- Edge cases handled: expired cards, failed payments, cancellations

### Notes
```
Subscription verification flow:
1. User logs into iOS app
2. App calls /api/verify-subscription with JWT token
3. API checks database for subscription status
4. If inactive, return 403 with paywall message
5. If active, return 200 with subscription details

Grace period logic:
- Payment failed → status: 'past_due'
- Show warning in app: "Payment issue, update billing"
- After 7 days → status: 'inactive', revoke access
```

---

## Phase 9: SEO, Analytics, and Performance Optimization
**Target**: Optimize site for search engines, add analytics tracking, improve load times
**Status**: 🔴 Not Started
**Estimated Duration**: 1-2 days

### Tasks
- [ ] Add meta tags to all pages
  - [ ] Title, description, keywords
  - [ ] Open Graph tags for social sharing
  - [ ] Twitter Card tags
- [ ] Create `sitemap.xml`
  - [ ] List all public pages
  - [ ] Exclude admin/auth pages
- [ ] Add `robots.txt`
  - [ ] Allow all crawlers
  - [ ] Sitemap reference
- [ ] Implement Google Analytics 4
  - [ ] Track page views
  - [ ] Track "Buy Now" button clicks
  - [ ] Track checkout conversions
- [ ] Add Stripe conversion tracking
  - [ ] Fire event on successful checkout
- [ ] Optimize images
  - [ ] Convert to WebP format
  - [ ] Implement lazy loading
  - [ ] Add alt text for accessibility
- [ ] Optimize bundle size
  - [ ] Code splitting by route
  - [ ] Tree-shake unused libraries
  - [ ] Minify CSS and JS
- [ ] Add structured data (JSON-LD)
  - [ ] Organization schema
  - [ ] Product schema for Pickleball Coach
  - [ ] FAQPage schema

### Acceptance Criteria
- Lighthouse score > 90 on all metrics
- All pages have unique, descriptive meta tags
- Google Analytics successfully tracks events
- Images load quickly and are properly sized
- Sitemap is accessible and valid
- Site is fully accessible (WCAG 2.1 AA compliance)

### Notes
```
Key SEO keywords:
- Pickleball coaching software
- Tennis coaching app
- Coaching business management
- Schedule coaching sessions
- Client management for coaches

Use vue-meta or similar for dynamic meta tags
```

---

## Phase 10: Tennis Coach Teaser & Future Expansion
**Target**: Prepare Tennis Coach for future launch, add coming soon teaser
**Status**: 🔴 Not Started
**Estimated Duration**: 1 day

### Tasks
- [ ] Add Tennis Coach teaser card to homepage
  - [ ] Display tennis app screenshot
  - [ ] "Coming Soon" badge overlay
  - [ ] Newsletter signup form (optional)
- [ ] Create placeholder `/tennis-coach` route
  - [ ] Shows "Coming Soon" page
  - [ ] Highlights tennis-specific features
  - [ ] Email capture form for launch notification
- [ ] Prepare Tennis Coach Stripe product (inactive)
  - [ ] Mirror Pickleball pricing
  - [ ] Ready to activate on launch
- [ ] Document steps to launch Tennis Coach
  - [ ] Duplicate Pickleball feature page
  - [ ] Update sport-specific copy
  - [ ] Enable Stripe product
  - [ ] Update homepage to remove "Coming Soon"

### Acceptance Criteria
- Tennis Coach teaser visible on homepage
- "Coming Soon" badge clearly indicates future availability
- Placeholder page exists but shows unavailable status
- Documentation outlines quick launch process
- Email capture works if implemented

### Notes
```
Tennis Coach launch checklist:
1. Duplicate PickleballCoach.vue → TennisCoach.vue
2. Replace all "pickleball" references with "tennis"
3. Update screenshots (tennis app screens)
4. Activate Stripe product in dashboard
5. Update route and navigation
6. Remove "Coming Soon" badge
7. Deploy

Estimated time to launch Tennis after Pickleball: 4-6 hours
```

---

## Phase 11: Testing, QA, and Launch Prep
**Target**: Comprehensive testing across devices, browsers, and user flows
**Status**: 🔴 Not Started
**Estimated Duration**: 1-2 days

### Tasks
- [ ] Cross-browser testing
  - [ ] Chrome, Safari, Firefox, Edge
  - [ ] Mobile Safari (iOS), Chrome (Android)
- [ ] Responsive design testing
  - [ ] iPhone SE, iPhone 14 Pro, iPad, Desktop (1920x1080, 2560x1440)
- [ ] User flow testing
  - [ ] Homepage → Pickleball detail → Buy Now → Checkout → Success
  - [ ] Apply referral code and verify discount
  - [ ] Complete purchase and verify subscription activation
  - [ ] Login to iOS app and confirm access
- [ ] Form validation testing
  - [ ] Contact form, referral code input
- [ ] Link testing
  - [ ] All internal links navigate correctly
  - [ ] External links open in new tabs
- [ ] Accessibility testing
  - [ ] Keyboard navigation works
  - [ ] Screen reader compatibility
  - [ ] Color contrast ratios pass WCAG
- [ ] Performance testing
  - [ ] Measure page load times
  - [ ] Test on slow 3G connection
- [ ] Stripe testing
  - [ ] Use test card numbers
  - [ ] Verify webhook delivery
  - [ ] Test failed payments
- [ ] Create launch checklist
  - [ ] DNS configured
  - [ ] SSL certificate active
  - [ ] Analytics tracking verified
  - [ ] Stripe live mode enabled
  - [ ] Error monitoring set up (Sentry?)

### Acceptance Criteria
- Site works flawlessly on all tested browsers and devices
- All user flows complete successfully
- No broken links or console errors
- Forms validate properly and submit without issues
- Performance meets targets (< 3s load time)
- Stripe checkout works in test and live mode
- Ready for public launch

### Notes
```
Testing checklist:
- [ ] Desktop (Chrome, Safari, Firefox, Edge)
- [ ] Mobile (iOS Safari, Android Chrome)
- [ ] Tablet (iPad)
- [ ] All pages responsive
- [ ] All CTAs functional
- [ ] Forms submit correctly
- [ ] Checkout completes
- [ ] Subscription activates
- [ ] App access granted

Use BrowserStack or similar for cross-browser testing
```

---

## Summary

**Total Phases**: 11
**Estimated Total Duration**: 18-26 days
**Current Phase**: Phase 5 – Stripe Subscription Integration
**Overall Progress**: 36% (4/11 phases complete)

### Phase Status Legend
- 🔴 Not Started
- 🟡 In Progress
- 🟢 Complete
- 🔵 Blocked
- ⏭️ Skipped
- ⚫ Cancelled

### Risk Log
| Risk | Impact | Mitigation | Status |
|------|--------|------------|--------|
| Stripe webhook delivery failures | High | Implement retry logic, add monitoring, test thoroughly | Open |
| Referral code fraud/abuse | Medium | Rate limiting, code expiration, manual review of high-value referrals | Open |
| Subscription status sync lag with iOS app | Medium | Implement caching with TTL, webhook-triggered push notifications | Open |
| Legal compliance (GDPR, CCPA, App Store) | High | Legal review of Privacy Policy and Terms, ensure compliance before launch | Open |
| Domain DNS propagation delays | Low | Configure DNS 24-48 hours before launch | Open |
| Stripe live mode setup complexities | Medium | Complete Stripe onboarding early, test webhooks in test mode | Open |

### Decision Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-10-17 | Use Vue.js instead of Next.js | User preference for consistency with main app ecosystem |
| 2025-10-17 | Separate repository for marketing site | Clear separation of concerns, easier to manage different codebases |
| 2025-10-17 | Monthly subscription only (no annual initially) | Simplify MVP, can add annual pricing in Phase 2 |
| 2025-10-17 | Tennis Coach teaser only, full launch later | Focus resources on Pickleball Coach launch first |
| 2025-10-17 | Referral code system with commission tracking | Incentivize word-of-mouth growth, track for payouts |
| 2025-10-17 | Stripe hosted checkout (not embedded) | Faster implementation, PCI compliance handled by Stripe |

### Dependency Tracking
| Phase | Depends On | Blocks |
|-------|------------|--------|
| Phase 2 | Phase 1 | Phase 3, 4, 7, 10 |
| Phase 3 | Phase 2 | — |
| Phase 4 | Phase 2 | Phase 5 |
| Phase 5 | Phase 1, 4 | Phase 6, 8 |
| Phase 6 | Phase 5 | — |
| Phase 7 | Phase 2 | Phase 11 |
| Phase 8 | Phase 5, 6 | Phase 11 |
| Phase 9 | Phases 2-8 | Phase 11 |
| Phase 10 | Phase 4 | — |
| Phase 11 | Phases 1-10 | — |

---

**Next Action**: Create new Git repository `schedulecoaches-web` and initialize Vue.js project with Vite and Tailwind CSS.

---

## Additional Considerations

### Post-Launch Enhancements (Future Phases)
- Annual subscription pricing with discount (save 20%)
- Multi-currency support (USD, EUR, GBP, CAD)
- Lifetime referral commissions (ongoing revenue share)
- Affiliate dashboard for coaches to track referrals
- A/B testing for pricing and messaging
- Testimonials section with coach reviews
- Blog for SEO content marketing
- App Store/Google Play review aggregation
- Live chat support integration
- Localization for international markets

### Tech Stack Summary
- **Frontend**: Vue 3 (Composition API), TypeScript, Vue Router
- **Styling**: Tailwind CSS
- **Hosting**: Azure Static Web Apps
- **Backend**: Azure Functions (Node.js) for API endpoints
- **Database**: Existing SQL Server (share with coaching app)
- **Payments**: Stripe Checkout (hosted)
- **Analytics**: Google Analytics 4
- **Email**: SendGrid or Azure Communication Services
- **Version Control**: Git (separate repo from main app)

### Environment Variables Needed
```bash
# Development
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_API_BASE_URL=http://localhost:7071/api

# Production
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_API_BASE_URL=https://pbcoach-api-prd.azurewebsites.net/api
```

### Backend API Endpoints to Create
- `POST /api/create-checkout-session` - Initiate Stripe Checkout
- `POST /api/stripe-webhook` - Handle Stripe events
- `GET /api/verify-subscription` - Check subscription status
- `POST /api/validate-referral-code` - Validate and apply referral code
- `POST /api/contact-form` - Handle contact form submissions

### DNS Configuration
```
schedulecoaches.com → Azure Static Web App
www.schedulecoaches.com → Redirect to apex domain
```

### Success Metrics to Track
- Conversion rate (visits → purchases)
- Average time to purchase
- Referral code usage rate
- Subscription retention rate (monthly churn)
- Traffic sources (organic, referral, direct)
- Page bounce rates
- Mobile vs desktop conversions
