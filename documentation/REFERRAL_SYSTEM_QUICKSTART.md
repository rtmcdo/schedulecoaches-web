# Referral System - Quick Start Guide

**Last Updated:** October 26, 2025

This is a condensed guide for implementing the referral system. For full details, see:
- **Requirements:** `REFERRAL_SYSTEM_REQUIREMENTS.md`
- **Implementation:** `REFERRAL_SYSTEM_IMPLEMENTATION.md`

---

## Overview

**What it does:**
- Users get unique referral codes (e.g., `RYAN10`)
- New signups use code → get discount (20% off first month)
- Referrer earns commission ($10-20 one-time, or recurring)
- Track everything in database, manual payouts

---

## Quick Implementation Checklist

### 1. Database Setup

```bash
# Run migration script
# File: api/migrations/001_create_referral_tables.sql
```

**Tables created:**
- `ReferralCodes` - User referral codes
- `Referrals` - Track successful referrals
- `RecurringCommissions` - For future recurring payouts
- `SystemConfig` - Configuration settings

### 2. Stripe Setup

**Create Coupon:**
```bash
stripe coupons create \
  --percent-off 20 \
  --duration once \
  --name "Referral Discount - 20% Off First Month"
```

**Copy Coupon ID** (e.g., `coupon_abc123`)

**Add to Environment Variables:**
```bash
# Azure Function App Settings
STRIPE_REFERRAL_COUPON_ID=coupon_abc123
```

### 3. Backend API - New Endpoints

**Files to create:**
```
api/src/functions/
  ├── createReferralCode.ts      - POST /api/create-referral-code
  ├── validateReferralCode.ts    - GET /api/validate-referral-code?code=X
  ├── getReferralStats.ts        - GET /api/referral-stats
  ├── getCommissionReport.ts     - GET /api/commission-report (admin)
  └── markCommissionPaid.ts      - POST /api/mark-commission-paid (admin)

api/src/services/
  └── referralService.ts         - Business logic

```

**Files to modify:**
```
api/src/functions/
  ├── createCheckoutSession.ts   - Accept referralCode parameter
  └── stripeWebhook.ts           - Record referrals on checkout.session.completed
```

### 4. Frontend UI - Changes

**Account.vue** - Add referral section:
- Button: "Get My Referral Code"
- Display code + share URL
- Show referral stats (count, earnings)

**SignUp.vue** - Capture referral code:
- Parse `?ref=CODE` from URL
- Store in localStorage
- Pass to checkout session API

### 5. Configuration

**Set these values in SystemConfig table:**

| Key | Value | Notes |
|-----|-------|-------|
| `referral_discount_percent` | `20` | Discount for customers |
| `referral_commission_type` | `one_time` | or `recurring` |
| `referral_commission_amount` | `1000` | $10 in cents |
| `referral_commission_percent` | `20` | For recurring only |
| `referral_commission_months` | `12` | For recurring only |
| `referral_qualification_days` | `30` | Days before payout |

---

## Testing Flow

### Test Case: End-to-End Referral

1. **Login as User A** (active subscription)
   - Go to Account page
   - Click "Get My Referral Code"
   - See code: `USERA10`
   - Copy share URL: `https://schedulecoaches.com/signup?ref=USERA10`

2. **Open incognito/new browser**
   - Paste share URL
   - Complete signup (Google/Email/Apple)
   - Proceed to checkout
   - **Verify:** Price shows 20% discount ($16 instead of $20)
   - Complete payment (use test card `4242 4242 4242 4242`)

3. **Check Database:**
   ```sql
   SELECT * FROM Referrals ORDER BY createdAt DESC;
   ```
   **Verify:**
   - Referral recorded
   - `referrerUserId` = User A's ID
   - `referredUserId` = User B's ID
   - `discountAmount` = 400 (cents)
   - `commissionAmount` = 1000 (cents)
   - `commissionStatus` = 'pending'
   - `qualifiedAt` = 30 days from now

4. **After 30 Days:**
   - Run qualification job (or wait for scheduled task)
   - Commission status changes to 'qualified'

5. **Manual Payout:**
   - Admin runs commission report
   - Pays User A via PayPal
   - Marks commission as paid

---

## Key API Endpoints

### Create Referral Code
```bash
POST /api/create-referral-code
Authorization: Bearer <token>
Content-Type: application/json

# Optional: specify custom code
{
  "code": "MYCODE10"
}

# Response:
{
  "success": true,
  "referralCode": {
    "id": 123,
    "userId": 456,
    "code": "MYCODE10",
    "shareUrl": "https://schedulecoaches.com/signup?ref=MYCODE10",
    "isActive": true,
    "createdAt": "2025-10-26T12:00:00Z"
  }
}
```

