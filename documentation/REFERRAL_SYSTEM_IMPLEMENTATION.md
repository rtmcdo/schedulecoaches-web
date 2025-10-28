# Referral System Implementation Plan

**Last Updated:** October 26, 2025
**Status:** Planning Phase
**Prerequisites:** REFERRAL_SYSTEM_REQUIREMENTS.md

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Stripe Configuration](#stripe-configuration)
4. [Backend API](#backend-api)
5. [Frontend Changes](#frontend-changes)
6. [Testing Plan](#testing-plan)
7. [Deployment Plan](#deployment-plan)
8. [Manual Payout Process](#manual-payout-process)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER FLOWS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Referrer                          New Customer                │
│     │                                   │                       │
│     v                                   v                       │
│  Account Page                    Signup Page                    │
│  "Get Code"                      ?ref=RYAN10                    │
│     │                                   │                       │
│     v                                   v                       │
│  POST /api/create-referral-code   POST /api/validate-code      │
│     │                                   │                       │
│     v                                   v                       │
│  Display Code                     POST /api/create-checkout    │
│  + Share Link                     (with code)                   │
│                                         │                       │
│                                         v                       │
│                                    Stripe Checkout              │
│                                    (discount applied)           │
│                                         │                       │
│                                         v                       │
│                                    Payment Success              │
│                                         │                       │
│                                         v                       │
│                                  POST /api/webhook              │
│                                  checkout.session.completed     │
│                                         │                       │
│                                         v                       │
│                                  Record Referral                │
│                                  in Database                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Frontend   │◄────►│   Azure      │◄────►│   Stripe     │
│   (Vue.js)   │      │  Functions   │      │     API      │
└──────────────┘      └──────┬───────┘      └──────────────┘
                             │
                             v
                      ┌──────────────┐
                      │  Azure SQL   │
                      │   Database   │
                      └──────────────┘
```

---

## Database Schema

### Migration Script: `001_create_referral_tables.sql`

```sql
-- ============================================================
-- REFERRAL SYSTEM DATABASE SCHEMA
-- Version: 1.0
-- Description: Tables for referral codes, tracking, and commissions
-- ============================================================

-- ============================================================
-- 1. ReferralCodes Table
-- Stores unique referral codes for each user
-- ============================================================
CREATE TABLE ReferralCodes (
    id INT IDENTITY(1,1) PRIMARY KEY,
    userId INT NOT NULL,
    code NVARCHAR(20) NOT NULL,
    stripePromotionCodeId NVARCHAR(255) NULL,
    stripeCouponId NVARCHAR(255) NULL,
    isActive BIT NOT NULL DEFAULT 1,
    createdAt DATETIME NOT NULL DEFAULT GETDATE(),
    deactivatedAt DATETIME NULL,

    -- Foreign key
    CONSTRAINT FK_ReferralCodes_Users FOREIGN KEY (userId)
        REFERENCES Users(id) ON DELETE CASCADE,

    -- Unique constraints
    CONSTRAINT UQ_ReferralCodes_Code UNIQUE (code),
    CONSTRAINT UQ_ReferralCodes_UserId UNIQUE (userId)
);

-- Indexes
CREATE INDEX IX_ReferralCodes_UserId ON ReferralCodes(userId);
CREATE INDEX IX_ReferralCodes_IsActive ON ReferralCodes(isActive);

-- ============================================================
-- 2. Referrals Table
-- Tracks each successful referral and commission status
-- ============================================================
CREATE TABLE Referrals (
    id INT IDENTITY(1,1) PRIMARY KEY,
    referralCodeId INT NOT NULL,
    referrerUserId INT NOT NULL,
    referredUserId INT NOT NULL,
    referralCode NVARCHAR(20) NOT NULL,          -- Denormalized for reporting

    -- Stripe data
    stripeCheckoutSessionId NVARCHAR(255) NULL,
    stripeSubscriptionId NVARCHAR(255) NULL,

    -- Financial data (amounts in cents)
    discountAmount INT NOT NULL,                 -- e.g., 400 = $4
    subscriptionAmount INT NOT NULL,             -- e.g., 2000 = $20
    commissionAmount INT NOT NULL,               -- e.g., 1000 = $10

    -- Commission tracking
    commissionType NVARCHAR(20) NOT NULL,        -- 'one_time' or 'recurring'
    commissionStatus NVARCHAR(20) NOT NULL DEFAULT 'pending',
        -- 'pending', 'qualified', 'paid', 'void'

    -- Dates
    qualifiedAt DATETIME NULL,                   -- 30 days after signup
    paidAt DATETIME NULL,
    paidAmount INT NULL,                         -- For recurring, total paid so far

    -- Payment details
    paidMethod NVARCHAR(50) NULL,                -- 'paypal', 'venmo', 'bank_transfer'
    paidReference NVARCHAR(255) NULL,            -- Transaction ID

    -- Void tracking
    voidedAt DATETIME NULL,
    voidReason NVARCHAR(255) NULL,

    createdAt DATETIME NOT NULL DEFAULT GETDATE(),

    -- Foreign keys
    CONSTRAINT FK_Referrals_ReferralCodeId FOREIGN KEY (referralCodeId)
        REFERENCES ReferralCodes(id) ON DELETE NO ACTION,
    CONSTRAINT FK_Referrals_ReferrerUserId FOREIGN KEY (referrerUserId)
        REFERENCES Users(id) ON DELETE NO ACTION,
    CONSTRAINT FK_Referrals_ReferredUserId FOREIGN KEY (referredUserId)
        REFERENCES Users(id) ON DELETE NO ACTION,

    -- Check constraints
    CONSTRAINT CK_Referrals_CommissionStatus CHECK (
        commissionStatus IN ('pending', 'qualified', 'paid', 'void')
    ),
    CONSTRAINT CK_Referrals_CommissionType CHECK (
        commissionType IN ('one_time', 'recurring')
    )
);

-- Indexes
CREATE INDEX IX_Referrals_ReferrerUserId ON Referrals(referrerUserId);
CREATE INDEX IX_Referrals_ReferredUserId ON Referrals(referredUserId);
CREATE INDEX IX_Referrals_CommissionStatus ON Referrals(commissionStatus);
CREATE INDEX IX_Referrals_QualifiedAt ON Referrals(qualifiedAt);
CREATE INDEX IX_Referrals_StripeSubscriptionId ON Referrals(stripeSubscriptionId);

-- ============================================================
-- 3. RecurringCommissions Table (Future)
-- Tracks monthly recurring commission payments
-- ============================================================
CREATE TABLE RecurringCommissions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    referralId INT NOT NULL,
    paymentPeriod DATE NOT NULL,                 -- e.g., '2025-11-01'
    subscriptionAmount INT NOT NULL,             -- Amount in cents
    commissionAmount INT NOT NULL,               -- Amount in cents
    commissionStatus NVARCHAR(20) NOT NULL DEFAULT 'pending',
    paidAt DATETIME NULL,
    paidMethod NVARCHAR(50) NULL,
    paidReference NVARCHAR(255) NULL,
    createdAt DATETIME NOT NULL DEFAULT GETDATE(),

    -- Foreign keys
    CONSTRAINT FK_RecurringCommissions_ReferralId FOREIGN KEY (referralId)
        REFERENCES Referrals(id) ON DELETE CASCADE,

    -- Check constraints
    CONSTRAINT CK_RecurringCommissions_Status CHECK (
        commissionStatus IN ('pending', 'qualified', 'paid', 'void')
    ),

    -- Unique constraint (one commission per referral per period)
    CONSTRAINT UQ_RecurringCommissions_Period UNIQUE (referralId, paymentPeriod)
);

-- Indexes
CREATE INDEX IX_RecurringCommissions_ReferralId ON RecurringCommissions(referralId);
CREATE INDEX IX_RecurringCommissions_PaymentPeriod ON RecurringCommissions(paymentPeriod);
CREATE INDEX IX_RecurringCommissions_Status ON RecurringCommissions(commissionStatus);

-- ============================================================
-- 4. SystemConfig Table (Configuration)
-- Store system-wide referral configuration
-- ============================================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'SystemConfig')
BEGIN
    CREATE TABLE SystemConfig (
        configKey NVARCHAR(100) PRIMARY KEY,
        configValue NVARCHAR(MAX) NOT NULL,
        description NVARCHAR(500) NULL,
        updatedAt DATETIME NOT NULL DEFAULT GETDATE()
    );
END;

-- Insert default referral configuration
INSERT INTO SystemConfig (configKey, configValue, description) VALUES
    ('referral_discount_percent', '20', 'Discount percentage for referred customers'),
    ('referral_commission_type', 'one_time', 'Commission type: one_time or recurring'),
    ('referral_commission_amount', '1000', 'Commission amount in cents (for one_time)'),
    ('referral_commission_percent', '20', 'Commission percentage (for recurring)'),
    ('referral_commission_months', '12', 'Number of months for recurring commission'),
    ('referral_qualification_days', '30', 'Days before commission qualifies'),
    ('referral_max_per_user', '100', 'Max referrals per user per month'),
    ('referral_enabled', 'true', 'Global on/off switch for referral program');

-- ============================================================
-- Verification Queries
-- ============================================================

-- Count tables created
SELECT
    'ReferralCodes' AS TableName, COUNT(*) AS RowCount FROM ReferralCodes
UNION ALL
SELECT
    'Referrals', COUNT(*) FROM Referrals
UNION ALL
SELECT
    'RecurringCommissions', COUNT(*) FROM RecurringCommissions
UNION ALL
SELECT
    'SystemConfig (referral)', COUNT(*) FROM SystemConfig WHERE configKey LIKE 'referral%';
```

### Rollback Script: `001_rollback_referral_tables.sql`

```sql
-- Rollback script for referral system
-- WARNING: This will delete all referral data!

DROP TABLE IF EXISTS RecurringCommissions;
DROP TABLE IF EXISTS Referrals;
DROP TABLE IF EXISTS ReferralCodes;

-- Remove referral config (optional - keep if you want to preserve settings)
DELETE FROM SystemConfig WHERE configKey LIKE 'referral%';
```

---

## Stripe Configuration

### Step 1: Create Coupon

**Via Stripe Dashboard:**
1. Go to **Products → Coupons**
2. Click **Create coupon**
3. Configure:
   - **Name:** "Referral Discount - 20% Off First Month"
   - **Type:** Percentage discount
   - **Percentage:** 20%
   - **Duration:** Once
   - **Redemption limits:** None

**Via Stripe CLI:**
```bash
stripe coupons create \
  --percent-off 20 \
  --duration once \
  --name "Referral Discount - 20% Off First Month" \
  --metadata program=referral
```

**Via API (in Azure Function):**
```typescript
const coupon = await stripe.coupons.create({
  percent_off: 20,
  duration: 'once',
  name: 'Referral Discount - 20% Off First Month',
  metadata: { program: 'referral' }
});
```

**Save the Coupon ID** (e.g., `coupon_abc123`) - you'll need it for promotion codes.

### Step 2: Create Promotion Codes Dynamically

Promotion codes will be created when users request referral codes.

**Note:** Do NOT create promotion codes manually. They will be created via API when user requests a code.

### Step 3: Update Checkout Session Creation

No changes needed in Stripe Dashboard. Changes will be in code (see Backend API section).

---

## Backend API

### File Structure

```
api/src/
├── functions/
│   ├── createReferralCode.ts       (NEW)
│   ├── validateReferralCode.ts     (NEW)
│   ├── getReferralStats.ts         (NEW)
│   ├── getCommissionReport.ts      (NEW)
│   ├── markCommissionPaid.ts       (NEW)
│   ├── createCheckoutSession.ts    (MODIFY)
│   └── stripeWebhook.ts            (MODIFY)
├── services/
│   ├── referralService.ts          (NEW)
│   └── stripeService.ts            (MODIFY)
└── utils/
    ├── database.ts
    └── auth.ts
```

### API Endpoints

#### 1. **POST /api/create-referral-code**

**Description:** Create a unique referral code for authenticated user

**Authentication:** Required (Bearer token)

**Request Body:**
```typescript
{
  code?: string  // Optional custom code, or auto-generate
}
```

**Response:**
```typescript
{
  success: true,
  referralCode: {
    id: 123,
    userId: 456,
    code: "RYAN10",
    shareUrl: "https://schedulecoaches.com/signup?ref=RYAN10",
    isActive: true,
    createdAt: "2025-10-26T12:00:00Z"
  }
}
```

**Errors:**
- `400` - User already has a referral code
- `400` - Code already taken
- `400` - Invalid code format
- `401` - Not authenticated
- `403` - User not eligible (no active subscription)
- `500` - Server error

**Implementation:** `api/src/functions/createReferralCode.ts`

```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { authenticateToken } from "../utils/auth";
import { referralService } from "../services/referralService";

export async function createReferralCode(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Authenticate user
    const user = await authenticateToken(request, context);
    if (!user) {
      return { status: 401, jsonBody: { error: "Unauthorized" } };
    }

    // Check if user has active subscription
    if (user.subscriptionStatus !== 'active') {
      return {
        status: 403,
        jsonBody: { error: "Active subscription required to create referral code" }
      };
    }

    // Parse request body
    const body = await request.json() as { code?: string };
    const requestedCode = body?.code;

    // Create referral code
    const referralCode = await referralService.createReferralCode(user.id, requestedCode);

    return {
      status: 200,
      jsonBody: {
        success: true,
        referralCode: {
          id: referralCode.id,
          userId: referralCode.userId,
          code: referralCode.code,
          shareUrl: `https://schedulecoaches.com/signup?ref=${referralCode.code}`,
          isActive: referralCode.isActive,
          createdAt: referralCode.createdAt
        }
      }
    };
  } catch (error: any) {
    context.error("Error creating referral code:", error);

    if (error.message.includes("already has a referral code")) {
      return { status: 400, jsonBody: { error: error.message } };
    }
    if (error.message.includes("already taken")) {
      return { status: 400, jsonBody: { error: error.message } };
    }
    if (error.message.includes("Invalid code format")) {
      return { status: 400, jsonBody: { error: error.message } };
    }

    return { status: 500, jsonBody: { error: "Failed to create referral code" } };
  }
}

app.http("create-referral-code", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: createReferralCode,
});
```

---

#### 2. **GET /api/validate-referral-code?code=RYAN10**

**Description:** Validate a referral code exists and is active

**Authentication:** Not required (public endpoint)

**Query Parameters:**
- `code` (required) - The referral code to validate

**Response:**
```typescript
{
  valid: true,
  code: "RYAN10",
  discountPercent: 20,
  stripePromotionCodeId: "promo_abc123"
}
```

**Errors:**
- `400` - Missing code parameter
- `404` - Code not found or inactive

**Implementation:** `api/src/functions/validateReferralCode.ts`

```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { referralService } from "../services/referralService";

export async function validateReferralCode(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const code = request.query.get("code");

    if (!code) {
      return { status: 400, jsonBody: { error: "Code parameter required" } };
    }

    const referralCode = await referralService.validateReferralCode(code);

    if (!referralCode) {
      return { status: 404, jsonBody: { valid: false, error: "Code not found or inactive" } };
    }

    return {
      status: 200,
      jsonBody: {
        valid: true,
        code: referralCode.code,
        discountPercent: 20, // TODO: Get from SystemConfig
        stripePromotionCodeId: referralCode.stripePromotionCodeId
      }
    };
  } catch (error: any) {
    context.error("Error validating referral code:", error);
    return { status: 500, jsonBody: { error: "Failed to validate referral code" } };
  }
}

app.http("validate-referral-code", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: validateReferralCode,
});
```

---

#### 3. **GET /api/referral-stats**

**Description:** Get referral statistics for authenticated user

**Authentication:** Required (Bearer token)

**Response:**
```typescript
{
  userId: 456,
  referralCode: "RYAN10",
  stats: {
    totalReferrals: 15,
    successfulConversions: 12,
    pendingCommissions: {
      count: 3,
      amount: 3000  // $30 in cents
    },
    qualifiedCommissions: {
      count: 5,
      amount: 5000  // $50
    },
    paidCommissions: {
      count: 4,
      amount: 4000,  // $40
      totalLifetime: 4000
    },
    activeReferrals: 10  // Still subscribed
  },
  recentReferrals: [
    {
      referredUserEmail: "j***@example.com",  // Masked
      createdAt: "2025-10-20T10:00:00Z",
      commissionStatus: "qualified",
      commissionAmount: 1000
    }
  ]
}
```

**Implementation:** `api/src/functions/getReferralStats.ts`

---

#### 4. **GET /api/commission-report**

**Description:** Get commission report for admin (all users, filterable)

**Authentication:** Required (Bearer token + admin role)

**Query Parameters:**
- `status` - Filter by commission status (pending, qualified, paid, void)
- `startDate` - Filter by qualified date (ISO 8601)
- `endDate` - Filter by qualified date (ISO 8601)

**Response:**
```typescript
{
  reportDate: "2025-10-26",
  filters: {
    status: "qualified",
    startDate: "2025-10-01",
    endDate: "2025-10-31"
  },
  summary: {
    totalCommissions: 25,
    totalAmount: 25000,  // $250
    uniqueReferrers: 8
  },
  commissions: [
    {
      referralId: 123,
      referrerUserId: 456,
      referrerEmail: "referrer@example.com",
      referrerName: "Ryan McDonald",
      referredUserId: 789,
      referredEmail: "newcoach@example.com",
      referralCode: "RYAN10",
      commissionAmount: 1000,
      commissionStatus: "qualified",
      qualifiedAt: "2025-10-15T12:00:00Z",
      subscriptionId: "sub_abc123"
    }
  ]
}
```

**Implementation:** `api/src/functions/getCommissionReport.ts`

---

#### 5. **POST /api/mark-commission-paid**

**Description:** Mark commission(s) as paid (admin only)

**Authentication:** Required (Bearer token + admin role)

**Request Body:**
```typescript
{
  referralIds: [123, 456, 789],
  paidMethod: "paypal",
  paidReference: "PAYPAL-TXN-123456",
  paidAt: "2025-10-26T12:00:00Z"  // Optional, defaults to now
}
```

**Response:**
```typescript
{
  success: true,
  updated: 3,
  referralIds: [123, 456, 789]
}
```

**Implementation:** `api/src/functions/markCommissionPaid.ts`

---

#### 6. **MODIFY: POST /api/create-checkout-session**

**Changes:** Accept optional `referralCode` parameter

**Request Body (NEW):**
```typescript
{
  lookupKey: "pickleball_monthly",
  referralCode?: "RYAN10"  // NEW - optional referral code
}
```

**Implementation Changes:**

```typescript
// api/src/functions/createCheckoutSession.ts

