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

---

## File Size Limits and Refactoring Rules

### **CRITICAL: File Size Enforcement**

**These are hard limits that MUST be followed. Breaking these rules creates technical debt.**

#### Maximum File Sizes

| File Type | Max Lines | Action Required If Exceeded |
|-----------|-----------|----------------------------|
| Vue Component | **500 lines** | STOP - Refactor before adding more |
| Azure Function | **250 lines** | STOP - Extract helper functions/utilities |
| TypeScript Service | **400 lines** | STOP - Extract to multiple services |
| TypeScript Utility | **300 lines** | STOP - Split into focused modules |
| Composable | **200 lines** | STOP - Split into multiple composables |

**Line Count Includes**: Template + Script + Styles combined for Vue components

#### Enforcement Protocol

**BEFORE adding any code to an existing file:**

1. **Check current file size**:
   ```bash
   wc -l path/to/file.vue
   # or
   wc -l path/to/file.ts
   ```

2. **If file is > 80% of limit** (e.g., > 400 lines for Vue component):
   - **STOP** ✋
   - **DO NOT add more code**
   - **Propose refactoring first**
   - Ask user: "This file is approaching size limits. Should we refactor before adding this feature?"

3. **If file is > 100% of limit**:
   - **MANDATORY REFACTORING**
   - Extract components/composables/services/functions FIRST
   - Then add new code to appropriate extracted piece

---

## Component Extraction Rules (Frontend)

### When to Extract a Vue Component

**Extract to a separate component if ANY of these are true:**

1. ✅ **Reusability**: Could this be used elsewhere in the app?
2. ✅ **Complexity**: Does this section have > 3 reactive variables or > 2 functions?
3. ✅ **Visual Separation**: Is this a distinct visual section (card, modal, form)?
4. ✅ **Testability**: Would this be easier to test in isolation?
5. ✅ **Length**: Is this section > 50 lines of template?

**Example - DON'T do this:**
```vue
<!-- SignUp.vue - 800+ lines mixing all concerns -->
<template>
  <ion-page>
    <!-- 200 lines of email/password form -->
    <div v-if="authMethod === 'email'">...</div>

    <!-- 200 lines of Google sign-in flow -->
    <div v-if="authMethod === 'google'">...</div>

    <!-- 200 lines of Apple sign-in flow -->
    <div v-if="authMethod === 'apple'">...</div>

    <!-- 200 lines of Stripe checkout logic -->
    <div v-if="showCheckout">...</div>
  </ion-page>
</template>
```

**Example - DO this instead:**
```vue
<!-- SignUp.vue - 150 lines, orchestration only -->
<template>
  <ion-page>
    <component :is="currentAuthComponent" @authenticated="handleAuth" />
    <StripeCheckout v-if="showCheckout" />
  </ion-page>
</template>

<script setup lang="ts">
import EmailSignUp from '@/components/auth/EmailSignUp.vue'
import GoogleSignIn from '@/components/auth/GoogleSignIn.vue'
import AppleSignIn from '@/components/auth/AppleSignIn.vue'
import StripeCheckout from '@/components/payment/StripeCheckout.vue'
</script>
```

---

## Composable Extraction Rules (Frontend)

### When to Create a Composable

**ALWAYS extract if ANY of these are true:**

1. ✅ **State Management**: Managing > 3 related reactive variables
2. ✅ **Business Logic**: Complex calculations or algorithms (> 20 lines)
3. ✅ **API Calls**: Any group of related API calls
4. ✅ **Reusability**: Logic could be used in multiple components
5. ✅ **Side Effects**: Managing lifecycle hooks, watchers, or event listeners
6. ✅ **Authentication Logic**: Entra, Google, or Apple sign-in flows

**Example - DON'T do this:**
```vue
<script setup lang="ts">
// In SignUp.vue - 200+ lines of Entra auth logic
const msalInstance = ref<PublicClientApplication | null>(null)
const isAuthenticating = ref(false)
const authError = ref<string | null>(null)

async function initializeMsal() {
  // 50+ lines of initialization
}

async function signInWithEntra() {
  // 100+ lines of redirect flow
}

// ... 10 more auth-related functions
</script>
```

