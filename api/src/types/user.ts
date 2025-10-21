/**
 * User type definitions for schedulecoaches API
 *
 * Role values for subscription management:
 * - coach_unpaid: Account created, no payment yet (cannot access app)
 * - coach_paid: Active subscription, full app access
 * - coach_cancelled: Subscription cancelled (cannot access app)
 * - coach_past_due: Payment failed, grace period with read-only access
 * - admin: System administrator (always has access)
 */

export interface User {
  id: string; // GUID
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'coach_unpaid' | 'coach_paid' | 'coach_cancelled' | 'coach_past_due' | 'admin';
  slug?: string; // URL-friendly identifier
  profilePhotoUrl?: string;

  // Stripe subscription fields
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: 'active' | 'past_due' | 'canceled' | 'unpaid' | 'trialing';
  subscriptionEndDate?: Date;

  // Entra ID account reference
  entraAccountId?: string; // Maps to 'oid' or 'sub' from Entra token

  // Profile completion tracking
  needsProfileCompletion?: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

/**
 * Authenticated user payload extracted from token
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  role: string;
  provider: 'entra' | 'google' | 'apple' | 'microsoft';
  groups?: string[];
}
