-- Verification Queries: Subscription Tracking Columns
-- Created: 2025-10-21
-- Phase: 6 Verification
-- Description: Standalone verification queries to check migration status
-- Usage: Run this anytime to verify the current state of subscription columns

PRINT '=== SUBSCRIPTION COLUMNS VERIFICATION ===';
PRINT 'Run Date: ' + CONVERT(VARCHAR, GETDATE(), 120);
PRINT '';

-- =============================================================================
-- 1. CHECK IF MIGRATION HAS BEEN RUN
-- =============================================================================

PRINT '1. Migration Status:';
PRINT '-------------------';

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'stripeCustomerId')
    PRINT '  ✅ Migration HAS been run (columns exist)';
ELSE
BEGIN
    PRINT '  ❌ Migration has NOT been run (columns do not exist)';
    PRINT '  Run: 001_add_subscription_columns.sql';
    RETURN;
END
PRINT '';

-- =============================================================================
-- 2. VERIFY ALL COLUMNS EXIST
-- =============================================================================

PRINT '2. Column Existence:';
PRINT '-------------------';

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'stripeCustomerId')
    PRINT '  ✅ stripeCustomerId exists';
ELSE
    PRINT '  ❌ stripeCustomerId MISSING';

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'stripeSubscriptionId')
    PRINT '  ✅ stripeSubscriptionId exists';
ELSE
    PRINT '  ❌ stripeSubscriptionId MISSING';

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'subscriptionStatus')
    PRINT '  ✅ subscriptionStatus exists';
ELSE
    PRINT '  ❌ subscriptionStatus MISSING';

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'subscriptionEndDate')
    PRINT '  ✅ subscriptionEndDate exists';
ELSE
    PRINT '  ❌ subscriptionEndDate MISSING';
PRINT '';

-- =============================================================================
-- 3. VERIFY ALL INDEXES EXIST
-- =============================================================================

PRINT '3. Index Existence:';
PRINT '------------------';

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Users_StripeCustomerId' AND object_id = OBJECT_ID('Users'))
    PRINT '  ✅ IX_Users_StripeCustomerId exists (filtered unique)';
ELSE
    PRINT '  ❌ IX_Users_StripeCustomerId MISSING';

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Users_StripeSubscriptionId' AND object_id = OBJECT_ID('Users'))
    PRINT '  ✅ IX_Users_StripeSubscriptionId exists (filtered unique)';
ELSE
    PRINT '  ❌ IX_Users_StripeSubscriptionId MISSING';

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Users_SubscriptionStatus' AND object_id = OBJECT_ID('Users'))
    PRINT '  ✅ IX_Users_SubscriptionStatus exists (non-unique)';
ELSE
    PRINT '  ❌ IX_Users_SubscriptionStatus MISSING';
PRINT '';

-- =============================================================================
-- 4. DATA INTEGRITY CHECKS
-- =============================================================================

PRINT '4. Data Integrity:';
PRINT '-----------------';

-- Check coaches without subscriptionStatus
DECLARE @coachesWithoutStatus INT;
SELECT @coachesWithoutStatus = COUNT(*)
FROM Users
WHERE role IN ('coach', 'coach_paid', 'coach_cancelled', 'coach_past_due', 'coach_unpaid')
  AND subscriptionStatus IS NULL;

IF @coachesWithoutStatus = 0
    PRINT '  ✅ All coaches have subscriptionStatus set';
ELSE
    PRINT '  ❌ ' + CAST(@coachesWithoutStatus AS VARCHAR) + ' coaches missing subscriptionStatus';

-- Check admins without active status
DECLARE @adminsNotActive INT;
SELECT @adminsNotActive = COUNT(*)
FROM Users
WHERE role = 'admin'
  AND (subscriptionStatus IS NULL OR subscriptionStatus != 'active');

IF @adminsNotActive = 0
    PRINT '  ✅ All admins have subscriptionStatus=active';
ELSE
    PRINT '  ⚠️ ' + CAST(@adminsNotActive AS VARCHAR) + ' admins do not have active status';

-- Check for duplicate Stripe customer IDs
DECLARE @duplicateCustomers INT;
SELECT @duplicateCustomers = COUNT(*)
FROM (
    SELECT stripeCustomerId
    FROM Users
    WHERE stripeCustomerId IS NOT NULL
    GROUP BY stripeCustomerId
    HAVING COUNT(*) > 1
) AS dups;

IF @duplicateCustomers = 0
    PRINT '  ✅ No duplicate Stripe customer IDs';
ELSE
    PRINT '  ❌ ' + CAST(@duplicateCustomers AS VARCHAR) + ' duplicate customer IDs found!';

-- Check for duplicate Stripe subscription IDs
DECLARE @duplicateSubscriptions INT;
SELECT @duplicateSubscriptions = COUNT(*)
FROM (
    SELECT stripeSubscriptionId
    FROM Users
    WHERE stripeSubscriptionId IS NOT NULL
    GROUP BY stripeSubscriptionId
    HAVING COUNT(*) > 1
) AS dups;