**Example - DO this instead:**
```vue
<script setup lang="ts">
// In SignUp.vue
import { useEntraAuth } from '@/composables/useEntraAuth'

const { signIn, isAuthenticating, error } = useEntraAuth()
</script>
```

```typescript
// composables/useEntraAuth.ts - 180 lines (under 200 limit)
export function useEntraAuth() {
  const msalInstance = ref<PublicClientApplication | null>(null)
  const isAuthenticating = ref(false)

  async function signIn() {
    // All Entra-specific logic here
  }

  return { signIn, isAuthenticating, error }
}
```

---

## Azure Function Extraction Rules (Backend)

### When to Extract Helper Functions/Services

**Extract from Azure Function file if ANY of these are true:**

1. ✅ **Function > 250 lines** - Extract helper functions to separate files
2. ✅ **Complex Business Logic** - More than token validation (> 30 lines)
3. ✅ **Database Operations** - Multiple queries or complex SQL
4. ✅ **Reusable Logic** - Could be used by other functions
5. ✅ **External API Calls** - Stripe, Google, Apple verification

**Example - DON'T do this:**
```typescript
// api/src/functions/authMe.ts - 450 lines
export async function authMe(request: HttpRequest, context: InvocationContext) {
  // 50 lines of token extraction
  const token = extractToken(request)

  // 100 lines of Google token verification
  if (provider === 'google') {
    const client = new OAuth2Client(GOOGLE_CLIENT_ID)
    const ticket = await client.verifyIdToken({ ... })
    // ... complex verification logic
  }

  // 100 lines of Apple token verification
  if (provider === 'apple') {
    // ... complex verification logic
  }

  // 150 lines of database user creation/linking
  const connection = await getConnection()
  const result = await connection.request()
    .input('accountId', sql.NVarChar, user.id)
    .input('email', sql.NVarChar, user.email)
    .query(`
      INSERT INTO Users (id, email, role, ...)
      SELECT @id, @email, 'coach_unpaid', ...
      WHERE NOT EXISTS (SELECT 1 FROM Users WHERE email = @email)
    `)
  // ... 100 more lines
}
```

**Example - DO this instead:**
```typescript
// api/src/functions/authMe.ts - 120 lines (under 250 limit)
import { authenticateToken } from '@/utils/auth'
import { createOrLinkUser } from '@/services/userService'

export async function authMe(request: HttpRequest, context: InvocationContext) {
  const user = await authenticateToken(request, context)
  const dbUser = await createOrLinkUser(user)

  return {
    status: 200,
    jsonBody: {
      userId: dbUser.id,
      hasActiveSubscription: dbUser.role === 'coach_paid'
    }
  }
}
```

```typescript
// api/src/utils/auth.ts - 180 lines
export async function authenticateToken(request: HttpRequest, context: InvocationContext) {
  // Token extraction and verification logic
}
```

```typescript
// api/src/services/userService.ts - 200 lines
export async function createOrLinkUser(user: AuthenticatedUser) {
  // Database user creation/linking logic
}
```

---

## Service Extraction Rules (Both Frontend & Backend)

### When to Create a Service

**ALWAYS extract if ANY of these are true:**

1. ✅ **API Calls**: Group of related API endpoints (> 2 endpoints)
2. ✅ **External Integration**: Stripe, Google, Apple, Entra
3. ✅ **Data Processing**: Complex data transformation or calculation
4. ✅ **Caching**: Any caching logic
5. ✅ **Database Operations**: Related database queries (backend only)