### Validate Code
```bash
GET /api/validate-referral-code?code=MYCODE10

# Response:
{
  "valid": true,
  "code": "MYCODE10",
  "discountPercent": 20,
  "stripePromotionCodeId": "promo_abc123"
}
```

### Get Referral Stats
```bash
GET /api/referral-stats
Authorization: Bearer <token>

# Response:
{
  "userId": 456,
  "referralCode": "MYCODE10",
  "stats": {
    "totalReferrals": 15,
    "successfulConversions": 12,
    "pendingCommissions": {
      "count": 3,
      "amount": 3000
    },
    "qualifiedCommissions": {
      "count": 5,
      "amount": 5000
    },
    "paidCommissions": {
      "count": 4,
      "amount": 4000,
      "totalLifetime": 4000
    }
  }
}
```

### Create Checkout with Referral Code
```bash
POST /api/create-checkout-session
Authorization: Bearer <token>
Content-Type: application/json

{
  "lookupKey": "pickleball_monthly",
  "referralCode": "MYCODE10"  # NEW
}

# Stripe checkout will have discount pre-applied
```

---

## Manual Payout Process

### Monthly Workflow (1st Monday of month)

**Step 1: Generate Report**
```sql
-- Get all qualified commissions
SELECT
    r.id AS referralId,
    u.email AS referrerEmail,
    u.firstName + ' ' + u.lastName AS referrerName,
    r.commissionAmount / 100.0 AS amountDollars,
    r.qualifiedAt,
    r.referralCode
FROM Referrals r
INNER JOIN Users u ON r.referrerUserId = u.id
WHERE r.commissionStatus = 'qualified'
ORDER BY u.email;

-- Get summary by referrer
SELECT
    u.email,
    COUNT(*) AS commissionCount,
    SUM(r.commissionAmount) / 100.0 AS totalDollars
FROM Referrals r
INNER JOIN Users u ON r.referrerUserId = u.id
WHERE r.commissionStatus = 'qualified'
GROUP BY u.email
ORDER BY totalDollars DESC;
```

**Step 2: Pay via PayPal/Venmo**
- Send payments to referrer emails
- Keep transaction IDs

**Step 3: Mark as Paid**
```sql
UPDATE Referrals
SET
    commissionStatus = 'paid',
    paidAt = GETDATE(),
    paidAmount = commissionAmount,
    paidMethod = 'paypal',
    paidReference = 'PAYPAL-TXN-123456'
WHERE id IN (123, 456, 789);  -- IDs from report
```

**Or use API:**
```bash
POST /api/mark-commission-paid
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "referralIds": [123, 456, 789],
  "paidMethod": "paypal",
  "paidReference": "PAYPAL-BATCH-123456"
}
```

---

## Configuration Options

### One-Time Commission ($10)
```sql
UPDATE SystemConfig SET configValue = 'one_time' WHERE configKey = 'referral_commission_type';
UPDATE SystemConfig SET configValue = '1000' WHERE configKey = 'referral_commission_amount';
```

### One-Time Commission ($20)
```sql
UPDATE SystemConfig SET configValue = 'one_time' WHERE configKey = 'referral_commission_type';
UPDATE SystemConfig SET configValue = '2000' WHERE configKey = 'referral_commission_amount';
```

### Recurring Commission (25% for 12 months)
```sql
UPDATE SystemConfig SET configValue = 'recurring' WHERE configKey = 'referral_commission_type';
UPDATE SystemConfig SET configValue = '25' WHERE configKey = 'referral_commission_percent';
UPDATE SystemConfig SET configValue = '12' WHERE configKey = 'referral_commission_months';
```

### Change Discount Amount (50% off)
```sql
UPDATE SystemConfig SET configValue = '50' WHERE configKey = 'referral_discount_percent';
```

**Note:** After changing discount, you need to create a new Stripe coupon and update `STRIPE_REFERRAL_COUPON_ID`.

---

## Troubleshooting

### Issue: Code creation fails
**Check:**
- User has active subscription (`subscriptionStatus = 'active'`)
- User doesn't already have a code
- Code format is valid (5-20 alphanumeric characters)

### Issue: Discount not applied at checkout
**Check:**
- Referral code exists in database and `isActive = 1`
- Stripe promotion code was created successfully
- `stripePromotionCodeId` is populated in database
- Check Stripe Dashboard → Promotion Codes for the code

