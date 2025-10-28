# Referral System Requirements

**Last Updated:** October 26, 2025
**Status:** Planning Phase

---

## Overview

The referral system allows existing coaches to refer new coaches to ScheduleCoaches. When a new coach signs up using a referral code, they receive a discount on their subscription, and the referrer earns a commission.

---

## Business Objectives

1. **Customer Acquisition:** Leverage existing coaches to acquire new customers
2. **Customer Retention:** Incentivize referrers to ensure referred coaches succeed
3. **Cost-Effective Growth:** Lower CAC compared to paid advertising
4. **Community Building:** Create advocate network of successful coaches

---

## Business Rules

### Referral Codes

1. **Code Format:** `[USERNAME][NUMBER]` (e.g., `RYAN10`, `SARAH20`, `COACH42`)
   - Uppercase letters only
   - Alphanumeric (A-Z, 0-9)
   - Minimum 5 characters, maximum 20 characters
   - Must be unique across all users

2. **Code Generation:**
   - User can request a referral code from Account page
   - System suggests code based on user's name/email
   - User can customize code (subject to availability)
   - One code per user (no multiple codes)

3. **Code Activation:**
   - Code is active immediately upon creation
   - No expiration date (configurable in future)
   - Can be deactivated if user cancels subscription or violates terms

### Discounts

1. **Customer Discount:**
   - **Default:** 20% off first month
   - Configurable per code (future enhancement)
   - Applied automatically at checkout when code is used
   - One-time discount (not recurring)

2. **Discount Configuration:**
   - Managed via Stripe Coupons
   - All referral codes use the same coupon initially
   - Future: Allow custom discount amounts per referrer tier

### Commissions

1. **Commission Structure (Configurable):**

   **Option A: One-Time Payment** (Initial Implementation)
   - Fixed amount paid once (e.g., $10-20)
   - Paid after successful conversion and 30-day guarantee period
   - Simple to manage, manual payouts

   **Option B: Recurring Percentage** (Future)
   - Percentage of subscription (e.g., 20-25%)
   - Paid monthly for 6-12 months
   - Requires automated payout system

   **Option C: Hybrid** (Future)
   - Upfront payment + recurring percentage
   - Example: $5 upfront + $2/month for 12 months

2. **Commission Qualification:**
   - Referred customer must complete payment (not just signup)
   - Payment must clear successfully
   - 30-day waiting period before commission is earned
   - If customer refunds within 30 days, commission is void

3. **Commission Limits:**
   - No limit on number of referrals per user
   - Self-referrals not allowed (cannot use own code)
   - Family/business partner referrals allowed but monitored for abuse

### Restrictions

1. **Who Can Refer:**
   - Active paying coaches only (subscriptionStatus = 'active')
   - Account must be in good standing (no payment issues)
   - Must agree to referral program terms

2. **Who Can Be Referred:**
   - New users only (never had a subscription before)
   - Cannot use multiple codes (first code wins)
   - Cannot use own referral code

3. **Abuse Prevention:**
   - Track IP addresses for signup fraud detection
   - Monitor for churning patterns (signup → cancel → signup with different code)
   - Flag suspicious activity (same payment method, same address, etc.)
   - Manual review for high-volume referrers (>10/month)

---

## User Flows

### Flow 1: Referrer Creates Code

1. User logs into Account page
2. Navigates to "Referrals" section
3. Clicks "Get My Referral Code"
4. System checks eligibility:
   - ✅ Has active subscription
   - ✅ Doesn't already have a code
5. System suggests code based on name (e.g., "RYAN10")
6. User accepts or customizes code
7. System creates Stripe promotion code
8. System saves code to database
9. User sees their code + sharing instructions

**Success Criteria:**
- User has unique, active referral code
- Code is tracked in database
- Code is valid in Stripe

### Flow 2: New Customer Uses Code (URL Parameter)

1. User clicks referral link: `https://schedulecoaches.com/signup?ref=RYAN10`
2. Frontend captures `ref` parameter from URL
3. Frontend stores code in localStorage
4. User proceeds through signup flow (Google/Email/Apple)
5. User completes authentication
6. Frontend passes referral code to checkout session creation
7. Backend validates code exists and is active
8. Backend creates checkout session with promotion code pre-applied
9. User sees discounted price in Stripe checkout
10. User completes payment
11. Webhook records referral in database

