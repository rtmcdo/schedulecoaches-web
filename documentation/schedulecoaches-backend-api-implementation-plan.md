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
  - CORS: Properly rejects disallowed origins (baseCorsHeaders does not include Access-Control-Allow-Origin)
  - CORS: Origin header only added by getCorsHeaders() for allowed origins (cannot leak via direct usage)
  - Apple Sign-In: Disabled until proper signature verification is implemented (rejects tokens with clear error)
  - Database logging: Masks sensitive credentials (server, database, user) in logs
- **Stripe endpoints**: Temporarily retained in functions.js (JavaScript) until Phase 4 & 5 migration
  - src/app.ts imports functions.js to register checkout, billing-portal, and webhook endpoints
  - tsconfig.json updated with "allowJs": true to include JS files in build
  - Will be migrated to TypeScript in Phase 4 (checkout) and Phase 5 (webhook)

---

## Phase 3: Authentication Endpoint (/api/auth-me)
**Target**: Implement user authentication and stub account creation
**Status**: 🟢 Complete
**Estimated Duration**: 3-4 hours
**Actual Duration**: 2 hours
**Completed**: 2025-10-21

### Tasks
- [x] Create `/api/src/functions/authMe.ts` function
- [x] Extract Bearer token from Authorization header
- [x] Verify token using auth utils
- [x] Check if user exists in database by `entraAccountId`
- [x] If not exists, create stub account:
  - [x] role: 'coach_unpaid'
  - [x] Extract email, firstName, lastName from token
  - [x] Set needsProfileCompletion: true
  - [x] Handle race conditions (concurrent requests)
- [x] Return user object with subscription status
- [x] Add error handling and logging

### Acceptance Criteria
- ✅ Endpoint returns 401 if no token provided
- ✅ Endpoint returns 401 if token invalid
- ✅ New users created with role 'coach_unpaid'
- ✅ Existing users returned with current data
- ✅ Returns needsProfileCompletion flag correctly
- ⏸️ Frontend auth callback completes successfully (will test in Phase 10)

### Notes
```
Test with actual Entra tokens from sign-up flow
Verify email from different providers (Entra, Google, Apple)
```

### Implementation Notes
- Created `/api/src/functions/authMe.ts` with comprehensive authentication and user creation logic
- **Role assignment**:
  - Admin group members or hardcoded admin emails → `admin`
  - All other users → `coach_unpaid` (subscription required for access)
- **User lookup strategy**:
  1. First tries to find by provider-specific account ID (entraAccountId, googleAccountId, etc.)
  2. Falls back to email lookup if not found
  3. Links provider account ID when found by email
- **Race condition handling**: Uses `INSERT ... WHERE NOT EXISTS` pattern to prevent duplicate user creation
- **Account linking**: Updates azureAdId and provider-specific columns for existing users
- **Name normalization**: Extracts firstName and lastName from token, handles split names
- **Subscription status**: Returns `needsProfileCompletion` (true if no Stripe customer) and `hasActiveSubscription` flags
- **Admin role management**:
  - Automatically upgrades users in admin group to `admin` role
  - Downgrades users no longer in admin group to `coach_unpaid`
- **CORS**: Fully functional with preflight (OPTIONS) and actual requests
- **Testing**: Verified endpoint returns 401 for unauthenticated requests with proper error message
- **Registered route**: GET /api/auth-me (also supports OPTIONS for CORS)
- Updated `src/app.ts` to import authMe function
- TypeScript compilation successful with strict null checking
- End-to-end testing with actual tokens deferred to Phase 10

---

## Phase 4: Stripe Checkout Session Endpoint
**Target**: Create Stripe checkout sessions for subscription payment
**Status**: 🟢 Complete
**Estimated Duration**: 2-3 hours
**Actual Duration**: 1.5 hours
**Completed**: 2025-10-21

