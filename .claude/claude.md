# Project Guidelines for ScheduleCoaches Website

## Restriction: Do NOT Modify pbcoach App

**IMPORTANT:** Do not make any changes to the pbcoach mobile app codebase located at:
- `/Users/ryanmcdonald/Documents/Code/pbcoach.vnext/`

The pbcoach app is a separate, working application. Changes to authentication, subscriptions, and user flows should only be made in this schedulecoaches-web project.

## Project Relationship

- **schedulecoaches.com** (this project) - Marketing website and subscription purchase engine
- **pbcoach app** (separate project) - Mobile application for coaches (iOS/Android)

### User Flow

1. User visits schedulecoaches.com
2. Signs up with Email/Google/Apple → Creates Entra ID account
3. Purchases subscription via Stripe → Becomes paid coach
4. Downloads pbcoach app from App Store / Google Play
5. Logs into app with their schedulecoaches.com credentials
6. Completes onboarding wizard in app
7. Uses app to manage coaching business

### Key Points

- All signups happen on schedulecoaches.com (web)
- pbcoach app only allows **login** (no signup)
- pbcoach app will have a "Need a subscription? Visit schedulecoaches.com" link
- Subscription status is managed via Stripe webhooks
- Backend assigns role based on subscription status:
  - `coach_unpaid` - Account created, no payment yet (cannot use app)
  - `coach_paid` - Active subscription (can use app)
  - `coach_cancelled` - Subscription cancelled (cannot use app)
  - `coach_past_due` - Payment failed (grace period, limited access)

## Authentication

- Uses Microsoft Entra External ID (CIAM)
- Production Tenant: `da976fe1-dd40-4c9d-a828-acfa45634f85`
- Production Client ID: `e6c5b70f-e2d7-472d-a363-230a252ccbd5`
- Authority: `https://pickleballcoach.ciamlogin.com/pickleballcoach.onmicrosoft.com`
- Supports Email, Google, and Apple sign-in

## Development Notes

- Use pbcoach.vnext code as reference only
- Do not import or modify pbcoach.vnext files
- Backend API is shared between web and app
- Subscription webhooks must update user role in database
