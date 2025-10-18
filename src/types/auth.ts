export type AuthProvider = 'email' | 'google' | 'apple'

export interface User {
  id: string
  email: string
  name: string
  role: 'client' | 'coach' | 'admin'

  // Provider-specific account IDs
  googleAccountId?: string
  appleAccountId?: string

  // Subscription info
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  subscriptionStatus?: 'active' | 'past_due' | 'canceled' | 'trialing'
  subscriptionPlan?: string

  // Timestamps
  createdAt?: string
  updatedAt?: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface SignUpData {
  email: string
  password: string
  name: string
}

export interface OAuthTokenData {
  provider: AuthProvider
  idToken: string
  email?: string
  name?: string
}