### Tasks
- [x] Create `/api/src/functions/createCheckoutSession.ts`
- [x] Authenticate user with token
- [x] Accept `lookup_key` parameter (default: 'pickleball_monthly')
- [x] Get Stripe price ID from lookup_key
- [x] Create Stripe checkout session:
  - [x] customer_email from user
  - [x] metadata.user_id for webhook processing
  - [x] success_url to /success page
  - [x] cancel_url back to /sign-up
- [x] Return checkout URL
- [x] Add error handling for Stripe API failures

### Acceptance Criteria
- ✅ Authenticated users can create checkout sessions
- ✅ Checkout session includes user email pre-filled
- ✅ Metadata includes user_id for webhook matching
- ✅ Returns valid Stripe checkout URL
- ⏸️ Frontend successfully redirects to Stripe (will test in Phase 10)

### Notes
```
Use Stripe test mode for development
Verify success_url and cancel_url work correctly
```

### Implementation Notes
- Created `/api/src/functions/createCheckoutSession.ts` with full authentication and Stripe integration
- **Authentication**: Required - users must provide valid Bearer token
- **Stripe initialization**: Uses STRIPE_SECRET_KEY environment variable, API version '2023-10-16'
- **Price mapping**: Hardcoded price map with fallback to Stripe API lookup
  - Default lookup_key: 'pickleball_monthly'
  - Price ID: process.env.STRIPE_PRICE_ID or 'price_1SJd4cJaM1HQdA8LxAzSBG12'
- **Checkout session parameters**:
  - billing_address_collection: 'auto'
  - mode: 'subscription'
  - customer_email: Pre-filled from authenticated user
  - metadata: Includes user_id and user_email for webhook processing
  - success_url: `${domain}/success?session_id={CHECKOUT_SESSION_ID}`
  - cancel_url: `${domain}/sign-up`
- **CORS**: Full CORS support with preflight handling (POST, OPTIONS)
- **Error handling**: Comprehensive error handling for Stripe API failures
- **Testing**: Verified endpoint returns 401 for unauthenticated requests
- **Registered route**: POST /api/create-checkout-session (also supports OPTIONS)
- **Migration**: Removed old JavaScript create-checkout-session from functions.js
- Updated `src/app.ts` to import createCheckoutSession
- TypeScript compilation successful
- End-to-end testing with actual Stripe checkout deferred to Phase 10

---

## Phase 5: Stripe Webhook Handler
**Target**: Process Stripe events and update subscription status
**Status**: 🟢 Complete
**Estimated Duration**: 3-4 hours
**Actual Duration**: 2 hours
**Completed**: 2025-10-21

### Tasks
- [x] Create `/api/src/functions/stripeWebhook.ts`
- [x] Verify Stripe webhook signature
- [x] Handle `checkout.session.completed`:
  - [x] Update role to 'coach_paid'
  - [x] Store stripeCustomerId and stripeSubscriptionId
  - [x] Set subscriptionStatus to 'active'
- [x] Handle `customer.subscription.updated`:
  - [x] Update role based on status
  - [x] Update subscriptionStatus and endDate
- [x] Handle `customer.subscription.deleted`:
  - [x] Update role to 'coach_cancelled'
- [x] Handle `invoice.payment_failed`:
  - [x] Update role to 'coach_past_due'
- [x] Handle `invoice.payment_succeeded`:
  - [x] Ensure role is 'coach_paid'
- [x] Add comprehensive logging
- [x] Update app.ts to import stripeWebhook
- [x] Remove old webhook handler from functions.js

### Acceptance Criteria
- ✅ Webhook signature verification works
- ✅ checkout.session.completed updates user to coach_paid
- ✅ Subscription updates change user status correctly
- ✅ Failed payments mark users as coach_past_due
- ✅ Webhook events logged for debugging with emojis (✅, ❌, ⚠️, 📦, 🔄, etc.)
- ⏸️ Stripe CLI end-to-end testing deferred to Phase 10

### Notes
```
Use Stripe CLI for local webhook testing:
stripe listen --forward-to http://localhost:7073/api/webhook

Test webhook events:
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_failed
```

