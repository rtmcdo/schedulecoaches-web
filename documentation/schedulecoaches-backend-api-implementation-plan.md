# Phased Implementation Plan: ScheduleCoaches Backend API

**Created**: 2025-10-20
**Feature**: ScheduleCoaches Backend API & Subscription Flow
**Status**: Ready to Start
**Approach**: Build Azure Static Web Apps managed functions to handle authentication, Stripe checkout, and subscription management. Use TypeScript and share database with pbcoach.

**Related Documentation:**
- [Website Implementation Plan](./schedulecoaches-website-plan.md) - Overall project context and frontend phases
- [Subscription Status Tracking](./SUBSCRIPTION_STATUS.md) - User roles and subscription lifecycle
- [Project Guidelines](../.claude/claude.md) - Development restrictions

## Overview

This backend API is part of the schedulecoaches.com project (see [Website Plan](./schedulecoaches-website-plan.md) for overall context and frontend implementation). The API handles the server-side components of user signup and subscription management.

**API Responsibilities:**
- Authenticate users via Entra ID tokens (Email/Google/Apple)
- Create stub coach accounts in the shared database (role: `coach_unpaid`)
- Generate Stripe checkout sessions for subscription payment ($20/month)
- Process Stripe webhooks to update accounts to `coach_paid` after successful payment
- Provide subscription status verification for the pbcoach mobile app

**Architecture:**
- **Platform**: Azure Static Web Apps managed functions (built into the static site)
- **Language**: TypeScript with Azure Functions v4 runtime
- **Database**: Shared SQL Server database with pbcoach (same Users table)
- **Location**: `/api` folder in schedulecoaches-web repository
- **Authentication**: Entra ID production tenant (pickleballcoach.onmicrosoft.com)

This ensures accounts created on schedulecoaches.com work seamlessly when users login to the pbcoach mobile app.

**Important Notes**:
- Do NOT modify pbcoach.vnext code - use only as reference
- Share database with pbcoach (same Users table)
- All code goes in schedulecoaches-web/api folder
- Use production Entra tenant (pickleballcoach)

---

## Phase 1: API Project Setup & Infrastructure
**Target**: Create API folder structure, configuration files, and install dependencies
**Status**: 🟢 Complete
**Estimated Duration**: 1-2 hours
**Actual Duration**: 2 hours
**Completed**: 2025-10-20

### Tasks
- [x] Create `/api` folder in schedulecoaches-web root
- [x] Initialize `package.json` with dependencies:
  - [x] @azure/functions v4
  - [x] stripe
  - [x] mssql
  - [x] jsonwebtoken
  - [x] jwks-rsa
  - [x] google-auth-library
  - [x] typescript & @types packages
- [x] Create `tsconfig.json` for TypeScript compilation
- [x] Create `host.json` for Azure Functions runtime config
- [x] Update `staticwebapp.config.json` to configure API routes
- [x] Create folder structure: `/api/src/{functions,utils,config,types}`
- [x] Create `src/app.ts` entry point to import all functions
- [x] Create `.env.example` and `.gitignore`
- [x] Create health check function for testing

### Acceptance Criteria
- ✅ `/api` folder exists with proper structure
- ✅ `npm install` runs without errors
- ✅ TypeScript compiles successfully
- ✅ Azure Functions Core Tools can run the API locally
- ✅ Health endpoint responds with 200 status

### Notes
```
Reference pbcoach-api structure but don't copy files directly
```

### Implementation Notes
- Created src/app.ts as entry point (imports all functions) - required for Azure Functions v4
- Added "main": "dist/app.js" to package.json for proper function discovery
- Node.js 20 required (specified in engines and used via Homebrew for local testing)
- Tested locally on port 7072 (port 7071 was in use)
- Health endpoint verified: GET http://localhost:7072/api/health returns 200 OK

---

## Phase 2: Database Connection & Utilities
**Target**: Set up database connection and shared utilities
**Status**: 🟢 Complete
**Estimated Duration**: 2-3 hours
**Actual Duration**: 2 hours
**Completed**: 2025-10-20

### Tasks
- [x] Create `/api/src/utils/database.ts` for SQL connection pooling
- [x] Create `/api/src/utils/auth.ts` for token verification
  - [x] Entra ID token verification
  - [x] Google OAuth token verification
  - [x] Apple token verification
- [x] Create `/api/src/config/auth.ts` for Entra configuration
- [x] Create `/api/src/middleware/cors.ts` for CORS headers
- [x] Create TypeScript types in `/api/src/types/user.ts`

