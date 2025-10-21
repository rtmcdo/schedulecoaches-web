-- Rollback: Remove Subscription Tracking Columns from Users Table
-- Created: 2025-10-21
-- Phase: 6 Rollback
-- Description: Safely rollback the subscription columns migration
-- WARNING: This will PERMANENTLY DELETE subscription data!
--          Only run this if you need to undo the migration.

-- =============================================================================
-- PRE-ROLLBACK VERIFICATION
-- =============================================================================

PRINT '=== PRE-ROLLBACK VERIFICATION ===';
PRINT '';

-- Check if columns exist
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'stripeCustomerId')
BEGIN
    PRINT '⚠️ WARNING: Column stripeCustomerId does not exist. Rollback not needed.';
    RETURN;
END

PRINT '✅ Subscription columns exist - proceeding with rollback';
PRINT '';

-- Warn about data loss
PRINT '⚠️ WARNING: This rollback will PERMANENTLY DELETE:';
PRINT '  - All stripeCustomerId values';
PRINT '  - All stripeSubscriptionId values';
PRINT '  - All subscriptionStatus values';
PRINT '  - All subscriptionEndDate values';
PRINT '';

-- Show current data that will be lost
PRINT 'Users with Stripe data that will be DELETED:';
SELECT
    COUNT(*) AS users_with_stripe_data,
    SUM(CASE WHEN stripeCustomerId IS NOT NULL THEN 1 ELSE 0 END) AS with_customer_id,
    SUM(CASE WHEN stripeSubscriptionId IS NOT NULL THEN 1 ELSE 0 END) AS with_subscription_id,
    SUM(CASE WHEN subscriptionStatus IS NOT NULL THEN 1 ELSE 0 END) AS with_status
FROM Users;
PRINT '';

-- =============================================================================
-- ROLLBACK (TRANSACTION)
-- =============================================================================

PRINT '=== STARTING ROLLBACK ===';
PRINT '';
PRINT 'Pausing for 5 seconds to allow cancellation...';
WAITFOR DELAY '00:00:05';
PRINT '';

BEGIN TRANSACTION;

BEGIN TRY
    -- Step 1: Drop indexes
    PRINT 'Step 1: Dropping indexes...';

    IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Users_SubscriptionStatus' AND object_id = OBJECT_ID('Users'))
    BEGIN
        DROP INDEX IX_Users_SubscriptionStatus ON Users;
        PRINT '  ✅ Dropped IX_Users_SubscriptionStatus';
    END
    ELSE
        PRINT '  ⚠️ Index IX_Users_SubscriptionStatus not found';

    IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Users_StripeSubscriptionId' AND object_id = OBJECT_ID('Users'))
    BEGIN
        DROP INDEX IX_Users_StripeSubscriptionId ON Users;
        PRINT '  ✅ Dropped IX_Users_StripeSubscriptionId';
    END
    ELSE
        PRINT '  ⚠️ Index IX_Users_StripeSubscriptionId not found';

    IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Users_StripeCustomerId' AND object_id = OBJECT_ID('Users'))
    BEGIN
        DROP INDEX IX_Users_StripeCustomerId ON Users;
        PRINT '  ✅ Dropped IX_Users_StripeCustomerId';
    END
    ELSE
        PRINT '  ⚠️ Index IX_Users_StripeCustomerId not found';

    PRINT '';

    -- Step 2: Drop columns
    PRINT 'Step 2: Dropping columns...';
    ALTER TABLE Users DROP COLUMN
        stripeCustomerId,
        stripeSubscriptionId,
        subscriptionStatus,
        subscriptionEndDate;
    PRINT '  ✅ Columns dropped';
    PRINT '';

    COMMIT TRANSACTION;
    PRINT '=== ROLLBACK COMPLETED SUCCESSFULLY ===';
    PRINT '';

END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    PRINT '';
    PRINT '❌ ROLLBACK FAILED - TRANSACTION ROLLED BACK';
    PRINT 'Error: ' + ERROR_MESSAGE();
    PRINT 'Error Number: ' + CAST(ERROR_NUMBER() AS VARCHAR);
    PRINT 'Error Line: ' + CAST(ERROR_LINE() AS VARCHAR);
    PRINT '';
    THROW;
END CATCH;

-- =============================================================================
-- POST-ROLLBACK VERIFICATION
-- =============================================================================

PRINT '=== POST-ROLLBACK VERIFICATION ===';
PRINT '';

-- Verify columns were removed
PRINT '1. Verifying columns removed:';
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'stripeCustomerId')
    PRINT '  ✅ stripeCustomerId column removed';
ELSE
    PRINT '  ❌ stripeCustomerId column still exists';

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'stripeSubscriptionId')
    PRINT '  ✅ stripeSubscriptionId column removed';
ELSE
    PRINT '  ❌ stripeSubscriptionId column still exists';

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'subscriptionStatus')
    PRINT '  ✅ subscriptionStatus column removed';
ELSE
    PRINT '  ❌ subscriptionStatus column still exists';

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'subscriptionEndDate')
    PRINT '  ✅ subscriptionEndDate column removed';
ELSE
    PRINT '  ❌ subscriptionEndDate column still exists';
PRINT '';

-- Verify indexes were removed
PRINT '2. Verifying indexes removed:';
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Users_StripeCustomerId' AND object_id = OBJECT_ID('Users'))
    PRINT '  ✅ IX_Users_StripeCustomerId index removed';
ELSE
    PRINT '  ❌ IX_Users_StripeCustomerId index still exists';

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Users_StripeSubscriptionId' AND object_id = OBJECT_ID('Users'))
    PRINT '  ✅ IX_Users_StripeSubscriptionId index removed';
ELSE
    PRINT '  ❌ IX_Users_StripeSubscriptionId index still exists';

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Users_SubscriptionStatus' AND object_id = OBJECT_ID('Users'))
    PRINT '  ✅ IX_Users_SubscriptionStatus index removed';
ELSE
    PRINT '  ❌ IX_Users_SubscriptionStatus index still exists';
PRINT '';

PRINT '=== VERIFICATION COMPLETE ===';
PRINT '';
PRINT '✅ Rollback completed successfully!';
PRINT '⚠️ All subscription data has been permanently deleted';
PRINT '';
PRINT 'Next steps:';
PRINT '1. Rollback schedulecoaches-web API code to pre-Phase-6 version';
PRINT '2. Notify pbcoach team that subscription columns have been removed';
PRINT '3. If you need to re-run the migration, use 001_add_subscription_columns.sql';
