# Implementation Plan Updates (2025-10-20)

This document outlines the updates needed to align the website plan with the new backend API implementation plan and correct outdated information.

## Documents Updated
1. `schedulecoaches-website-plan.md` - Main website implementation plan
2. `schedulecoaches-backend-api-implementation-plan.md` - Backend API detailed plan

## Key Clarifications

### Architecture
- **schedulecoaches.com** = Marketing website + Backend API + Subscription checkout
- **pbcoach mobile app** = iOS/Android app for coaches (separate codebase in pbcoach.vnext)
- **Shared database** = Both systems use same SQL Server and Users table
- **Separate backends** = schedulecoaches has its own `/api` folder, pbcoach has its own API

### Updated User Flow
**Old (incorrect)**: User → Stripe → Account created after payment
**New (correct)**: User → Entra ID auth → Account created (`coach_unpaid`) → Stripe → Webhook updates to `coach_paid` → App access granted

### Cross-References Added
- Website Plan Phase 5 now references Backend API Implementation Plan for detailed backend tasks
- Backend API Plan references Website Plan for overall context
- Both reference SUBSCRIPTION_STATUS.md for role/lifecycle details

## Updates to Website Plan

### Header Section
```markdown
**Last Updated**: 2025-10-20 (was 2025-10-18)
**Feature**: Public-facing marketing website and subscription platform for pbcoach mobile app
**Approach**: ...Azure Static Web Apps managed functions for backend API, integrating Entra ID authentication...

**Related Documentation:**
- [Backend API Implementation Plan](./schedulecoaches-backend-api-implementation-plan.md)
- [Subscription Status Tracking](./SUBSCRIPTION_STATUS.md)
- [Project Guidelines](../.claude/claude.md)
```

### Overview Section - Complete User Journey
Add detailed 11-step flow:
1. Visit site, view features
2. Click "Start Free Trial" → Entra ID signup
3. Backend creates account (role: `coach_unpaid`)
4. Redirect to Stripe ($20/month)
5. Stripe webhook updates to `coach_paid`
6. Success page with app download links
7. Download pbcoach app
8. Login with same credentials
9. App verifies subscription status
10. If `coach_paid` → onboarding + full access
11. If `coach_unpaid`/`coach_cancelled` → subscription required

### Phase 5: Stripe Subscription Integration - Update
**Current Status**: Mixes frontend and backend tasks
**Change Needed**: Reference backend API plan for detailed implementation

Add at top of Phase 5:
```markdown
**Note**: For detailed backend API implementation (auth-me endpoint, Stripe webhook, database schema),
see [Backend API Implementation Plan](./schedulecoaches-backend-api-implementation-plan.md) Phases 1-7.

This phase focuses on frontend integration with the backend API.
```

Update tasks to focus on frontend:
- Remove backend Azure Functions setup tasks → Move to Backend API Plan
- Keep: Frontend checkout handler, success page, environment variables
- Update: Replace references to "create account after payment" with "verify existing account"

### Phase 8: iOS App Authorization Integration - Clarifications
**Rename to**: "Subscription Verification & App Access Control"

**Clarify**:
- This phase is about the **pbcoach mobile app** checking subscription status
- schedulecoaches backend API provides `/api/verify-subscription` endpoint
- pbcoach app calls this endpoint after login
- Do NOT modify pbcoach.vnext code - coordinate with pbcoach team for app-side implementation

Update tasks:
- Remove: "Update coaching app authentication flow" (can't modify pbcoach)
- Add: "Coordinate with pbcoach team on subscription verification endpoint contract"
- Add: "Document API endpoint for pbcoach app integration"
- Keep: Database schema updates, subscription status tracking

## Updates to Backend API Plan

### Header Section
Add cross-reference:
```markdown
**Related Documentation:**
- [Website Plan](./schedulecoaches-website-plan.md) - Overall project phases and frontend implementation
- [Subscription Status](./SUBSCRIPTION_STATUS.md) - User roles and lifecycle
```

### Overview Section
Add context about relationship to website:
```markdown
This backend API is part of the schedulecoaches.com project (see website-plan.md for overall context).
The API handles authentication, user account creation, Stripe integration, and subscription management.
Frontend components (Vue.js) are covered in the main website plan.
```

## Role & Status Definitions (for both plans)

### User Roles (in Users.role column)
- `coach_unpaid` - Account created, awaiting payment
- `coach_paid` - Active subscription, full app access
- `coach_past_due` - Payment failed, grace period
- `coach_cancelled` - Subscription ended
- `admin` - System administrator

### Subscription Statuses (in Users.subscriptionStatus column)
- `active` - Current and paid
- `past_due` - Payment failed
- `canceled` - Subscription ended
- `incomplete` - Checkout started but not completed

## Backend Endpoints Summary (for website plan reference)

| Endpoint | Purpose | Phase |
|----------|---------|-------|
| POST/GET `/api/auth-me` | Create/get user from Entra token | Phase 3 |
| POST `/api/create-checkout-session` | Create Stripe checkout | Phase 4 |
| POST `/api/stripe-webhook` | Handle Stripe events | Phase 5 |
| GET `/api/subscription-status` | Check subscription status | Phase 7 |

## Implementation Priority

### Already Complete (Website Plan)
- ✅ Phase 1: Project setup
- ✅ Phase 2: Layout & navigation
- ✅ Phase 3: Homepage hero
- ✅ Phase 4: Pickleball Coach feature page

### Next Steps (Backend API Plan - NEW)
1. Phase 1: API project setup ← **Start here**
2. Phase 2: Database & utilities
3. Phase 3: `/auth-me` endpoint
4. Phase 4: Stripe checkout endpoint
5. Phase 5: Stripe webhook handler

### Then Continue (Website Plan)
- Phase 5: Frontend Stripe integration (depends on Backend Phases 1-5)
- Phase 7: FAQ & legal pages
- Phase 8: Subscription verification
- Phases 9-11: SEO, Tennis Coach, Testing

## Action Items
- [ ] Update website plan Overview section with correct user journey
- [ ] Update website plan Phase 5 to reference backend plan
- [ ] Update website plan Phase 8 with clarifications about pbcoach app
- [ ] Add cross-references in both plan headers
- [ ] Begin Backend API Phase 1 implementation