export async function createCheckoutSession(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const user = await authenticateToken(request, context);
    const body = await request.json() as {
      lookupKey: string;
      referralCode?: string;  // NEW
    };

    // Validate referral code if provided
    let promotionCodeId: string | undefined;
    if (body.referralCode) {
      const referralCode = await referralService.validateReferralCode(body.referralCode);
      if (referralCode) {
        promotionCodeId = referralCode.stripePromotionCodeId;
        context.log(`Applying referral code: ${body.referralCode}`);
      } else {
        context.warn(`Invalid referral code provided: ${body.referralCode}`);
      }
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],

      // NEW: Apply promotion code if provided
      ...(promotionCodeId && {
        discounts: [{ promotion_code: promotionCodeId }]
      }),

      // Also allow manual entry
      allow_promotion_codes: true,

      success_url: `${process.env.DOMAIN}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.DOMAIN}/checkout/cancel`,
      metadata: {
        user_id: user.id.toString(),
        referral_code: body.referralCode || "",  // NEW
      },
    });

    return {
      status: 200,
      jsonBody: { url: session.url },
    };
  } catch (error: any) {
    context.error("Error creating checkout session:", error);
    return { status: 500, jsonBody: { error: "Failed to create checkout session" } };
  }
}
```

---

#### 7. **MODIFY: POST /api/webhook**

**Changes:** Track referrals when `checkout.session.completed` fires

**Implementation Changes:**

```typescript
// api/src/functions/stripeWebhook.ts