### Acceptance Criteria
- ✅ Database connection works with shared SQL database
- ✅ Token verification functions work with production Entra tenant
- ✅ CORS properly configured for localhost:5173 and schedulecoaches.com
- ✅ Type definitions match database schema
- ✅ TypeScript compiles without errors

### Notes
```
Use pbcoach-api auth.ts as reference for token verification logic
Connection string should point to same database as pbcoach
```

### Implementation Notes
- **User types**: Added subscription-specific fields (stripeCustomerId, stripeSubscriptionId, subscriptionStatus, subscriptionEndDate)
- **User roles**: Defined 5 role types (coach_unpaid, coach_paid, coach_cancelled, coach_past_due, admin)
- **Database connection**: Uses SQL_CONNECTION_STRING format, parses connection string into config
- **Auth config**: Production Entra tenant (pickleballcoach.onmicrosoft.com), supports Google Sign-In
- **Token verification**: Auto-detects issuer (Entra/Google) and routes to appropriate verification
- **CORS**: Supports environment variable configuration via ALLOWED_ORIGINS, defaults to localhost and schedulecoaches.com
- **Security fixes applied**:
  - CORS: Properly rejects disallowed origins (does not return Access-Control-Allow-Origin for disallowed requests)
  - Apple Sign-In: Disabled until proper signature verification is implemented (rejects tokens with clear error)
  - Database logging: Masks sensitive credentials (server, database, user) in logs
  - Removed old functions.js file to avoid confusion

---

## Phase 3: Authentication Endpoint (/api/auth-me)
**Target**: Implement user authentication and stub account creation
**Status**: 🔴 Not Started
**Estimated Duration**: 3-4 hours
**Actual Duration**:

### Tasks
- [ ] Create `/api/src/functions/authMe.ts` function
- [ ] Extract Bearer token from Authorization header
- [ ] Verify token using auth utils
- [ ] Check if user exists in database by `entraAccountId`
- [ ] If not exists, create stub account:
  - [ ] role: 'coach_unpaid'
  - [ ] Extract email, firstName, lastName from token
  - [ ] Set needsProfileCompletion: true
  - [ ] Handle race conditions (concurrent requests)
- [ ] Return user object with subscription status
- [ ] Add error handling and logging

### Acceptance Criteria
- Endpoint returns 401 if no token provided
- Endpoint returns 401 if token invalid
- New users created with role 'coach_unpaid'
- Existing users returned with current data
- Returns needsProfileCompletion flag correctly
- Frontend auth callback completes successfully

### Notes
```
Test with actual Entra tokens from sign-up flow
Verify email from different providers (Entra, Google, Apple)
```

---

## Phase 4: Stripe Checkout Session Endpoint
**Target**: Create Stripe checkout sessions for subscription payment
**Status**: 🔴 Not Started
**Estimated Duration**: 2-3 hours
**Actual Duration**:

### Tasks
- [ ] Create `/api/src/functions/createCheckoutSession.ts`
- [ ] Authenticate user with token
- [ ] Accept `lookup_key` parameter (default: 'pickleball_monthly')
- [ ] Get Stripe price ID from lookup_key
- [ ] Create Stripe checkout session:
  - [ ] customer_email from user
  - [ ] metadata.user_id for webhook processing
  - [ ] success_url to /success page
  - [ ] cancel_url back to /sign-up
- [ ] Return checkout URL
- [ ] Add error handling for Stripe API failures

### Acceptance Criteria
- Authenticated users can create checkout sessions
- Checkout session includes user email pre-filled
- Metadata includes user_id for webhook matching
- Returns valid Stripe checkout URL
- Frontend successfully redirects to Stripe

### Notes
```
Use Stripe test mode for development
Verify success_url and cancel_url work correctly
```

---

## Phase 5: Stripe Webhook Handler
**Target**: Process Stripe events and update subscription status
**Status**: 🔴 Not Started
**Estimated Duration**: 3-4 hours
**Actual Duration**:

### Tasks
- [ ] Create `/api/src/functions/stripeWebhook.ts`
- [ ] Verify Stripe webhook signature
- [ ] Handle `checkout.session.completed`:
  - [ ] Update role to 'coach_paid'
  - [ ] Store stripeCustomerId and stripeSubscriptionId
  - [ ] Set subscriptionStatus to 'active'
- [ ] Handle `customer.subscription.updated`:
  - [ ] Update role based on status
  - [ ] Update subscriptionStatus and endDate