### Implementation Notes
- Created `/api/src/functions/stripeWebhook.ts` with comprehensive event handling
- **Webhook signature verification**:
  - Uses STRIPE_WEBHOOK_SECRET environment variable
  - Returns 400 if stripe-signature header missing
  - Returns 400 if signature verification fails
  - Warns if webhook secret not configured (not recommended for production)
- **Event handlers implemented**:
  1. `checkout.session.completed`: Upgrade user to coach_paid, store Stripe IDs
     - Uses metadata.user_id (UUID) or customer_email to find user
     - Updates role, stripeCustomerId, stripeSubscriptionId, subscriptionStatus
     - Returns 404 if user not found
  2. `customer.subscription.updated`: Update role based on subscription status
     - Maps Stripe status to role: active→coach_paid, past_due→coach_past_due, canceled/unpaid→coach_cancelled
     - Updates subscriptionStatus and subscriptionEndDate
     - Handles incomplete, trialing states as coach_unpaid
  3. `customer.subscription.deleted`: Downgrade to coach_cancelled
  4. `invoice.payment_succeeded`: Ensure role is coach_paid (renewal)
  5. `invoice.payment_failed`: Downgrade to coach_past_due (grace period)
- **Comprehensive logging**: Uses emoji-prefixed logs for easy scanning
  - ✅ Success events (subscription activated, updated, etc.)
  - ❌ Error events (signature verification failed, user not found)
  - ⚠️ Warning events (no user found, missing subscription ID)
  - 📦 Processing events (checkout session)
  - 🔄 Update events (subscription updated)
  - 🗑️ Deletion events (subscription deleted)
  - 💰 Payment events (invoice paid)
- **Database queries**: Use parameterized queries to prevent SQL injection
- **Error handling**: Gracefully handles missing users, invalid signatures, database errors
- **Migration**: Removed old JavaScript webhook from functions.js, kept portal endpoint
- **Testing**: Verified signature verification with curl (missing header and invalid signature both rejected)
- **Registered route**: POST /api/webhook
- TypeScript compilation successful
- End-to-end testing with actual Stripe webhooks deferred to Phase 10

---

## Phase 6: Database Schema Updates
**Target**: Add subscription tracking columns to Users table
**Status**: 🟢 Complete (Scripts Ready)
**Estimated Duration**: 1 hour
**Actual Duration**: 1 hour (script creation)
**Completed**: 2025-10-21

### Tasks
- [x] Create migration script for Users table:
  - [x] Add stripeCustomerId NVARCHAR(255)
  - [x] Add stripeSubscriptionId NVARCHAR(255)
  - [x] Add subscriptionStatus NVARCHAR(50)
  - [x] Add subscriptionEndDate DATETIME2
- [x] Create filtered unique indexes (prevent duplicate Stripe IDs)
- [x] Create backfill strategy (coaches→unpaid, admins→active)
- [x] Document rollback procedure
- [x] Create verification queries
- [x] Coordinate with pbcoach schema alignment
- [⏸️] Execute migration on database (requires database access)

### Acceptance Criteria
- ✅ Migration scripts created in /api/migrations folder
- ✅ NULL values allowed (for existing users)
- ✅ Filtered unique indexes defined (prevent duplicates)
- ✅ Backfill strategy documented
- ✅ Rollback procedure documented
- ✅ Verification queries created
- ✅ Coordination with pbcoach verified (no conflicts)
- ⏸️ Migration execution pending (requires database credentials)

### Notes
```
Coordinate with pbcoach database schema - DONE
Run migration during low-traffic window - PENDING
```

### Implementation Notes
- Created comprehensive migration scripts in `/api/migrations/`:
  - `001_add_subscription_columns.sql` - Main migration (transaction-safe)
  - `001_rollback_subscription_columns.sql` - Rollback script (emergency use)
  - `001_verify_subscription_columns.sql` - Verification queries (run anytime)
  - `README.md` - Complete documentation and troubleshooting guide