**Example - Frontend Service:**
```typescript
// services/authApi.ts - Centralized API calls
export const authApi = {
  async checkAuthStatus(): Promise<AuthStatus> {
    const response = await fetch(`${API_BASE_URL}/api/auth-me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return await response.json()
  },

  async createCheckoutSession(lookupKey: string): Promise<CheckoutSession> {
    // API call logic
  }
}
```

**Example - Backend Service:**
```typescript
// api/src/services/stripeService.ts - Stripe integration
export const stripeService = {
  async createCheckoutSession(userId: string, email: string, lookupKey: string) {
    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      metadata: { user_id: userId },
      // ... session config
    })
    return session
  },

  async verifyWebhookSignature(payload: string, signature: string) {
    return stripe.webhooks.constructEvent(payload, signature, WEBHOOK_SECRET)
  }
}
```

---

## Pre-Coding Checklist

**BEFORE writing any code, ask yourself:**

- [ ] **Size Check**: Is the target file approaching size limits?
  - If yes → Extract components/composables/functions first

- [ ] **Scope Check**: Am I adding to the right file?
  - Frontend view logic → Vue Component
  - Frontend business logic → Composable
  - Backend endpoint → Azure Function
  - Backend business logic → Service
  - API calls → Service (frontend or backend)
  - Utilities → Utility file

- [ ] **Reusability Check**: Could this be used elsewhere?
  - If yes → Create separate component/composable/service/function

- [ ] **Complexity Check**: Is this > 50 lines or > 3 functions?
  - If yes → Create separate file

- [ ] **Separation Check**: Does this mix concerns?
  - If yes → Split into appropriate layers

**Example Internal Dialogue:**

```
User asks: "Add subscription status check to Login.vue"

My thoughts:
1. Login.vue current size? (Check with wc -l)
2. Subscription status = API call + state management
3. This could be reused in SignUp.vue and Dashboard.vue
4. Should be a composable: useSubscriptionStatus()

Decision: Create composables/useSubscriptionStatus.ts, import in Login.vue
```

---

## Post-Coding Review Checklist

**AFTER writing code, verify:**

- [ ] **No file exceeds size limits**
  - Run: `wc -l` on modified files
  - If exceeded → Refactor immediately

- [ ] **Single Responsibility Principle**
  - Each file does ONE thing
  - If doing multiple things → Split

- [ ] **No God Components/Functions**
  - Vue component has < 10 props
  - Vue component has < 5 emits
  - Vue component has < 15 reactive variables
  - Azure Function has < 5 main operations

- [ ] **Proper Separation**
  - No API calls in Vue components (use composables + services)
  - No business logic in Vue components (use composables)
  - No complex database logic in Azure Functions (use services)
  - No complex calculations in templates (use computed)

- [ ] **Testability**
  - Could this be unit tested easily?
  - If no → Extract to testable pieces

---

## Automatic Refactoring Triggers

**When ANY of these occur, STOP and propose refactoring:**

### Frontend Triggers

1. **Vue component > 500 lines** → Extract child components/composables
2. **Template > 300 lines** → Extract child components
3. **Script > 400 lines** → Extract composables/services
4. **Composable > 200 lines** → Split into multiple composables
5. **Functions > 10** → Extract to utilities/services
6. **Reactive variables > 15** → Extract to composable or split component

### Backend Triggers

1. **Azure Function > 250 lines** → Extract services/utilities
2. **Service file > 400 lines** → Split into multiple services
3. **Functions > 10 in one file** → Split into focused modules
4. **Complex SQL > 50 lines** → Extract to data access layer

### Code Smell Triggers

1. **"God Component/Function"** - Doing everything (auth + payment + database + etc.)
2. **"Copy-Paste Code"** - Same logic in multiple places
3. **"Mixed Concerns"** - UI + API + business logic in one place
4. **"Deep Nesting"** - > 4 levels of v-if/v-for or nested callbacks
5. **"Long Methods"** - Any function > 50 lines

---

## Folder Structure Enforcement

**When creating new files, follow this structure:**

```
/src/                           # Frontend (Vite/Vue)
  /views/
    - Main page components ONLY (Login.vue, SignUp.vue, Success.vue)
    - Max 500 lines
    - Coordinate between smaller components

  /components/
    /auth/                      # Authentication components
    /payment/                   # Stripe checkout components
    /shared/                    # Reusable across features

  /composables/
    - useEntraAuth.ts
    - useGoogleAuth.ts
    - useAppleAuth.ts
    - useStripeCheckout.ts
    - useSubscriptionStatus.ts

  /services/
    - authApi.ts                # API calls to backend
    - stripeApi.ts

  /utils/
    - validators.ts
    - formatters.ts