- [ ] Handle `customer.subscription.deleted`:
  - [ ] Update role to 'coach_cancelled'
- [ ] Handle `invoice.payment_failed`:
  - [ ] Update role to 'coach_past_due'
- [ ] Add comprehensive logging

### Acceptance Criteria
- Webhook signature verification works
- checkout.session.completed updates user to coach_paid
- Subscription updates change user status correctly
- Failed payments mark users as coach_past_due
- Webhook events logged for debugging
- Stripe CLI testing passes

### Notes
```
Use Stripe CLI for local webhook testing:
stripe listen --forward-to http://localhost:7071/api/stripe-webhook
```

---

## Phase 6: Database Schema Updates
**Target**: Add subscription tracking columns to Users table
**Status**: 🔴 Not Started
**Estimated Duration**: 1 hour
**Actual Duration**:

### Tasks
- [ ] Create migration script for Users table:
  - [ ] Add stripeCustomerId NVARCHAR(255)
  - [ ] Add stripeSubscriptionId NVARCHAR(255)
  - [ ] Add subscriptionStatus NVARCHAR(50)
  - [ ] Add subscriptionEndDate DATETIME2
- [ ] Test migration on development database
- [ ] Document rollback procedure

### Acceptance Criteria
- New columns added without breaking existing data
- NULL values allowed (for existing users)
- Indexes appropriate for query patterns
- Migration documented in /api/migrations folder

### Notes
```
Coordinate with pbcoach database schema
Run migration during low-traffic window
```

---

## Phase 7: Subscription Status Endpoint
**Target**: Allow users to check current subscription status
**Status**: 🔴 Not Started
**Estimated Duration**: 1-2 hours
**Actual Duration**:

### Tasks
- [ ] Create `/api/src/functions/subscriptionStatus.ts`
- [ ] Authenticate user with token
- [ ] Query user's subscription data from database
- [ ] Return:
  - [ ] role (coach_paid, coach_unpaid, etc.)
  - [ ] subscriptionStatus
  - [ ] subscriptionEndDate
  - [ ] stripeCustomerId (for portal link)
- [ ] Add caching headers

### Acceptance Criteria
- Returns accurate subscription status for authenticated users
- Returns 401 for unauthenticated requests
- Response includes all necessary fields for frontend
- Performance acceptable (<200ms)

### Notes
```
Frontend can poll this for real-time status updates
```

---

## Phase 8: Success Page Implementation
**Target**: Create post-payment success page with app download links
**Status**: 🔴 Not Started
**Estimated Duration**: 2-3 hours
**Actual Duration**:

### Tasks
- [ ] Create `/src/views/Success.vue` component
- [ ] Add route `/success` to router
- [ ] Design success page UI:
  - [ ] "Payment Successful!" header
  - [ ] "Your subscription is active" message
  - [ ] App Store download button/link
  - [ ] Google Play download button/link
  - [ ] Instructions: "Login with your credentials"
  - [ ] Support email link
  - [ ] Link to manage subscription (Stripe portal)
- [ ] Add confetti or success animation
- [ ] Make responsive (mobile, tablet, desktop)

### Acceptance Criteria
- Success page displays after Stripe checkout
- App Store and Google Play links work (placeholder URLs for now)
- Page is mobile-responsive
- Matches schedulecoaches.com design system
- Clear call-to-action to download app

### Notes
```
Get actual App Store / Google Play URLs when apps are published
Consider adding a "What's Next" checklist
```

---

## Phase 9: Environment Configuration
**Target**: Set up environment variables for all environments
**Status**: 🔴 Not Started
**Estimated Duration**: 1 hour
**Actual Duration**:

### Tasks
- [ ] Create `/api/.env.example` with all required variables
- [ ] Document environment variables in README
- [ ] Configure Azure Static Web App settings:
  - [ ] ENTRA_TENANT_ID (production)
  - [ ] ENTRA_CLIENT_ID (production)
  - [ ] ENTRA_TENANT_SUBDOMAIN (pickleballcoach)
  - [ ] STRIPE_SECRET_KEY
  - [ ] STRIPE_WEBHOOK_SECRET
  - [ ] SQL_CONNECTION_STRING
  - [ ] GOOGLE_CLIENT_IDS
- [ ] Create local `.env` file (not committed)
- [ ] Add `.env` to `.gitignore`

