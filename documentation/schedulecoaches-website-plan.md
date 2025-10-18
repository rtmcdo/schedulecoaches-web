# ScheduleCoaches.com Marketing Website - Implementation Plan

**Created**: 2025-10-17
**Last Updated**: 2025-10-18
**Feature**: Public-facing marketing website for Pickleball Coach and Tennis Coach apps
**Status**: 🟡 In Progress - Phase 1 Complete
**Approach**: Build a Vue.js static website with Tailwind CSS, mirroring Pickleball Journal's clean design, integrating Stripe subscriptions with referral tracking, and deploying to Azure Static Web Apps

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
  - [x] Navigation links: Home, Pickleball Coach, FAQ, Contact
  - [x] "Buy Now" CTA button (right side, prominent)
  - [x] Mobile hamburger menu with slide-out drawer
- [x] Build `FooterNav.vue` component
  - [x] Links to Privacy Policy, Terms of Service, Contact
  - [x] Social media icons (Facebook, Instagram)
  - [x] Copyright notice (JRM Software LLC)
- [x] Vue Router routes implemented (completed in Phase 1):
  - [x] `/` - Home
  - [x] `/pickleball-coach` - Pickleball Coach detail page
  - [x] `/faq` - FAQ page
  - [x] `/contact` - Contact/Support page
  - [x] `/privacy-policy` - Privacy Policy
  - [x] `/terms-of-service` - Terms of Service
- [x] Add smooth scroll behavior for anchor links
- [x] Implement responsive breakpoints matching pbjournal

### Acceptance Criteria
- Header sticky on scroll with subtle shadow
- Navigation works on desktop and mobile (hamburger menu)
- All routes render without errors
- Footer displays correctly on all pages
- Responsive design tested on mobile, tablet, desktop

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
**Status**: 🔴 Not Started
**Estimated Duration**: 1-2 days

### Tasks
- [ ] Build `HeroSection.vue` component
  - [ ] Large headline: "Manage Your Coaching Business"
  - [ ] Subheadline highlighting Pickleball & Tennis coaching
  - [ ] Two prominent sport cards:
    - [ ] **Pickleball Coach** - "Learn More" button → `/pickleball-coach`
    - [ ] **Tennis Coach** - "Coming Soon" badge, teaser screenshot
  - [ ] Visual: Screenshots of both apps side-by-side
- [ ] Add gradient background or subtle pattern
- [ ] Implement hover effects on sport cards
- [ ] Add hero section animations (fade-in on load)
- [ ] Optimize images for web (WebP format, lazy loading)
- [ ] Ensure mobile-responsive layout (cards stack vertically)

### Acceptance Criteria
- Hero section loads with smooth animations
- Sport cards clearly distinguish active (Pickleball) vs coming soon (Tennis)
- Images load quickly and display correctly
- Layout adapts gracefully on all screen sizes
- "Learn More" button navigates to Pickleball Coach detail page

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
**Status**: 🔴 Not Started
**Estimated Duration**: 2-3 days

### Tasks
- [ ] Create `PickleballCoach.vue` view
- [ ] Build `FeatureSection.vue` reusable component
  - [ ] Props: title, description, bulletPoints[], screenshot, imagePosition (left/right)
  - [ ] Alternating left/right image layout
  - [ ] 4 bullet points with colored icons (Dashboard, Calendar, Clients, Settings)
- [ ] Implement four main feature sections:
  - [ ] **Dashboard** - Revenue tracking, upcoming sessions, statistics
  - [ ] **Calendar** - Schedule management, availability, blocked times
  - [ ] **Clients** - Client database, contact info, session history
  - [ ] **Settings** - Locations, session types, pricing, coach profile
- [ ] Add hero section at top with app icon and tagline
- [ ] Build `FeatureGrid.vue` - overview grid with 6-8 icons
- [ ] Add multiple "Buy Now" CTAs throughout page
- [ ] Include app screenshots (user will provide)
  - [ ] 4 main feature screenshots
  - [ ] Additional UI showcase images

### Acceptance Criteria
- Feature sections alternate left/right screenshot positioning
- Bullet points display with appropriate icons (calendar, users, dollar-sign, settings)
- All screenshots render with proper aspect ratio
- "Buy Now" CTAs are prominent and consistent
- Page is fully responsive on mobile
- User can provide screenshots and content is easily swappable

### Notes
```
Feature section structure (mirror pbjournal):
- Section container: max-w-6xl mx-auto
- Grid: grid-cols-1 lg:grid-cols-2 gap-12
- Image: rounded-lg shadow-xl
- Bullet points: space-y-4 with icon + text

Icons to use (react-icons or similar):
- Dashboard: FaChartLine
- Calendar: FaCalendar
- Clients: FaUsers
- Settings: FaCog
```

---

## Phase 5: Stripe Subscription Integration
**Target**: Implement Stripe Checkout with monthly subscription plan and referral code support
**Status**: 🔴 Not Started
**Estimated Duration**: 2-3 days

### Tasks
- [ ] Set up Stripe account configuration
  - [ ] Create product: "Pickleball Coach Monthly"
  - [ ] Set monthly price (define pricing)
  - [ ] Configure payment methods (card, Apple Pay, Google Pay)
- [ ] Create backend API endpoint (Azure Function or App Service)
  - [ ] `/api/create-checkout-session` - Initiates Stripe Checkout
    - [ ] Accept: `productType` ('pickleball' | 'tennis'), `referralCode` (optional)
    - [ ] Validate referral code against database
    - [ ] Apply discount if valid referral code
    - [ ] Return Stripe Checkout session ID
  - [ ] `/api/stripe-webhook` - Handle Stripe events
    - [ ] `checkout.session.completed` - Create user account, activate subscription
    - [ ] `customer.subscription.updated` - Update subscription status
    - [ ] `customer.subscription.deleted` - Deactivate subscription
- [ ] Build `BuyNowButton.vue` component
  - [ ] Accepts `productType` prop
  - [ ] Shows loading state during checkout session creation
  - [ ] Redirects to Stripe Checkout
- [ ] Add referral code input on checkout page
  - [ ] Validates code before checkout
  - [ ] Shows discount amount if valid
  - [ ] Passes code to checkout session creation
- [ ] Create success page `/checkout-success`
  - [ ] Shows subscription confirmation
  - [ ] Displays iOS app download link
  - [ ] Provides login credentials or magic link

### Acceptance Criteria
- Clicking "Buy Now" initiates Stripe Checkout
- Checkout session includes monthly subscription plan
- Valid referral codes apply discount correctly
- Webhook successfully creates user account on payment completion
- User receives email with app download link and login instructions
- Subscription status syncs with database for app authorization

### Notes
```
Stripe Checkout flow:
1. User clicks "Buy Now" → Frontend calls /api/create-checkout-session
2. API validates referral code, creates Stripe session with metadata
3. User redirected to Stripe Checkout (hosted)
4. Payment completed → Stripe webhook fires
5. Webhook creates user in database with subscription status
6. User redirected to /checkout-success with next steps

Referral metadata to track:
- referralCode (who referred)
- subscriptionId (Stripe subscription ID)
- createdAt (for commission calculation)
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
**Current Phase**: Phase 3 – Homepage Hero & Sport Selection
**Overall Progress**: 18% (2/11 phases complete)

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