**Success Criteria:**
- Discount automatically applied at checkout
- Customer sees reduced price
- Referral tracked in database

### Flow 3: New Customer Enters Code Manually

1. User navigates to signup page directly
2. User proceeds through authentication
3. On checkout page, Stripe shows "Add promotion code" link
4. User enters code manually (e.g., `RYAN10`)
5. Stripe validates code and applies discount
6. User completes payment
7. Webhook records referral in database

**Success Criteria:**
- User can manually enter code at checkout
- Code validation happens in Stripe
- Referral tracked in database

### Flow 4: Referrer Views Stats

1. User logs into Account page
2. Navigates to "Referrals" section
3. Sees referral statistics:
   - Total referrals (count)
   - Successful conversions (paid customers)
   - Pending commissions (qualified but not yet paid)
   - Paid commissions (total earned)
   - Active referrals (still subscribed)

**Success Criteria:**
- Accurate real-time statistics
- Clear breakdown of commission status
- Historical data preserved

### Flow 5: Admin Pays Commissions

1. Admin runs monthly commission report
2. Report shows all qualified commissions:
   - Referrals that completed 30-day waiting period
   - Commissions not yet marked as paid
3. Admin reviews for fraud/abuse
4. Admin processes payments via PayPal/Venmo/Bank Transfer
5. Admin marks commissions as paid in database
6. Referrers receive payment notification email

**Success Criteria:**
- Accurate commission calculations
- Clear audit trail
- Commissions not paid twice

---

## Data Requirements

### Database Tables

#### **1. ReferralCodes Table**
Stores unique referral codes for each user.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT IDENTITY | Primary key |
| `userId` | INT | Foreign key to Users table (referrer) |
| `code` | NVARCHAR(20) | Unique referral code (e.g., "RYAN10") |
| `stripePromotionCodeId` | NVARCHAR(255) | Stripe promotion code ID |
| `stripeCouponId` | NVARCHAR(255) | Stripe coupon ID |
| `isActive` | BIT | Whether code is currently active |
| `createdAt` | DATETIME | When code was created |
| `deactivatedAt` | DATETIME | When code was deactivated (nullable) |

**Indexes:**
- Primary key on `id`
- Unique index on `code`
- Index on `userId`

#### **2. Referrals Table**
Tracks each successful referral and commission status.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT IDENTITY | Primary key |
| `referralCodeId` | INT | Foreign key to ReferralCodes table |
| `referrerUserId` | INT | Foreign key to Users (who referred) |
| `referredUserId` | INT | Foreign key to Users (new customer) |
| `referralCode` | NVARCHAR(20) | Code used (denormalized for reporting) |
| `stripeCheckoutSessionId` | NVARCHAR(255) | Checkout session ID |
| `stripeSubscriptionId` | NVARCHAR(255) | Subscription ID |
| `discountAmount` | INT | Discount given in cents (e.g., 400 = $4) |
| `subscriptionAmount` | INT | Full subscription amount in cents (e.g., 2000 = $20) |
| `commissionAmount` | INT | Commission owed in cents (e.g., 1000 = $10) |
| `commissionType` | NVARCHAR(20) | 'one_time' or 'recurring' |
| `commissionStatus` | NVARCHAR(20) | 'pending', 'qualified', 'paid', 'void' |
| `qualifiedAt` | DATETIME | When commission became qualified (30 days after signup) |
| `paidAt` | DATETIME | When commission was paid |
| `paidAmount` | INT | Amount paid in cents (for recurring, tracks total paid so far) |
| `paidMethod` | NVARCHAR(50) | 'paypal', 'venmo', 'bank_transfer', etc. |
| `paidReference` | NVARCHAR(255) | PayPal transaction ID, etc. |
| `voidedAt` | DATETIME | If customer refunded/cancelled within 30 days |
| `voidReason` | NVARCHAR(255) | Reason commission was voided |
| `createdAt` | DATETIME | When referral was recorded |

