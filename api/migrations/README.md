# Database Migrations

This folder contains SQL migration scripts for the schedulecoaches-web API database.

**IMPORTANT**: These migrations run on the **SHARED database** with pbcoach. Coordinate with the pbcoach team before running any migrations.

## Migration 001: Add Subscription Columns

**Status**: Ready to execute
**Created**: 2025-10-21
**Phase**: 6
**Coordination**: Aligns with pbcoach CoachClients Phase 1/2

### Purpose

Add subscription tracking columns to the Users table to support Stripe payment processing for schedulecoaches.com signups.

### Files

- **`001_add_subscription_columns.sql`** - Main migration script (ADD columns)
- **`001_rollback_subscription_columns.sql`** - Rollback script (REMOVE columns)
- **`001_verify_subscription_columns.sql`** - Verification queries (CHECK status)

### What This Migration Does

1. Adds 4 columns to Users table:
   - `stripeCustomerId` NVARCHAR(255) NULL
   - `stripeSubscriptionId` NVARCHAR(255) NULL
   - `subscriptionStatus` NVARCHAR(50) NULL
   - `subscriptionEndDate` DATETIME2 NULL

2. Backfills existing users:
   - Coaches → `subscriptionStatus = 'unpaid'`
   - Admins → `subscriptionStatus = 'active'`
   - Clients → `subscriptionStatus = NULL` (don't need subscriptions)

3. Creates filtered unique indexes:
   - `IX_Users_StripeCustomerId` (prevents duplicate customer IDs)
   - `IX_Users_StripeSubscriptionId` (prevents duplicate subscription IDs)
   - `IX_Users_SubscriptionStatus` (for subscription status queries)

### Prerequisites

✅ Code changes must be deployed first:
- Commit `cd60bfd` - Role + subscriptionStatus pattern
- Commit `00f6b17` - Webhook GUID validation fix
- Commit `2dab9b4` - Stripe webhook handler

✅ Coordination:
- Notify pbcoach team before running
- Verify pbcoach Phase 1/2 migrations are complete (coachId, personId, etc.)

✅ Database access:
- You need write access to the shared database
- Use a database client that supports SQL Server (Azure Data Studio, SSMS, etc.)

### How to Run the Migration

**Step 1: Connect to Database**
```bash
# Use Azure Data Studio or SSMS
# Connection string: (get from environment variables)
```

**Step 2: Review the Migration**
```bash
# Open and review: 001_add_subscription_columns.sql
# Make sure you understand what it does
```

**Step 3: Execute the Migration**
```sql
-- In your SQL client, run the entire script:
-- File: 001_add_subscription_columns.sql

-- The script will:
-- 1. Run pre-migration verification
-- 2. Execute migration in a transaction
-- 3. Run post-migration verification
-- 4. Display results

-- If any errors occur, the transaction will ROLLBACK automatically
```

**Step 4: Review Output**
The script prints detailed output at each step. Look for:
- ✅ Green checkmarks (success)
- ❌ Red X marks (errors)
- ⚠️ Yellow warnings (review needed)

**Step 5: Verify Migration**
```sql
-- Run the verification script independently:
-- File: 001_verify_subscription_columns.sql

-- This can be run anytime to check migration status
```

### Expected Results

After successful migration:

```
=== POST-MIGRATION VERIFICATION ===

1. Verifying columns exist:
  ✅ stripeCustomerId column exists
  ✅ stripeSubscriptionId column exists
  ✅ subscriptionStatus column exists
  ✅ subscriptionEndDate column exists

2. Verifying indexes exist:
  ✅ IX_Users_StripeCustomerId index exists
  ✅ IX_Users_StripeSubscriptionId index exists
  ✅ IX_Users_SubscriptionStatus index exists

3. Verifying coaches have subscriptionStatus:
  ✅ All coaches have subscriptionStatus set

4. Verifying admins have active status:
  ✅ All admins have subscriptionStatus=active

5. Checking for duplicate Stripe customer IDs:
  ✅ No duplicate Stripe customer IDs found

6. Checking for duplicate Stripe subscription IDs:
  ✅ No duplicate Stripe subscription IDs found

✅ Migration completed successfully!
```

### How to Rollback (If Needed)

⚠️ **WARNING**: Rollback will PERMANENTLY DELETE all subscription data!

Only rollback if:
- Migration failed and you need to start over
- You need to undo the migration for testing
- Something went wrong and you need to revert

**To Rollback:**
```sql
-- Run the rollback script:
-- File: 001_rollback_subscription_columns.sql

-- This will:
-- 1. Drop all 3 indexes
-- 2. Drop all 4 columns
-- 3. Verify removal

-- All Stripe data will be lost!
```

After rollback:
- Revert API code to pre-Phase-6 version
- Fix any issues
- Re-run migration when ready

### Troubleshooting

**Error: "Column already exists"**
```
The migration checks for existing columns before running.
If you see this error, the migration may have already been run.
Run: 001_verify_subscription_columns.sql to check current state.
```

**Error: "Users with NULL role found"**
```
The migration requires all users to have a valid role.
Fix the data first:
  UPDATE Users SET role = 'coach' WHERE role IS NULL AND [condition];
Then re-run the migration.
```

**Error: "Duplicate Stripe customer ID"**
```
After migration, if you see duplicate customer IDs:
1. Investigate the duplicates:
   SELECT stripeCustomerId, COUNT(*) FROM Users
   WHERE stripeCustomerId IS NOT NULL
   GROUP BY stripeCustomerId HAVING COUNT(*) > 1;

2. Fix the duplicates (manual intervention required)

3. The filtered unique index will prevent future duplicates
```

**Warning: "Coaches with customer ID but still unpaid"**
```
This may indicate:
- Webhook hasn't been processed yet (wait a few minutes)
- Webhook failed (check Stripe webhook logs)
- User signed up but didn't complete payment (expected)

Review these users manually:
  SELECT id, email, stripeCustomerId, subscriptionStatus, createdAt
  FROM Users
  WHERE role = 'coach'
    AND stripeCustomerId IS NOT NULL
    AND subscriptionStatus = 'unpaid';
```

### Coordination with pbcoach

**Before Migration:**
- ✅ Verify pbcoach Phase 1 complete (coachId, personId, triggers)
- ✅ Verify pbcoach Phase 2 complete (Persons, CoachClients tables)
- ✅ Notify pbcoach team of scheduled migration time

**After Migration:**
- ✅ Notify pbcoach team that subscription columns are available
- ✅ pbcoach app can now read `subscriptionStatus` for access control
- ✅ pbcoach types should be updated to include new fields

**No Conflicts:**
- ✅ Column names don't conflict
- ✅ Indexes don't conflict
- ✅ Nullable columns don't break existing queries
- ✅ No foreign key conflicts

### Post-Migration Monitoring

**Week 1 After Migration:**

1. Monitor Stripe webhook logs:
   - Check for any errors in webhook processing
   - Verify subscription updates are working

2. Check for stuck users:
   ```sql
   -- Coaches who paid but still show as unpaid
   SELECT id, email, stripeCustomerId, subscriptionStatus, createdAt
   FROM Users
   WHERE role = 'coach'
     AND stripeCustomerId IS NOT NULL
     AND subscriptionStatus = 'unpaid'
     AND createdAt < DATEADD(DAY, -1, GETUTCDATE());
   ```

3. Verify no duplicates:
   ```sql
   -- Run verification script daily for first week
   -- File: 001_verify_subscription_columns.sql
   ```

4. Monitor pbcoach app:
   - Check for any subscription-related errors
   - Verify access control is working correctly

### Related Documentation

- **[PHASE_6_MIGRATION.md](../../documentation/PHASE_6_MIGRATION.md)** - Detailed migration plan
- **[SUBSCRIPTION_STATUS.md](../../documentation/SUBSCRIPTION_STATUS.md)** - Subscription lifecycle
- **[schedulecoaches-backend-api-implementation-plan.md](../../documentation/schedulecoaches-backend-api-implementation-plan.md)** - Overall API plan
- **[pbcoach CoachClients Implementation](../../../pbcoach.vnext/documentation/database/coach-clients-relationship-implementation.md)** - Coordinated migrations

### Maintenance

**To check migration status at any time:**
```sql
-- Run: 001_verify_subscription_columns.sql
```

**To re-run verification after data changes:**
```sql
-- Run: 001_verify_subscription_columns.sql
-- This is safe to run anytime and makes no changes
```

---

**Migration 001 Status**: ⏸️ Ready to Execute
**Last Updated**: 2025-10-21
**Next Action**: Schedule migration during low-traffic window
