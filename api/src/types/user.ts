/**
 * User type definitions for schedulecoaches API
 *
 * IMPORTANT: Aligns with pbcoach schema for shared database compatibility
 *
 * Role values:
 * - client: User who books sessions (not used in schedulecoaches signup)
 * - coach: Coach user (all schedulecoaches signups)
 * - admin: System administrator (always has access)
 *
 * Subscription status values (tracked separately from role):
 * - free: Free/exempt account (demo, employee, partner) - full access, no Stripe required
 * - unpaid: Account created, no payment yet (cannot access app)
 * - active: Active subscription, full app access
 * - canceled: Subscription cancelled (cannot access app)
 * - past_due: Payment failed, grace period with read-only access
 * - trialing: Free trial period (if enabled)
 * - incomplete: Initial payment incomplete
 * - incomplete_expired: Payment incomplete, expired
 */

export interface User {
  id: string; // GUID
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'client' | 'coach' | 'admin'; // Aligns with pbcoach schema
  slug?: string; // URL-friendly identifier
  profilePhotoUrl?: string;

  // Stripe subscription fields (optional for 'free' coaches, required for paying coaches)
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus: 'free' | 'unpaid' | 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete' | 'incomplete_expired';
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