**Indexes:**
- Primary key on `id`
- Index on `referrerUserId` (for stats queries)
- Index on `referredUserId` (prevent duplicate referrals)
- Index on `commissionStatus` (for payout queries)
- Index on `qualifiedAt` (for finding commissions ready to pay)

#### **3. RecurringCommissions Table** (Future - For Recurring Payouts)
Tracks monthly recurring commission payments.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT IDENTITY | Primary key |
| `referralId` | INT | Foreign key to Referrals table |
| `paymentPeriod` | DATE | Month of subscription payment (e.g., 2025-11-01) |
| `subscriptionAmount` | INT | Subscription amount in cents |
| `commissionAmount` | INT | Commission for this period in cents |
| `commissionStatus` | NVARCHAR(20) | 'pending', 'qualified', 'paid', 'void' |
| `paidAt` | DATETIME | When paid |
| `paidMethod` | NVARCHAR(50) | Payment method |
| `paidReference` | NVARCHAR(255) | Transaction reference |
| `createdAt` | DATETIME | When record was created |

**Indexes:**
- Primary key on `id`
- Index on `referralId`
- Index on `paymentPeriod`
- Index on `commissionStatus`

---

## Configuration

### System Configuration Table
Store referral system settings in database for easy updates without code changes.

**Table: SystemConfig**

| Key | Value | Description |
|-----|-------|-------------|
| `referral_discount_percent` | `20` | Discount percentage for customers |
| `referral_commission_type` | `one_time` | 'one_time' or 'recurring' |
| `referral_commission_amount` | `1000` | Amount in cents (e.g., 1000 = $10) |
| `referral_commission_percent` | `20` | Percentage for recurring (e.g., 20 = 20%) |
| `referral_commission_months` | `12` | Number of months for recurring |
| `referral_qualification_days` | `30` | Days before commission qualifies |
| `referral_max_per_user` | `100` | Max referrals per user per month (abuse prevention) |
| `referral_enabled` | `true` | Global on/off switch |

---

## Business Metrics to Track

### Key Performance Indicators (KPIs)

1. **Referral Conversion Rate:**
   - (Paid Referrals / Total Signups with Code) × 100%
   - Target: >50%

2. **Referral Program ROI:**
   - (LTV of Referred Customers - Total Commissions Paid) / Total Commissions Paid
   - Target: >300%

3. **Active Referrers:**
   - Number of users with active referral codes
   - Number of users with ≥1 successful referral
   - Target: 10% of active coaches

4. **Referral Attribution:**
   - % of new customers acquired via referrals
   - Target: 20-30% of new signups

5. **Average Referrals per Referrer:**
   - Total referrals / Active referrers
   - Target: 2-3 per referrer

### Reports Needed

1. **Monthly Commission Report:**
   - All qualified commissions pending payment
   - Grouped by referrer
   - Total amount owed

2. **Referral Performance Report:**
   - Top referrers by conversion count
   - Top referrers by revenue generated
   - Referral code usage statistics

3. **Fraud Detection Report:**
   - High-velocity referrals (>5/day from one user)
   - Same IP address signups
   - Same payment method across referrals
   - Churn patterns

---

## Success Criteria

### Phase 1: MVP Launch
- ✅ Users can create unique referral codes
- ✅ Codes work via URL parameter (ref=CODE)
- ✅ Codes work via manual entry at checkout
- ✅ Discounts applied automatically
- ✅ Referrals tracked in database
- ✅ Referrer can view stats in Account page
- ✅ Admin can run commission report
- ✅ Commissions paid manually via PayPal

### Phase 2: Automation (6-12 months)
- ✅ Automated commission payments via Stripe Connect
- ✅ Email notifications for referrers
- ✅ Recurring commission support
- ✅ Advanced fraud detection
- ✅ Referrer leaderboard
- ✅ Custom discount amounts per referrer tier

---

## Open Questions & Decisions Needed

### Configuration Decisions
- [ ] **Discount Amount:** 20% off first month? 50% off? $10 flat discount?
- [ ] **Commission Type:** One-time? Recurring? Hybrid?
- [ ] **Commission Amount:** If one-time: $10? $15? $20?
- [ ] **Commission Amount:** If recurring: 20% for how many months?
- [ ] **Qualification Period:** 30 days? 60 days? After first successful payment only?
- [ ] **Payout Frequency:** Monthly? Quarterly? When balance reaches $50?

