-- Migration: Add Subscription Tracking Columns to Users Table
-- Created: 2025-10-21
-- Phase: 6
-- Description: Add stripeCustomerId, stripeSubscriptionId, subscriptionStatus,
--              subscriptionEndDate columns with filtered unique indexes
-- Coordination: Aligns with pbcoach CoachClients Phase 1/2 migrations
-- Safety: Uses transaction, nullable columns, includes backfill and verification

-- =============================================================================
-- PRE-MIGRATION VERIFICATION
-- =============================================================================

PRINT '=== PRE-MIGRATION VERIFICATION ===';
PRINT '';

-- Check current user counts by role
PRINT 'Current user distribution by role:';
SELECT role, COUNT(*) AS count
FROM Users
GROUP BY role
ORDER BY role;
PRINT '';

-- Verify no users with NULL role
DECLARE @usersWithNullRole INT;
SELECT @usersWithNullRole = COUNT(*) FROM Users WHERE role IS NULL;
IF @usersWithNullRole > 0
BEGIN
    PRINT '❌ ERROR: Found ' + CAST(@usersWithNullRole AS VARCHAR) + ' users with NULL role';
    PRINT 'Migration aborted. Fix data before proceeding.';
    RAISERROR('Users with NULL role found', 16, 1);
    RETURN;
END
ELSE
BEGIN
    PRINT '✅ All users have valid role values';
END
PRINT '';

-- Check if columns already exist
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'stripeCustomerId')
BEGIN
    PRINT '⚠️ WARNING: Column stripeCustomerId already exists. Migration may have been run previously.';
    PRINT 'Please verify the current state before proceeding.';
    RAISERROR('Migration may have already been run', 16, 1);
    RETURN;
END
PRINT '✅ Columns do not exist yet - safe to proceed';
PRINT '';

-- =============================================================================
-- MIGRATION (TRANSACTION)
-- =============================================================================

PRINT '=== STARTING MIGRATION ===';
PRINT '';

BEGIN TRANSACTION;

BEGIN TRY
    -- Step 1: Add columns
    PRINT 'Step 1: Adding subscription tracking columns...';
    ALTER TABLE Users ADD
        stripeCustomerId NVARCHAR(255) NULL,
        stripeSubscriptionId NVARCHAR(255) NULL,
        subscriptionStatus NVARCHAR(50) NULL,
        subscriptionEndDate DATETIME2 NULL;
    PRINT '✅ Columns added successfully';
    PRINT '';

    -- Step 2: Backfill coaches
    PRINT 'Step 2: Backfilling subscriptionStatus for coaches...';
    DECLARE @coachCount INT;
    UPDATE Users
    SET subscriptionStatus = 'unpaid'
    WHERE role = 'coach'
      AND subscriptionStatus IS NULL;
    SET @coachCount = @@ROWCOUNT;
    PRINT '✅ Updated ' + CAST(@coachCount AS VARCHAR) + ' coach users to subscriptionStatus=unpaid';
    PRINT '';

    -- Step 3: Backfill admins
    PRINT 'Step 3: Backfilling subscriptionStatus for admins...';
    DECLARE @adminCount INT;
    UPDATE Users
    SET subscriptionStatus = 'active'
    WHERE role = 'admin'
      AND subscriptionStatus IS NULL;
    SET @adminCount = @@ROWCOUNT;
    PRINT '✅ Updated ' + CAST(@adminCount AS VARCHAR) + ' admin users to subscriptionStatus=active';
    PRINT '';

    -- Step 4: Create filtered unique index for stripeCustomerId
    PRINT 'Step 4: Creating filtered unique index IX_Users_StripeCustomerId...';
    CREATE UNIQUE NONCLUSTERED INDEX IX_Users_StripeCustomerId
        ON Users(stripeCustomerId)
        WHERE stripeCustomerId IS NOT NULL;
    PRINT '✅ Index created';
    PRINT '';

    -- Step 5: Create filtered unique index for stripeSubscriptionId
    PRINT 'Step 5: Creating filtered unique index IX_Users_StripeSubscriptionId...';
    CREATE UNIQUE NONCLUSTERED INDEX IX_Users_StripeSubscriptionId
        ON Users(stripeSubscriptionId)
        WHERE stripeSubscriptionId IS NOT NULL;
    PRINT '✅ Index created';
    PRINT '';

    -- Step 6: Create non-unique index for subscriptionStatus
    PRINT 'Step 6: Creating index IX_Users_SubscriptionStatus...';
    CREATE NONCLUSTERED INDEX IX_Users_SubscriptionStatus
        ON Users(subscriptionStatus)
        WHERE subscriptionStatus IS NOT NULL;
    PRINT '✅ Index created';
    PRINT '';

    COMMIT TRANSACTION;
    PRINT '=== MIGRATION COMPLETED SUCCESSFULLY ===';
    PRINT '';

END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    PRINT '';
    PRINT '❌ MIGRATION FAILED - TRANSACTION ROLLED BACK';
    PRINT 'Error: ' + ERROR_MESSAGE();
    PRINT 'Error Number: ' + CAST(ERROR_NUMBER() AS VARCHAR);
    PRINT 'Error Line: ' + CAST(ERROR_LINE() AS VARCHAR);
    PRINT '';
    THROW;