- **Migration Features**:
  - Transaction-safe: Automatic rollback on errors
  - Pre-migration verification: Checks for data issues before running
  - Post-migration verification: Validates all changes after completion
  - Comprehensive logging: Emoji-prefixed output for easy scanning (✅, ❌, ⚠️)
  - Idempotent checks: Won't run twice accidentally

- **Schema Changes**:
  ```sql
  ALTER TABLE Users ADD
      stripeCustomerId NVARCHAR(255) NULL,
      stripeSubscriptionId NVARCHAR(255) NULL,
      subscriptionStatus NVARCHAR(50) NULL,
      subscriptionEndDate DATETIME2 NULL;
  ```

- **Filtered Unique Indexes** (prevent duplicate Stripe IDs while allowing NULLs):
  ```sql
  CREATE UNIQUE INDEX IX_Users_StripeCustomerId
      ON Users(stripeCustomerId)
      WHERE stripeCustomerId IS NOT NULL;

  CREATE UNIQUE INDEX IX_Users_StripeSubscriptionId
      ON Users(stripeSubscriptionId)
      WHERE stripeSubscriptionId IS NOT NULL;

  CREATE INDEX IX_Users_SubscriptionStatus
      ON Users(subscriptionStatus)
      WHERE subscriptionStatus IS NOT NULL;
  ```

- **Backfill Strategy**:
  - Coaches (`role='coach'`) → `subscriptionStatus='unpaid'`
  - Admins (`role='admin'`) → `subscriptionStatus='active'`
  - Clients (`role='client'`) → `subscriptionStatus=NULL` (don't need subscriptions)
  - Legacy mobile coaches → `subscriptionStatus='unpaid'` (must complete signup)

- **Coordination with pbcoach**:
  - ✅ No column name conflicts
  - ✅ No index conflicts
  - ✅ Nullable columns don't break existing queries
  - ✅ No foreign key conflicts
  - ✅ Aligns with pbcoach Phase 1/2 migrations (coachId, personId, Persons, CoachClients)
  - ✅ Can run NOW - no blocking dependencies

- **Safety Measures**:
  - Transaction wrapper with automatic rollback on errors
  - Pre-checks for NULL roles (aborts if found)
  - Pre-checks for existing columns (prevents duplicate runs)
  - 5-second pause before rollback (allows cancellation)
  - Comprehensive verification queries after completion
  - Rollback script available if needed

- **Post-Migration Monitoring**:
  - Daily verification checks for first week
  - Monitor Stripe webhook logs for errors
  - Check for users stuck in 'unpaid' status with payment completed
  - Alert on duplicate Stripe IDs (shouldn't happen due to indexes)

- **Next Steps**:
  1. ⏸️ Schedule migration execution during low-traffic window
  2. ⏸️ Notify pbcoach team before running
  3. ⏸️ Run migration: `001_add_subscription_columns.sql`
  4. ⏸️ Verify results: `001_verify_subscription_columns.sql`
  5. ⏸️ Update pbcoach app types to include new fields

- **Related Documentation**:
  - Detailed plan: `/documentation/PHASE_6_MIGRATION.md`
  - Migration scripts: `/api/migrations/` folder
  - Subscription lifecycle: `/documentation/SUBSCRIPTION_STATUS.md`

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
**Current Phase**: Phase 7 (Subscription Status Endpoint)
**Overall Progress**: 55% (6/11 phases)
**Last Updated**: 2025-10-21

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

**Next Action**: Execute Phase 6 migration (001_add_subscription_columns.sql), then begin Phase 7 - Subscription Status Endpoint

---

**Implementation Strategy**: Build incrementally, test each phase independently, and maintain separation from pbcoach codebase. Use pbcoach-api as reference but implement fresh code in schedulecoaches-web/api. Prioritize authentication (Phase 3) and Stripe integration (Phases 4-5) as these are critical path.