### Technical Decisions
- [ ] **Code Suggestions:** How to generate suggested codes? (First name? Last name? Username?)
- [ ] **Code Validation:** Client-side only or server-side API?
- [ ] **Promotion Code Reuse:** Can deactivated codes be reactivated? Or create new code?
- [ ] **Historical Data:** Keep voided referrals in database or soft-delete?

### Business Decisions
- [ ] **Eligibility:** Can free/trial users refer? Or only paying coaches?
- [ ] **Stackability:** Can referral codes stack with other promotions? (Probably no)
- [ ] **Retroactive:** Do existing customers get referral codes? (Probably yes)
- [ ] **Minimum Payout:** Is there a minimum balance before payout? (e.g., must earn $25 before payment)

---

## Risk Assessment

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Stripe promotion code conflicts | Low | Medium | Check for duplicates before creation |
| Database sync issues with Stripe | Medium | High | Webhook retry logic + manual reconciliation |
| Race conditions (same code used simultaneously) | Low | Low | Stripe handles this atomically |
| Code generation collisions | Low | Low | Validate uniqueness before saving |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Referral fraud/abuse | Medium | High | 30-day qualification, manual review for high-volume |
| Unprofitable commission structure | Medium | High | Start conservative, adjust based on LTV data |
| Low adoption rate | Medium | Medium | Make codes easy to share, provide marketing materials |
| Commission payment disputes | Low | Medium | Clear terms, automated tracking, transparent dashboard |

### Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Manual payout errors | Medium | Medium | Double-check reports, require approval workflow |
| Missed commission payments | Low | High | Automated monthly reminders, commission aging report |
| Customer support load | Medium | Low | Clear FAQ, self-service stats dashboard |

---

## Compliance & Legal

### Terms & Conditions
- [ ] Update Terms of Service to include referral program terms
- [ ] Define what happens if referrer cancels subscription
- [ ] Define what happens if referred customer cancels
- [ ] Define abuse/fraud consequences
- [ ] Define commission payment timeline and method

### Tax Implications
- [ ] Issue 1099 forms if commissions exceed $600/year (US)
- [ ] Collect W-9 forms from referrers earning >$600
- [ ] Track total annual commissions per referrer

### Privacy
- [ ] Referrer can see count of referrals but not personal info
- [ ] Referred customer doesn't see who referred them (unless we want to show this)
- [ ] Comply with GDPR/CCPA for data handling

---

## Future Enhancements

### Phase 3+
1. **Tiered Commissions:**
   - Bronze tier: 1-5 referrals → $10 each
   - Silver tier: 6-15 referrals → $15 each
   - Gold tier: 16+ referrals → $20 each

2. **Referral Bonuses:**
   - Bonus for 10th referral: $50
   - Bonus for 25th referral: $100

3. **Two-Way Rewards:**
   - Give referred customer a free month after 3 months
   - Give referrer bonus if their referral stays 6+ months

4. **Social Sharing:**
   - One-click share to Facebook, Twitter, LinkedIn
   - Pre-written social media posts
   - Branded graphics for sharing

5. **Affiliate Program:**
   - Convert top referrers to official affiliates
   - Provide marketing materials
   - Higher commission rates

6. **Gamification:**
   - Leaderboard of top referrers
   - Badges for milestones
   - Monthly contests

---

## Next Steps

1. ✅ Review and finalize business requirements (this document)
2. ⏳ Create implementation plan (technical spec)
3. ⏳ Create database migration scripts
4. ⏳ Implement backend API endpoints
5. ⏳ Implement frontend UI
6. ⏳ Configure Stripe coupons and promotion codes
7. ⏳ Create admin commission payout workflow
8. ⏳ Test end-to-end flows
9. ⏳ Deploy to production
10. ⏳ Monitor and optimize

---

**Document Owner:** ScheduleCoaches Team
**Review Frequency:** Monthly (adjust based on performance data)
