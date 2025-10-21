# Phase 6: Database Schema Migration for Subscription Tracking

**Created**: 2025-10-21
**Purpose**: Add subscription tracking columns to Users table with backfill strategy
**Coordination**: Aligns with pbcoach CoachClients migration (Phases 1-2)

## Overview

This migration adds subscription tracking columns to the Users table in the shared pbcoach database. It coordinates with ongoing pbcoach schema changes (coachId, personId, filtered indexes, triggers).

**Key Design Alignment**:
- ✅ Uses `role='coach'` + separate `subscriptionStatus` field (NOT `coach_unpaid`, `coach_paid`, etc.)
- ✅ Aligns with pbcoach schema: `role: 'client' | 'coach' | 'admin'`
- ✅ Nullable columns for backward compatibility
- ✅ Filtered unique indexes to prevent duplicate Stripe IDs
- ✅ Explicit backfill strategy for existing data

---

## Schema Changes

### Columns to Add

```sql
ALTER TABLE Users ADD
    stripeCustomerId NVARCHAR(255) NULL,
    stripeSubscriptionId NVARCHAR(255) NULL,
    subscriptionStatus NVARCHAR(50) NULL,
    subscriptionEndDate DATETIME2 NULL;
```

### Filtered Unique Indexes

Prevent duplicate Stripe IDs while allowing NULL values:

```sql
-- Ensure one Stripe customer per coach (ignore NULLs)
CREATE UNIQUE NONCLUSTERED INDEX IX_Users_StripeCustomerId
    ON Users(stripeCustomerId)
    WHERE stripeCustomerId IS NOT NULL;

-- Ensure one Stripe subscription per coach (ignore NULLs)
CREATE UNIQUE NONCLUSTERED INDEX IX_Users_StripeSubscriptionId
    ON Users(stripeSubscriptionId)
    WHERE stripeSubscriptionId IS NOT NULL;

-- Non-unique index for querying by subscription status
CREATE NONCLUSTERED INDEX IX_Users_SubscriptionStatus
    ON Users(subscriptionStatus)
    WHERE subscriptionStatus IS NOT NULL;
```

---

## Backfill Strategy

### Initial State After Column Add

All existing users will have:
- `stripeCustomerId = NULL`
- `stripeSubscriptionId = NULL`
- `subscriptionStatus = NULL`
- `subscriptionEndDate = NULL`

### Backfill Rules

**For Coaches** (`role = 'coach'`):
```sql
-- Set default subscription status for existing coaches
UPDATE Users
SET subscriptionStatus = 'unpaid'
WHERE role = 'coach'
  AND subscriptionStatus IS NULL;
```

**For Admins** (`role = 'admin'`):
```sql
-- Admins always have active status (no payment required)
UPDATE Users
SET subscriptionStatus = 'active'
WHERE role = 'admin'
  AND subscriptionStatus IS NULL;
```

**For Clients** (`role = 'client'`):
```sql
-- Clients don't need subscription status (they book, not provide coaching)
-- Leave subscriptionStatus = NULL for clients
```

### Handling Legacy Mobile Coaches

Any coaches created through the mobile app before schedulecoaches.com signup:

```sql
-- Mark legacy coaches as unpaid (will need to complete signup)
UPDATE Users
SET subscriptionStatus = 'unpaid'
WHERE role = 'coach'
  AND stripeCustomerId IS NULL
  AND subscriptionStatus IS NULL;
```

---

## Rollback Plan

```sql
-- Drop indexes
DROP INDEX IF EXISTS IX_Users_SubscriptionStatus ON Users;
DROP INDEX IF EXISTS IX_Users_StripeSubscriptionId ON Users;
DROP INDEX IF EXISTS IX_Users_StripeCustomerId ON Users;

-- Drop columns
ALTER TABLE Users DROP COLUMN
    stripeCustomerId,
    stripeSubscriptionId,
    subscriptionStatus,
    subscriptionEndDate;
```

---

## Code Changes Required

### ✅ Already Completed