### Issue: Referral not recorded
**Check:**
- Stripe webhook is receiving events
- `checkout.session.completed` event has `metadata.referral_code`
- User hasn't already been referred
- Not a self-referral (referrer ≠ referred)

### Issue: Commission stays "pending" after 30 days
**Run qualification update:**
```sql
UPDATE Referrals
SET commissionStatus = 'qualified'
WHERE commissionStatus = 'pending'
  AND qualifiedAt <= GETDATE()
  AND referredUserId IN (
    SELECT id FROM Users WHERE subscriptionStatus = 'active'
  );
```

---

## Security Checklist

- ✅ SQL injection prevention (parameterized queries)
- ✅ Prevent self-referral (check `referrerUserId ≠ referredUserId`)
- ✅ Prevent duplicate referrals (check existing referral before creating)
- ✅ Require authentication for creating codes
- ✅ Require active subscription to create code
- ✅ Admin-only access for commission reports and payouts
- ✅ Code uniqueness validation
- ✅ Rate limiting on API endpoints

---

## Monitoring Queries

### Daily Health Check
```sql
-- Active referral codes
SELECT COUNT(*) AS activeReferralCodes
FROM ReferralCodes WHERE isActive = 1;

-- Referrals today
SELECT COUNT(*) AS referralsToday
FROM Referrals
WHERE CAST(createdAt AS DATE) = CAST(GETDATE() AS DATE);

-- Qualified commissions not yet paid
SELECT
    COUNT(*) AS count,
    SUM(commissionAmount) / 100.0 AS totalDollars
FROM Referrals
WHERE commissionStatus = 'qualified';

-- Pending commissions (awaiting qualification)
SELECT
    COUNT(*) AS count,
    SUM(commissionAmount) / 100.0 AS totalDollars
FROM Referrals
WHERE commissionStatus = 'pending';
```

### Fraud Detection
```sql
-- High-velocity referrers (>10 referrals in one day)
SELECT
    referrerUserId,
    u.email,
    COUNT(*) AS referralsToday
FROM Referrals r
INNER JOIN Users u ON r.referrerUserId = u.id
WHERE CAST(r.createdAt AS DATE) = CAST(GETDATE() AS DATE)
GROUP BY referrerUserId, u.email
HAVING COUNT(*) > 10;

-- Self-referrals (should be none)
SELECT * FROM Referrals
WHERE referrerUserId = referredUserId;
```

---

## Next Steps After Implementation

1. **Test thoroughly** with test Stripe keys
2. **Run through all test cases** in REFERRAL_SYSTEM_IMPLEMENTATION.md
3. **Deploy to production:**
   - Database migration first
   - Backend API
   - Frontend UI
4. **Monitor for 1 week:**
   - Check webhook delivery
   - Check referral recording
   - Check stats accuracy
5. **First payout** after 30 days
6. **Optimize based on data:**
   - Adjust commission amounts
   - Change discount percentage
   - Consider recurring commissions

---

## FAQ

**Q: Can users create multiple referral codes?**
A: No, one code per user. Constraint: `UQ_ReferralCodes_UserId`

**Q: Can a new customer use multiple referral codes?**
A: No, first code wins. Check prevents duplicate referrals.

**Q: What if customer refunds within 30 days?**
A: Commission is automatically voided when subscription is cancelled.

**Q: Can free/trial users refer?**
A: No, only active paying coaches (`subscriptionStatus = 'active'`).

**Q: How do I change commission amounts?**
A: Update `SystemConfig` table. See Configuration Options above.

**Q: Can I disable the referral program temporarily?**
A: Yes: `UPDATE SystemConfig SET configValue = 'false' WHERE configKey = 'referral_enabled'`

**Q: What if Stripe promotion code creation fails?**
A: Transaction rolls back, user sees error, can try different code.

---

## Support

For questions or issues:
1. Check REFERRAL_SYSTEM_REQUIREMENTS.md for business rules
2. Check REFERRAL_SYSTEM_IMPLEMENTATION.md for technical details
3. Check Application Insights logs for errors
4. Check Stripe Dashboard for webhook delivery status

---

**Quick Reference:**
- **Requirements Doc:** `REFERRAL_SYSTEM_REQUIREMENTS.md`
- **Implementation Doc:** `REFERRAL_SYSTEM_IMPLEMENTATION.md`
- **Database Migration:** `api/migrations/001_create_referral_tables.sql`
- **Main Service:** `api/src/services/referralService.ts`
