-- ============================================================
-- Add Trial Support to Users Table
-- Version: 1.0
-- Description: Adds trial end date column and updates subscriptionStatus to support 'trialing' status
-- ============================================================

-- Note: subscriptionStatus column already exists and supports NVARCHAR values
-- We're adding support for 'trialing' status value
-- Existing values: 'unpaid', 'active', 'past_due', 'canceled'
-- New value: 'trialing'

-- Add trial end date column (if it doesn't exist)
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'trialEndDate'
)
BEGIN
    ALTER TABLE Users
    ADD trialEndDate DATETIME2 NULL;

    PRINT 'Added trialEndDate column to Users table';
END
ELSE
BEGIN
    PRINT 'trialEndDate column already exists';
END
GO

-- Create index on trialEndDate for efficient querying
IF NOT EXISTS (
    SELECT * FROM sys.indexes
    WHERE name = 'IX_Users_TrialEndDate' AND object_id = OBJECT_ID('Users')
)
BEGIN
    CREATE INDEX IX_Users_TrialEndDate ON Users(trialEndDate)
    WHERE trialEndDate IS NOT NULL;

    PRINT 'Created index IX_Users_TrialEndDate';
END
ELSE
BEGIN
    PRINT 'Index IX_Users_TrialEndDate already exists';
END
GO

-- Update subscriptionStatus documentation
-- Valid values:
-- - 'unpaid': No subscription yet
-- - 'trialing': Free trial active
-- - 'active': Paid subscription active
-- - 'past_due': Payment failed, grace period
-- - 'canceled': Subscription cancelled

PRINT 'Migration 002_add_trial_support.sql completed successfully';
PRINT 'subscriptionStatus now supports: unpaid, trialing, active, past_due, canceled';