### Acceptance Criteria
- All environment variables documented
- Local development works with .env file
- Azure deployment has all required settings
- No secrets committed to git
- README explains how to configure

### Notes
```
Use different Stripe keys for dev/prod
SQL connection string same as pbcoach
```

---

## Phase 10: End-to-End Testing
**Target**: Test complete signup and payment flow
**Status**: 🔴 Not Started
**Estimated Duration**: 2-3 hours
**Actual Duration**:

### Tasks
- [ ] Test email signup flow:
  - [ ] Sign up with email on Entra
  - [ ] Verify auth callback works
  - [ ] Verify user created with role coach_unpaid
  - [ ] Complete Stripe checkout (test mode)
  - [ ] Verify webhook updates role to coach_paid
  - [ ] Verify success page displays
- [ ] Test Google signup flow
- [ ] Test Apple signup flow (if configured)
- [ ] Test error cases:
  - [ ] Invalid token
  - [ ] Stripe payment failure
  - [ ] Database connection failure
- [ ] Test subscription management:
  - [ ] Check subscription status
  - [ ] Cancel subscription
  - [ ] Verify role updates

### Acceptance Criteria
- Complete signup flow works end-to-end
- User can pay and become coach_paid
- All error cases handled gracefully
- Success page displays with correct data
- Logs show all events properly

### Notes
```
Use Stripe test cards for payment testing
Document any issues found
```

---

## Phase 11: Documentation & Deployment
**Target**: Document API and deploy to production
**Status**: 🔴 Not Started
**Estimated Duration**: 2-3 hours
**Actual Duration**:

### Tasks
- [ ] Write API documentation:
  - [ ] Endpoint descriptions
  - [ ] Request/response formats
  - [ ] Authentication requirements
  - [ ] Error codes
- [ ] Update main README with API information
- [ ] Create deployment checklist
- [ ] Deploy to Azure Static Web Apps:
  - [ ] Connect GitHub repository
  - [ ] Configure build settings
  - [ ] Set environment variables
  - [ ] Configure custom domain
- [ ] Test production deployment
- [ ] Monitor logs for errors

### Acceptance Criteria
- API fully documented
- Deployment automated via GitHub Actions
- Production environment configured correctly
- Custom domain working (schedulecoaches.com)
- Monitoring and logging enabled
- No errors in production logs

### Notes
```
Keep deployment separate from pbcoach infrastructure
Monitor for first few days after launch
```

---

## Summary

**Total Phases**: 11
**Estimated Total Duration**: 3-5 days
**Current Phase**: Phase 3 (Ready to Start)
**Overall Progress**: 18% (2/11 phases)
**Last Updated**: 2025-10-20

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
| Database schema conflicts with pbcoach | High | Coordinate schema changes, test thoroughly | Open |
| Stripe webhook signature verification issues | Medium | Use Stripe CLI for testing, verify secret | Open |
| CORS issues with production domain | Medium | Test CORS headers early, use wildcards carefully | Open |
| Entra token verification failures | High | Use same verification logic as pbcoach | Open |

### Decision Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-10-20 | Use Azure Static Web Apps managed functions | Built-in, simpler than separate API app |
| 2025-10-20 | Share database with pbcoach | Single source of truth for user accounts |
| 2025-10-20 | Initial role: coach_unpaid | Prevents app access until payment confirmed |
| 2025-10-20 | Do not modify pbcoach.vnext | Separation of concerns, reference only |

### Dependency Tracking
| Phase | Depends On | Blocks |
|-------|------------|--------|
| Phase 2 | Phase 1 | Phase 3, 4, 5, 7 |
| Phase 3 | Phase 2 | Phase 10 |
| Phase 4 | Phase 2 | Phase 10 |
| Phase 5 | Phase 2, 6 | Phase 10 |
| Phase 6 | None (can run parallel) | Phase 5 |
| Phase 7 | Phase 2, 6 | Phase 10 |
| Phase 8 | None (can run parallel) | Phase 10 |
| Phase 9 | None (can run parallel) | Phase 11 |
| Phase 10 | All phases 1-9 | Phase 11 |
| Phase 11 | Phase 10 | None |

---

**Next Action**: Begin Phase 1 - Create `/api` folder structure and initialize npm project

---

**Implementation Strategy**: Build incrementally, test each phase independently, and maintain separation from pbcoach codebase. Use pbcoach-api as reference but implement fresh code in schedulecoaches-web/api. Prioritize authentication (Phase 3) and Stripe integration (Phases 4-5) as these are critical path.