IF @duplicateSubscriptions = 0
    PRINT '  ✅ No duplicate Stripe subscription IDs';
ELSE
    PRINT '  ❌ ' + CAST(@duplicateSubscriptions AS VARCHAR) + ' duplicate subscription IDs found!';
PRINT '';

-- =============================================================================
-- 5. SUBSCRIPTION STATUS DISTRIBUTION
-- =============================================================================

PRINT '5. Subscription Status Distribution:';
PRINT '------------------------------------';
SELECT
    role,
    ISNULL(subscriptionStatus, 'NULL') AS subscriptionStatus,
    COUNT(*) AS count
FROM Users
GROUP BY role, subscriptionStatus
ORDER BY role, subscriptionStatus;
PRINT '';

-- =============================================================================
-- 6. STRIPE DATA SUMMARY
-- =============================================================================

PRINT '6. Stripe Data Summary:';
PRINT '----------------------';
SELECT
    COUNT(*) AS total_users,
    SUM(CASE WHEN stripeCustomerId IS NOT NULL THEN 1 ELSE 0 END) AS users_with_customer_id,
    SUM(CASE WHEN stripeSubscriptionId IS NOT NULL THEN 1 ELSE 0 END) AS users_with_subscription_id,
    SUM(CASE WHEN subscriptionStatus IS NOT NULL THEN 1 ELSE 0 END) AS users_with_status,
    SUM(CASE WHEN subscriptionStatus = 'active' THEN 1 ELSE 0 END) AS users_with_active_sub
FROM Users;
PRINT '';

-- =============================================================================
-- 7. POTENTIAL ISSUES
-- =============================================================================

PRINT '7. Potential Issues:';
PRINT '-------------------';

-- Users with Stripe customer ID but no subscription status
DECLARE @inconsistent1 INT;
SELECT @inconsistent1 = COUNT(*)
FROM Users
WHERE stripeCustomerId IS NOT NULL
  AND subscriptionStatus IS NULL;

IF @inconsistent1 > 0
    PRINT '  ⚠️ ' + CAST(@inconsistent1 AS VARCHAR) + ' users have customer ID but no subscription status';

-- Users with Stripe subscription ID but no customer ID
DECLARE @inconsistent2 INT;
SELECT @inconsistent2 = COUNT(*)
FROM Users
WHERE stripeSubscriptionId IS NOT NULL
  AND stripeCustomerId IS NULL;

IF @inconsistent2 > 0
    PRINT '  ⚠️ ' + CAST(@inconsistent2 AS VARCHAR) + ' users have subscription ID but no customer ID';

-- Coaches with Stripe data but unpaid status (may indicate webhook failure)
DECLARE @inconsistent3 INT;
SELECT @inconsistent3 = COUNT(*)
FROM Users
WHERE role IN ('coach', 'coach_paid', 'coach_cancelled', 'coach_past_due', 'coach_unpaid')
  AND stripeCustomerId IS NOT NULL
  AND subscriptionStatus = 'unpaid';

IF @inconsistent3 > 0
    PRINT '  ⚠️ ' + CAST(@inconsistent3 AS VARCHAR) + ' coaches have customer ID but are still unpaid (may indicate webhook failure)';

-- Free accounts should not have Stripe data
DECLARE @inconsistent4 INT;
SELECT @inconsistent4 = COUNT(*)
FROM Users
WHERE subscriptionStatus = 'free'
  AND (stripeCustomerId IS NOT NULL OR stripeSubscriptionId IS NOT NULL);

IF @inconsistent4 > 0
    PRINT '  ⚠️ ' + CAST(@inconsistent4 AS VARCHAR) + ' free accounts have Stripe data (should be NULL for free accounts)';

IF @inconsistent1 = 0 AND @inconsistent2 = 0 AND @inconsistent3 = 0 AND @inconsistent4 = 0
    PRINT '  ✅ No data inconsistencies found';

PRINT '';

-- =============================================================================
-- 8. OVERALL STATUS
-- =============================================================================

PRINT '=== OVERALL STATUS ===';
PRINT '';

DECLARE @totalIssues INT = 0;

-- Count issues
IF @coachesWithoutStatus > 0 SET @totalIssues = @totalIssues + 1;
IF @adminsNotActive > 0 SET @totalIssues = @totalIssues + 1;
IF @duplicateCustomers > 0 SET @totalIssues = @totalIssues + 1;
IF @duplicateSubscriptions > 0 SET @totalIssues = @totalIssues + 1;

IF @totalIssues = 0
BEGIN
    PRINT '✅ Migration is HEALTHY - all checks passed!';
    PRINT '';
    PRINT 'Subscription system is operational.';
END
ELSE
BEGIN
    PRINT '⚠️ Migration has ISSUES - ' + CAST(@totalIssues AS VARCHAR) + ' problems detected';
    PRINT '';
    PRINT 'Review the output above and address any issues.';
END

PRINT '';
PRINT '=== VERIFICATION COMPLETE ===';