case "checkout.session.completed": {
  const session = event.data.object as Stripe.Checkout.Session;
  const userId = session.metadata?.user_id;
  const referralCode = session.metadata?.referral_code;

  // Existing user upgrade logic...
  // ...

  // NEW: Track referral if code was used
  if (referralCode) {
    try {
      await referralService.recordReferral({
        referralCode: referralCode,
        referredUserId: parseInt(userId),
        stripeCheckoutSessionId: session.id,
        stripeSubscriptionId: session.subscription as string,
        subscriptionAmount: session.amount_total || 2000,
        discountAmount: session.total_details?.amount_discount || 0
      });
      context.log(`Referral recorded for code: ${referralCode}`);
    } catch (error) {
      context.error("Failed to record referral:", error);
      // Don't fail webhook if referral tracking fails
    }
  }

  break;
}

// NEW: Handle subscription cancellations - void commission if within 30 days
case "customer.subscription.deleted": {
  const subscription = event.data.object as Stripe.Subscription;

  try {
    await referralService.checkAndVoidCommission(subscription.id);
  } catch (error) {
    context.error("Failed to void commission:", error);
  }

  break;
}
```

---

## Referral Service Implementation

### File: `api/src/services/referralService.ts`

```typescript
import { getConnection } from "../utils/database";
import * as sql from "mssql";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
});