1. **api/src/types/user.ts**
   - ✅ Changed `role` type from `'coach_unpaid' | 'coach_paid' | ...` to `'client' | 'coach' | 'admin'`
   - ✅ Made `subscriptionStatus` required (not optional)
   - ✅ Added all Stripe subscription status values

2. **api/src/functions/authMe.ts**
   - ✅ New users created with `role='coach'` + `subscriptionStatus='unpaid'`
   - ✅ Admins created with `role='admin'` + `subscriptionStatus='active'`
   - ✅ INSERT statement includes subscriptionStatus column
   - ✅ Admin downgrade sets `role='coach', subscriptionStatus='unpaid'`

3. **api/src/functions/stripeWebhook.ts**
   - ✅ All event handlers now ONLY update `subscriptionStatus`, NOT `role`
   - ✅ `checkout.session.completed`: Sets `subscriptionStatus='active'` (not `role='coach_paid'`)
   - ✅ `customer.subscription.updated`: Maps Stripe status to subscriptionStatus
   - ✅ `customer.subscription.deleted`: Sets `subscriptionStatus='canceled'`
   - ✅ `invoice.payment_succeeded`: Sets `subscriptionStatus='active'`
   - ✅ `invoice.payment_failed`: Sets `subscriptionStatus='past_due'`

---

## Verification Queries

Run these after migration to verify data integrity:

```sql
-- 1. Check all coaches have subscriptionStatus set
SELECT COUNT(*) AS coaches_without_status
FROM Users
WHERE role = 'coach'
  AND subscriptionStatus IS NULL;
-- Expected: 0

-- 2. Check all admins have active status
SELECT COUNT(*) AS admins_not_active
FROM Users
WHERE role = 'admin'
  AND subscriptionStatus != 'active';
-- Expected: 0

-- 3. Check for duplicate Stripe customer IDs
SELECT stripeCustomerId, COUNT(*) AS duplicates
FROM Users
WHERE stripeCustomerId IS NOT NULL
GROUP BY stripeCustomerId
HAVING COUNT(*) > 1;
-- Expected: 0 rows

-- 4. Check for duplicate Stripe subscription IDs
SELECT stripeSubscriptionId, COUNT(*) AS duplicates
FROM Users
WHERE stripeSubscriptionId IS NOT NULL
GROUP BY stripeSubscriptionId
HAVING COUNT(*) > 1;
-- Expected: 0 rows

-- 5. Check subscription status distribution
SELECT role, subscriptionStatus, COUNT(*) AS count
FROM Users
GROUP BY role, subscriptionStatus
ORDER BY role, subscriptionStatus;
-- Review output for anomalies

-- 6. Check for coaches with Stripe IDs but no active subscription
SELECT
    id,
    email,
    role,
    stripeCustomerId,
    stripeSubscriptionId,
    subscriptionStatus,
    subscriptionEndDate
FROM Users
WHERE role = 'coach'
  AND stripeCustomerId IS NOT NULL
  AND subscriptionStatus IN ('unpaid', 'canceled', NULL);
-- Investigate any results
```

---

## Coordination with pbcoach Migrations

### Timing

✅ **Can run NOW** - No conflicts with pbcoach Phase 1/2:
- pbcoach Phase 1: Added `coachId`, `personId`, filtered indexes, triggers on Users
- pbcoach Phase 2: Created `Persons` and `CoachClients` tables
- ✅ No column name conflicts
- ✅ Nullable columns don't break existing queries
- ✅ No foreign key conflicts

### Shared TypeScript Types

**Action Required**: Update pbcoach-api types to include new fields:

```typescript
// pbcoach-api/src/models/coach.ts
export interface User {
  id: string; // GUID
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'client' | 'coach' | 'both';
  slug?: string;
  profilePhotoUrl?: string;

  // NEW: Subscription fields (from schedulecoaches)
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: 'unpaid' | 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete' | 'incomplete_expired';
  subscriptionEndDate?: Date;

  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}
```

### Integration Points