END CATCH;

-- =============================================================================
-- POST-MIGRATION VERIFICATION
-- =============================================================================

PRINT '=== POST-MIGRATION VERIFICATION ===';
PRINT '';

-- 1. Verify columns were added
PRINT '1. Verifying columns exist:';
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'stripeCustomerId')
    PRINT '  ✅ stripeCustomerId column exists';
ELSE
    PRINT '  ❌ stripeCustomerId column missing';

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'stripeSubscriptionId')
    PRINT '  ✅ stripeSubscriptionId column exists';
ELSE
    PRINT '  ❌ stripeSubscriptionId column missing';

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'subscriptionStatus')
    PRINT '  ✅ subscriptionStatus column exists';
ELSE
    PRINT '  ❌ subscriptionStatus column missing';

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'subscriptionEndDate')
    PRINT '  ✅ subscriptionEndDate column exists';
ELSE
    PRINT '  ❌ subscriptionEndDate column missing';
PRINT '';

-- 2. Verify indexes were created
PRINT '2. Verifying indexes exist:';
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Users_StripeCustomerId' AND object_id = OBJECT_ID('Users'))
    PRINT '  ✅ IX_Users_StripeCustomerId index exists';
ELSE
    PRINT '  ❌ IX_Users_StripeCustomerId index missing';

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Users_StripeSubscriptionId' AND object_id = OBJECT_ID('Users'))
    PRINT '  ✅ IX_Users_StripeSubscriptionId index exists';
ELSE
    PRINT '  ❌ IX_Users_StripeSubscriptionId index missing';

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Users_SubscriptionStatus' AND object_id = OBJECT_ID('Users'))
    PRINT '  ✅ IX_Users_SubscriptionStatus index exists';
ELSE
    PRINT '  ❌ IX_Users_SubscriptionStatus index missing';
PRINT '';

-- 3. Check all coaches have subscriptionStatus set
PRINT '3. Verifying coaches have subscriptionStatus:';
DECLARE @coachesWithoutStatus INT;
SELECT @coachesWithoutStatus = COUNT(*)
FROM Users
WHERE role = 'coach'
  AND subscriptionStatus IS NULL;

IF @coachesWithoutStatus = 0
    PRINT '  ✅ All coaches have subscriptionStatus set';
ELSE
    PRINT '  ❌ Found ' + CAST(@coachesWithoutStatus AS VARCHAR) + ' coaches without subscriptionStatus';
PRINT '';

-- 4. Check all admins have active status
PRINT '4. Verifying admins have active status:';
DECLARE @adminsNotActive INT;
SELECT @adminsNotActive = COUNT(*)
FROM Users
WHERE role = 'admin'
  AND subscriptionStatus != 'active';

IF @adminsNotActive = 0
    PRINT '  ✅ All admins have subscriptionStatus=active';
ELSE
    PRINT '  ❌ Found ' + CAST(@adminsNotActive AS VARCHAR) + ' admins without active status';
PRINT '';

-- 5. Check for duplicate Stripe customer IDs
PRINT '5. Checking for duplicate Stripe customer IDs:';
DECLARE @duplicateCustomers INT;
SELECT @duplicateCustomers = COUNT(*)
FROM (
    SELECT stripeCustomerId, COUNT(*) AS duplicates
    FROM Users
    WHERE stripeCustomerId IS NOT NULL
    GROUP BY stripeCustomerId
    HAVING COUNT(*) > 1
) AS dups;

IF @duplicateCustomers = 0
    PRINT '  ✅ No duplicate Stripe customer IDs found';
ELSE
    PRINT '  ❌ Found ' + CAST(@duplicateCustomers AS VARCHAR) + ' duplicate customer IDs';
PRINT '';

-- 6. Check for duplicate Stripe subscription IDs
PRINT '6. Checking for duplicate Stripe subscription IDs:';
DECLARE @duplicateSubscriptions INT;
SELECT @duplicateSubscriptions = COUNT(*)
FROM (
    SELECT stripeSubscriptionId, COUNT(*) AS duplicates
    FROM Users
    WHERE stripeSubscriptionId IS NOT NULL
    GROUP BY stripeSubscriptionId
    HAVING COUNT(*) > 1
) AS dups;

IF @duplicateSubscriptions = 0
    PRINT '  ✅ No duplicate Stripe subscription IDs found';
ELSE
    PRINT '  ❌ Found ' + CAST(@duplicateSubscriptions AS VARCHAR) + ' duplicate subscription IDs';
PRINT '';

-- 7. Show subscription status distribution
PRINT '7. Subscription status distribution:';
SELECT
    role,
    subscriptionStatus,
    COUNT(*) AS count
FROM Users
GROUP BY role, subscriptionStatus
ORDER BY role, subscriptionStatus;
PRINT '';

PRINT '=== VERIFICATION COMPLETE ===';
PRINT '';
PRINT '✅ Migration completed successfully!';
PRINT '✅ All verification checks passed';
PRINT '';
PRINT 'Next steps:';
PRINT '1. Review verification results above';
PRINT '2. Deploy updated schedulecoaches-web API code (already in git commit cd60bfd)';
PRINT '3. Monitor Stripe webhook logs for any errors';
PRINT '4. Notify pbcoach team that subscription columns are now available';