export const referralService = {
  /**
   * Create a referral code for a user
   */
  async createReferralCode(userId: number, requestedCode?: string) {
    const connection = await getConnection();

    // Check if user already has a code
    const existing = await connection
      .request()
      .input("userId", sql.Int, userId)
      .query("SELECT * FROM ReferralCodes WHERE userId = @userId");

    if (existing.recordset.length > 0) {
      throw new Error("User already has a referral code");
    }

    // Generate code if not provided
    let code = requestedCode;
    if (!code) {
      // Get user info to suggest code
      const userResult = await connection
        .request()
        .input("userId", sql.Int, userId)
        .query("SELECT firstName, lastName, email FROM Users WHERE id = @userId");

      const user = userResult.recordset[0];
      code = this.suggestCode(user.firstName, user.lastName, user.email);
    }

    // Validate code format
    code = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (code.length < 5 || code.length > 20) {
      throw new Error("Invalid code format: must be 5-20 alphanumeric characters");
    }

    // Check if code is taken
    const codeCheck = await connection
      .request()
      .input("code", sql.NVarChar(20), code)
      .query("SELECT * FROM ReferralCodes WHERE code = @code");

    if (codeCheck.recordset.length > 0) {
      throw new Error(`Code ${code} is already taken`);
    }

    // Get coupon ID from config (or hardcode for now)
    const STRIPE_COUPON_ID = process.env.STRIPE_REFERRAL_COUPON_ID || "coupon_referral20";

    // Create Stripe promotion code
    const promoCode = await stripe.promotionCodes.create({
      coupon: STRIPE_COUPON_ID,
      code: code,
      metadata: {
        user_id: userId.toString(),
        program: "referral",
      },
    });

    // Save to database
    const result = await connection
      .request()
      .input("userId", sql.Int, userId)
      .input("code", sql.NVarChar(20), code)
      .input("stripePromotionCodeId", sql.NVarChar(255), promoCode.id)
      .input("stripeCouponId", sql.NVarChar(255), promoCode.coupon.id)
      .query(`
        INSERT INTO ReferralCodes (userId, code, stripePromotionCodeId, stripeCouponId, isActive)
        OUTPUT INSERTED.*
        VALUES (@userId, @code, @stripePromotionCodeId, @stripeCouponId, 1)
      `);

    return result.recordset[0];
  },

  /**
   * Suggest a referral code based on user info
   */
  suggestCode(firstName: string, lastName: string, email: string): string {
    // Try: FIRSTNAME + random number
    if (firstName && firstName.length >= 3) {
      return `${firstName.substring(0, 8).toUpperCase()}${Math.floor(Math.random() * 100)}`;
    }

    // Try: LASTNAME + random number
    if (lastName && lastName.length >= 3) {
      return `${lastName.substring(0, 8).toUpperCase()}${Math.floor(Math.random() * 100)}`;
    }

    // Try: email prefix + random number
    const emailPrefix = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "");
    return `${emailPrefix.substring(0, 8).toUpperCase()}${Math.floor(Math.random() * 100)}`;
  },

  /**
   * Validate a referral code
   */
  async validateReferralCode(code: string) {
    const connection = await getConnection();

    const result = await connection
      .request()
      .input("code", sql.NVarChar(20), code.toUpperCase())
      .query(`
        SELECT * FROM ReferralCodes
        WHERE code = @code AND isActive = 1
      `);

    return result.recordset[0] || null;
  },

  /**
   * Record a successful referral
   */
  async recordReferral(data: {
    referralCode: string;
    referredUserId: number;
    stripeCheckoutSessionId: string;
    stripeSubscriptionId: string;
    subscriptionAmount: number;
    discountAmount: number;
  }) {
    const connection = await getConnection();

    // Get referral code details
    const codeResult = await connection
      .request()
      .input("code", sql.NVarChar(20), data.referralCode.toUpperCase())
      .query("SELECT * FROM ReferralCodes WHERE code = @code");

    if (codeResult.recordset.length === 0) {
      throw new Error("Referral code not found");
    }

    const referralCode = codeResult.recordset[0];

    // Prevent self-referral
    if (referralCode.userId === data.referredUserId) {
      throw new Error("Cannot use your own referral code");
    }

    // Check if user already has a referral
    const existingReferral = await connection
      .request()
      .input("referredUserId", sql.Int, data.referredUserId)
      .query("SELECT * FROM Referrals WHERE referredUserId = @referredUserId");

    if (existingReferral.recordset.length > 0) {
      // User already referred, don't create duplicate
      return existingReferral.recordset[0];
    }

    // Get commission config
    const commissionType = "one_time"; // TODO: Get from SystemConfig
    const commissionAmount = 1000; // TODO: Get from SystemConfig ($10)

    // Calculate qualification date (30 days from now)
    const qualificationDate = new Date();
    qualificationDate.setDate(qualificationDate.getDate() + 30);

    // Insert referral
    const result = await connection
      .request()
      .input("referralCodeId", sql.Int, referralCode.id)
      .input("referrerUserId", sql.Int, referralCode.userId)
      .input("referredUserId", sql.Int, data.referredUserId)
      .input("referralCode", sql.NVarChar(20), data.referralCode)
      .input("stripeCheckoutSessionId", sql.NVarChar(255), data.stripeCheckoutSessionId)
      .input("stripeSubscriptionId", sql.NVarChar(255), data.stripeSubscriptionId)
      .input("discountAmount", sql.Int, data.discountAmount)
      .input("subscriptionAmount", sql.Int, data.subscriptionAmount)
      .input("commissionAmount", sql.Int, commissionAmount)
      .input("commissionType", sql.NVarChar(20), commissionType)
      .input("qualifiedAt", sql.DateTime, qualificationDate)
      .query(`
        INSERT INTO Referrals (
          referralCodeId, referrerUserId, referredUserId, referralCode,
          stripeCheckoutSessionId, stripeSubscriptionId,
          discountAmount, subscriptionAmount, commissionAmount, commissionType,
          commissionStatus, qualifiedAt
        )
        OUTPUT INSERTED.*
        VALUES (
          @referralCodeId, @referrerUserId, @referredUserId, @referralCode,
          @stripeCheckoutSessionId, @stripeSubscriptionId,
          @discountAmount, @subscriptionAmount, @commissionAmount, @commissionType,
          'pending', @qualifiedAt
        )
      `);

    return result.recordset[0];
  },

  /**
   * Check qualification status and update commissions
   * Run this daily via scheduled job
   */
  async updateQualificationStatus() {
    const connection = await getConnection();

    // Find referrals that qualified (30 days passed, subscription still active)
    await connection.request().query(`
      UPDATE Referrals
      SET commissionStatus = 'qualified'
      WHERE commissionStatus = 'pending'
        AND qualifiedAt <= GETDATE()
        AND referredUserId IN (
          SELECT id FROM Users WHERE subscriptionStatus = 'active'
        )
    `);
  },

  /**
   * Void commission if customer cancels within 30 days
   */
  async checkAndVoidCommission(stripeSubscriptionId: string) {
    const connection = await getConnection();

    const result = await connection
      .request()
      .input("subscriptionId", sql.NVarChar(255), stripeSubscriptionId)
      .query(`
        UPDATE Referrals
        SET
          commissionStatus = 'void',
          voidedAt = GETDATE(),
          voidReason = 'Customer cancelled subscription within 30 days'
        WHERE stripeSubscriptionId = @subscriptionId
          AND commissionStatus = 'pending'
          AND DATEDIFF(day, createdAt, GETDATE()) <= 30
      `);

    return result.rowsAffected[0];
  },
};
```

---

## Frontend Changes

### 1. **Account Page - Referral Section**

**File:** `src/views/Account.vue`

Add a new section to display referral code and stats.

```vue
<template>
  <ion-page>
    <!-- Existing content -->

    <!-- NEW: Referral Section -->
    <ion-card v-if="user">
      <ion-card-header>
        <ion-card-title>Referral Program</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <!-- If user doesn't have a code yet -->
        <div v-if="!referralCode && !loadingReferral">
          <p>Earn money by referring other coaches to ScheduleCoaches!</p>
          <ion-button @click="createReferralCode">
            Get My Referral Code
          </ion-button>
        </div>

        <!-- If user has a code -->
        <div v-if="referralCode">
          <div class="referral-code-display">
            <h3>Your Referral Code:</h3>
            <div class="code-box">
              <span class="code">{{ referralCode }}</span>
              <ion-button size="small" @click="copyCode">
                <ion-icon :icon="copyOutline"></ion-icon>
                Copy
              </ion-button>
            </div>
          </div>

          <div class="share-url">
            <p>Share this link:</p>
            <input
              readonly
              :value="shareUrl"
              @click="selectAll"
            />
            <ion-button size="small" @click="copyUrl">
              Copy Link
            </ion-button>
          </div>

          <!-- Stats -->
          <div class="referral-stats" v-if="stats">
            <h4>Your Referral Stats</h4>
            <div class="stat-grid">
              <div class="stat">
                <span class="stat-label">Total Referrals</span>
                <span class="stat-value">{{ stats.totalReferrals }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Successful Conversions</span>
                <span class="stat-value">{{ stats.successfulConversions }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Pending Commissions</span>
                <span class="stat-value">${{ (stats.pendingCommissions.amount / 100).toFixed(2) }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Total Earned</span>
                <span class="stat-value">${{ (stats.paidCommissions.totalLifetime / 100).toFixed(2) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Loading state -->
        <div v-if="loadingReferral">
          <ion-spinner></ion-spinner>
          <p>Loading referral information...</p>
        </div>
      </ion-card-content>
    </ion-card>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { copyOutline } from 'ionicons/icons';

const referralCode = ref<string | null>(null);
const shareUrl = ref<string>('');
const stats = ref<any>(null);
const loadingReferral = ref(false);

async function createReferralCode() {
  loadingReferral.value = true;
  try {
    const token = await getAccessToken();
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/create-referral-code`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      referralCode.value = data.referralCode.code;
      shareUrl.value = data.referralCode.shareUrl;
      await loadReferralStats();
    } else {
      const error = await response.json();
      alert(error.error || 'Failed to create referral code');
    }
  } catch (error) {
    console.error('Error creating referral code:', error);
    alert('Failed to create referral code');
  } finally {
    loadingReferral.value = false;
  }
}

async function loadReferralStats() {
  try {
    const token = await getAccessToken();
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/referral-stats`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      referralCode.value = data.referralCode;
      shareUrl.value = `https://schedulecoaches.com/signup?ref=${data.referralCode}`;
      stats.value = data.stats;
    }
  } catch (error) {
    console.error('Error loading referral stats:', error);
  }
}

function copyCode() {
  navigator.clipboard.writeText(referralCode.value!);
  // Show toast notification
}

function copyUrl() {
  navigator.clipboard.writeText(shareUrl.value);
  // Show toast notification
}

onMounted(() => {
  loadReferralStats();
});
</script>

<style scoped>
.referral-code-display {
  margin: 20px 0;
}

.code-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 8px;
}

.code {
  font-size: 24px;
  font-weight: bold;
  font-family: monospace;
  letter-spacing: 2px;
}

.share-url input {
  width: 100%;
  padding: 10px;
  margin: 10px 0;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  margin-top: 15px;
}

.stat {
  display: flex;
  flex-direction: column;
  padding: 15px;
  background: #f9f9f9;
  border-radius: 8px;
}

.stat-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #0066ff;
}
</style>
```

### 2. **Signup Page - Capture Referral Code**

**File:** `src/views/SignUp.vue`

Capture `ref` parameter from URL and pass to checkout.

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const referralCode = ref<string | null>(null);

onMounted(() => {
  // Capture referral code from URL
  const refParam = route.query.ref as string;
  if (refParam) {
    referralCode.value = refParam.toUpperCase();
    // Store in localStorage in case user leaves and comes back
    localStorage.setItem('referral_code', referralCode.value);
  } else {
    // Check localStorage
    const stored = localStorage.getItem('referral_code');
    if (stored) {
      referralCode.value = stored;
    }
  }
});

// When creating checkout session, pass referral code
async function handleCheckout() {
  const token = await getAccessToken();
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/create-checkout-session`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      lookupKey: 'pickleball_monthly',
      referralCode: referralCode.value  // NEW
    })
  });

  if (response.ok) {
    const { url } = await response.json();
    window.location.href = url;
  }
}
</script>
```

---

## Testing Plan

### Unit Tests

1. **Referral Code Creation:**
   - ✅ User can create code
   - ✅ Cannot create duplicate code
   - ✅ Cannot create if already has code
   - ✅ Inactive subscription cannot create code
   - ✅ Code format validation

2. **Referral Code Validation:**
   - ✅ Valid code returns true
   - ✅ Invalid code returns false
   - ✅ Inactive code returns false

3. **Referral Recording:**
   - ✅ Referral recorded on checkout success
   - ✅ Discount amount calculated correctly
   - ✅ Commission amount calculated correctly
   - ✅ Cannot use own code
   - ✅ Cannot refer same user twice

4. **Commission Qualification:**
   - ✅ Commission becomes qualified after 30 days
   - ✅ Commission voided if customer cancels within 30 days

### Integration Tests

1. **End-to-End Referral Flow:**
   - User A creates referral code "USERA10"
   - User B visits signup?ref=USERA10
   - User B completes signup and payment
   - Referral is recorded in database
   - 20% discount applied to User B's first month
   - Commission is pending for User A
   - After 30 days, commission becomes qualified

2. **Stripe Integration:**
   - Promotion code created in Stripe
   - Checkout session applies discount
   - Webhook receives correct discount amount

### Manual Test Cases

**Test Case 1: Create Referral Code**
1. Login as coach with active subscription
2. Go to Account page
3. Click "Get My Referral Code"
4. Verify code is displayed
5. Verify share URL is correct
6. Copy code and verify clipboard

**Test Case 2: Use Referral Code (URL)**
1. Open signup?ref=RYAN10 in incognito
2. Complete signup flow
3. Verify discount shown at checkout
4. Complete payment
5. Verify referral recorded in database
6. Verify commission is pending

**Test Case 3: Use Referral Code (Manual Entry)**
1. Go to signup normally
2. Complete authentication
3. At checkout, click "Add promotion code"
4. Enter RYAN10
5. Verify discount applied
6. Complete payment
7. Verify referral recorded

**Test Case 4: View Referral Stats**
1. Login as referrer
2. Go to Account page
3. Verify stats are accurate
4. Verify recent referrals shown

**Test Case 5: Commission Report**
1. Login as admin
2. Navigate to commission report
3. Filter by "qualified" status
4. Verify all qualified commissions shown
5. Mark as paid
6. Verify status updated

---

## Deployment Plan

### Phase 1: Database (Do First)
1. Run migration script on Azure SQL database
2. Verify tables created
3. Verify SystemConfig populated

### Phase 2: Stripe (Before Backend)
1. Create coupon in Stripe Dashboard (test mode)
2. Copy coupon ID
3. Add to Azure Function App settings: `STRIPE_REFERRAL_COUPON_ID`

### Phase 3: Backend (Core Logic)
1. Deploy backend API changes
2. Test endpoints with Postman/curl
3. Verify Stripe integration works

### Phase 4: Frontend (User Interface)
1. Deploy frontend changes
2. Test referral code creation
3. Test signup with referral code
4. Test stats display

### Phase 5: Monitoring
1. Set up Application Insights alerts
2. Monitor webhook success rate
3. Monitor referral conversion rate

---

## Manual Payout Process

### Monthly Commission Payout Workflow

**Schedule:** First Monday of each month

**Step 1: Generate Report**
```sql
-- Run this query to get all qualified commissions
SELECT
    r.id AS referralId,
    u.email AS referrerEmail,
    u.firstName + ' ' + u.lastName AS referrerName,
    r.commissionAmount,
    r.qualifiedAt,
    r.referralCode