/api/                           # Backend (Azure Functions)
  /src/
    /functions/
      - health.ts               # Max 250 lines each
      - authMe.ts
      - createCheckoutSession.ts
      - stripeWebhook.ts
      - subscriptionStatus.ts

    /services/
      - userService.ts          # Max 400 lines each
      - stripeService.ts
      - subscriptionService.ts

    /utils/
      - auth.ts                 # Token verification
      - database.ts             # Connection helpers
```

---

## Real-World Examples from This Project

### ✅ RIGHT: Modular Authentication (Current Implementation)

```vue
<!-- src/views/Login.vue - ~200 lines -->
<template>
  <ion-page>
    <EmailLogin v-if="method === 'email'" />
    <GoogleSignIn v-if="method === 'google'" />
    <AppleSignIn v-if="method === 'apple'" />
  </ion-page>
</template>

<script setup lang="ts">
import { useEntraAuth } from '@/composables/useEntraAuth'
const { signIn } = useEntraAuth()
</script>
```

```typescript
// api/src/functions/authMe.ts - 180 lines (GOOD - under 250)
import { authenticateToken } from '../utils/auth'

export async function authMe(request: HttpRequest, context: InvocationContext) {
  const user = await authenticateToken(request, context)
  // Database logic here
}
```

### ❌ WRONG: What to Avoid

```vue
<!-- DON'T: Everything in one 1,200 line SignUp.vue -->
<template>
  <!-- 400 lines of authentication UI -->
  <!-- 300 lines of Stripe checkout UI -->
  <!-- 200 lines of success/error states -->
</template>

<script setup lang="ts">
// 300+ lines of auth logic, Stripe logic, validation, etc.
</script>
```

```typescript
// DON'T: 600-line Azure Function with everything embedded
export async function authMe(request: HttpRequest, context: InvocationContext) {
  // 100 lines of token parsing
  // 150 lines of Google verification
  // 150 lines of Apple verification
  // 200 lines of database operations
}
```

---

## Decision Framework

**Use this flowchart when deciding where to put code:**

```
Is it UI rendering?
├─ YES → Is it > 50 lines or reusable?
│   ├─ YES → Create separate Vue component
│   └─ NO → Include in current component
└─ NO → Is it state management or business logic?
    ├─ YES (Frontend) → Create composable
    ├─ YES (Backend) → Is it > 30 lines?
    │   ├─ YES → Create service
    │   └─ NO → Keep in function file
    └─ NO → Is it API calls?
        ├─ YES (Frontend) → Create service in /services/
        ├─ YES (Backend) → Is it external integration?
        │   ├─ YES → Create service (stripeService, etc.)
        │   └─ NO → Keep in function, but extract if > 30 lines
        └─ NO → Is it pure calculation/validation?
            ├─ YES → Create utility function
            └─ NO → Document where it belongs
```

---

## Enforcement Actions

**When Claude Code (me) violates these rules:**

1. **User should remind me**: "Check CLAUDE.md file size rules"
2. **I should respond**: "You're right - this file exceeds limits. Let me propose refactoring first."
3. **I should propose**: Specific refactoring plan before adding code
4. **I should ask**: "Should I refactor now or create a separate plan?"

**Don't let me:**
- Add code to files > 80% of size limit without discussing
- Create components > 500 lines or functions > 250 lines
- Put business logic in Vue components (use composables)
- Put complex logic in Azure Functions (use services)
- Mix API calls with UI rendering
- Create "util.ts" or "helpers.ts" (too vague - be specific)

---

## Summary: Golden Rules

1. **500-line limit for Vue components** - HARD STOP
2. **250-line limit for Azure Functions** - HARD STOP
3. **Extract early, extract often** - Don't wait until it's painful
4. **One responsibility per file** - If you can't explain it in one sentence, split it
5. **Composables for frontend logic** - Keep components focused on rendering
6. **Services for backend logic** - Keep Azure Functions focused on HTTP handling
7. **Services for API calls** - Never make API calls directly in Vue components
8. **Check size BEFORE adding** - Prevention is easier than refactoring
9. **Ask before breaking rules** - If you must exceed limits, discuss with user first

**Remember**: It's always easier to extract BEFORE the file gets too large. Once it's 1,000+ lines, refactoring becomes a major project.

---

**Last Updated**: January 26, 2025
**Enforcement**: MANDATORY - These are not suggestions, these are requirements