**pbcoach app** can now:
1. Check `subscriptionStatus` to enforce access control
2. Show "subscription expiring" warnings when `subscriptionEndDate` is near
3. Display "upgrade" prompts when `subscriptionStatus = 'unpaid'`
4. Link users to schedulecoaches.com for payment management

---

## Migration Execution Plan

### Step 1: Pre-Migration Checks
```sql
-- Count existing users by role
SELECT role, COUNT(*) AS count
FROM Users
GROUP BY role;

-- Verify no orphaned data
SELECT COUNT(*) FROM Users WHERE role IS NULL;
```

### Step 2: Run Migration (Transaction)
```sql
BEGIN TRANSACTION;

-- Add columns
ALTER TABLE Users ADD
    stripeCustomerId NVARCHAR(255) NULL,
    stripeSubscriptionId NVARCHAR(255) NULL,
    subscriptionStatus NVARCHAR(50) NULL,
    subscriptionEndDate DATETIME2 NULL;

-- Backfill coaches
UPDATE Users
SET subscriptionStatus = 'unpaid'
WHERE role = 'coach'
  AND subscriptionStatus IS NULL;

-- Backfill admins
UPDATE Users
SET subscriptionStatus = 'active'
WHERE role = 'admin'
  AND subscriptionStatus IS NULL;

-- Create filtered unique indexes
CREATE UNIQUE NONCLUSTERED INDEX IX_Users_StripeCustomerId
    ON Users(stripeCustomerId)
    WHERE stripeCustomerId IS NOT NULL;

CREATE UNIQUE NONCLUSTERED INDEX IX_Users_StripeSubscriptionId
    ON Users(stripeSubscriptionId)
    WHERE stripeSubscriptionId IS NOT NULL;

CREATE NONCLUSTERED INDEX IX_Users_SubscriptionStatus
    ON Users(subscriptionStatus)
    WHERE subscriptionStatus IS NOT NULL;

COMMIT TRANSACTION;
```

### Step 3: Post-Migration Verification
Run all verification queries listed above.

### Step 4: Deploy Updated Code
Deploy schedulecoaches-web API with updated code (already completed in this commit).

---

## Risk Assessment

| Risk | Impact | Mitigation | Status |
|------|--------|------------|--------|
| Column conflicts with pbcoach | High | Coordinated with pbcoach team, no conflicts found | ✅ Clear |
| Data integrity issues | High | Backfill strategy with verification queries | ✅ Planned |
| Duplicate Stripe IDs | Medium | Filtered unique indexes prevent duplicates | ✅ Mitigated |
| NULL handling in queries | Medium | All queries use COALESCE or WHERE IS NOT NULL | ✅ Handled |
| Breaking pbcoach app | High | Nullable columns don't break existing queries | ✅ Safe |
| Role value mismatches | High | Fixed role values before migration | ✅ Fixed |

---

## Post-Migration Monitoring

### Week 1 After Migration

1. Monitor Stripe webhook logs for errors
2. Check for any users stuck in 'unpaid' status with payment completed
3. Verify no duplicate Stripe IDs created
4. Monitor pbcoach app for subscription-related errors

### Alerts to Set Up

```sql
-- Daily check: Coaches with payment completed but still unpaid
SELECT
    id,
    email,
    stripeCustomerId,
    subscriptionStatus,
    createdAt
FROM Users
WHERE role = 'coach'
  AND stripeCustomerId IS NOT NULL
  AND subscriptionStatus = 'unpaid'
  AND createdAt < DATEADD(DAY, -1, GETUTCDATE());
```

---

## Related Documentation

- [schedulecoaches-backend-api-implementation-plan.md](./schedulecoaches-backend-api-implementation-plan.md) - Overall API implementation phases
- [SUBSCRIPTION_STATUS.md](./SUBSCRIPTION_STATUS.md) - Subscription lifecycle and role definitions
- [pbcoach CoachClients Implementation](../../pbcoach.vnext/documentation/database/coach-clients-relationship-implementation.md) - Coordinated migrations

---

**Status**: Ready to execute (code changes completed 2025-10-21)
**Next Action**: Schedule migration execution during low-traffic window
**Coordination Required**: Notify pbcoach team before running migration