FROM Referrals r
INNER JOIN Users u ON r.referrerUserId = u.id
WHERE r.commissionStatus = 'qualified'
ORDER BY u.email, r.qualifiedAt;

-- Get summary by referrer
SELECT
    u.email,
    u.firstName + ' ' + u.lastName AS name,
    COUNT(*) AS commissionCount,
    SUM(r.commissionAmount) AS totalAmount
FROM Referrals r
INNER JOIN Users u ON r.referrerUserId = u.id
WHERE r.commissionStatus = 'qualified'
GROUP BY u.email, u.firstName, u.lastName
ORDER BY totalAmount DESC;
```

**Step 2: Export to CSV**
- Save query results to CSV
- Review for any suspicious patterns

**Step 3: Process Payments**
- Use PayPal Mass Pay, Venmo, or manual bank transfers
- Keep transaction receipts

**Step 4: Mark as Paid**
- Use API endpoint: `POST /api/mark-commission-paid`
- Or run SQL:
```sql
UPDATE Referrals
SET
    commissionStatus = 'paid',
    paidAt = GETDATE(),
    paidAmount = commissionAmount,
    paidMethod = 'paypal',
    paidReference = 'PAYPAL-BATCH-12345'
WHERE id IN (123, 456, 789);  -- List of IDs paid
```

**Step 5: Send Notification Emails** (Optional)
- Email referrers that payment was sent
- Include transaction reference

---

## Monitoring & Alerts

### Key Metrics to Track

1. **Referral Conversion Rate:**
   - Query daily: % of signups with ref code that convert to paid
   - Alert if drops below 40%

2. **Active Referrers:**
   - Query weekly: Count of users with ≥1 referral
   - Target: 10% of active coaches

3. **Commission Payout Lag:**
   - Query monthly: Qualified commissions not yet paid
   - Alert if any > 60 days old

4. **Fraud Detection:**
   - Query daily: Referrers with >10 referrals/day
   - Query weekly: Same IP/payment method patterns
   - Manual review flagged accounts

### Application Insights Queries

```kusto
// Referral code creation rate
requests
| where name == "create-referral-code"
| where resultCode == "200"
| summarize count() by bin(timestamp, 1d)

// Referral usage rate
requests
| where name == "webhook"
| where customDimensions.event_type == "checkout.session.completed"
| where customDimensions.referral_code != ""
| summarize count() by bin(timestamp, 1d)

// Failed referral code validations
requests
| where name == "validate-referral-code"
| where resultCode == "404"
| summarize count() by tostring(customDimensions.code)
```

---

## Security Considerations

1. **Code Uniqueness:** Prevent duplicate codes
2. **Self-Referral:** Prevent using own code
3. **Rate Limiting:** Limit API calls to prevent abuse
4. **Admin Endpoints:** Require admin role for commission reports
5. **SQL Injection:** Use parameterized queries (already implemented)
6. **Fraud Detection:** Monitor for patterns, manual review high-volume

---

## Future Enhancements (Phase 2+)

1. **Automated Payouts:** Stripe Connect integration
2. **Recurring Commissions:** Track monthly payouts
3. **Email Notifications:** Notify on referral success, commission qualified, payment sent
4. **Leaderboard:** Show top referrers
5. **Custom Discounts:** Allow different discount tiers
6. **Affiliate Dashboard:** Dedicated page with detailed analytics
7. **Marketing Materials:** Downloadable graphics, social media templates

---

## Rollback Plan

If issues arise post-deployment:

1. **Disable Referral Program:**
   ```sql
   UPDATE SystemConfig
   SET configValue = 'false'
   WHERE configKey = 'referral_enabled';
   ```

2. **Deactivate All Codes:**
   ```sql
   UPDATE ReferralCodes SET isActive = 0;
   ```

3. **Revert Backend:** Redeploy previous version via GitHub Actions

4. **Revert Frontend:** Redeploy previous version via GitHub Actions

---

## Success Metrics (6 Months Post-Launch)

- ✅ 20% of new signups use referral code
- ✅ 10% of active coaches have created referral code
- ✅ Average 2-3 referrals per active referrer
- ✅ Referral conversion rate >50%
- ✅ Referral CAC < $30 (vs. $50+ for paid ads)

---

**Document Owner:** ScheduleCoaches Technical Team
**Next Review:** Post-MVP Launch (3 months)
