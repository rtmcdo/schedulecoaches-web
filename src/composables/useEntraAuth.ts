import { ref } from 'vue'
import {
  PublicClientApplication,
  type Configuration,
  InteractionRequiredAuthError,
  type AccountInfo
} from '@azure/msal-browser'
import { requestGoogleIdToken } from '@/utils/googleIdentity'
import { requestAppleIdToken } from '@/utils/appleIdentity'

const API_URL = import.meta.env.VITE_API_BASE_URL || '/api'
const MSAL_SCOPES = ['openid', 'profile', 'email', 'offline_access']
const AUTH_TOKEN_KEY = 'auth_access_token'
const AUTH_PROVIDER_KEY = 'auth_provider'

type AuthProvider = 'entra' | 'google' | 'apple'

// User state
const currentUser = ref<{
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  hasCoachProfile: boolean
  needsProfileCompletion: boolean
} | null>(null)

const isLoading = ref(false)
const error = ref<string | null>(null)
const accessToken = ref<string | null>(sessionStorage.getItem(AUTH_TOKEN_KEY))
const activeProvider = ref<AuthProvider | null>(
  (sessionStorage.getItem(AUTH_PROVIDER_KEY) as AuthProvider | null) || null
)

// MSAL instance
let msalInstance: PublicClientApplication | null = null

function persistAuthSession(provider: AuthProvider | null, token: string | null) {
  activeProvider.value = provider

  if (provider && token) {
    accessToken.value = token
    try {
      sessionStorage.setItem(AUTH_TOKEN_KEY, token)
      sessionStorage.setItem(AUTH_PROVIDER_KEY, provider)
    } catch (storageError) {
      console.warn('[Entra Auth] Unable to persist auth session:', storageError)
    }
  } else {
    accessToken.value = null
    try {
      sessionStorage.removeItem(AUTH_TOKEN_KEY)
      sessionStorage.removeItem(AUTH_PROVIDER_KEY)
    } catch (storageError) {
      console.warn('[Entra Auth] Unable to clear auth session:', storageError)
    }
  }
}

/**
 * Initialize MSAL (Microsoft Authentication Library)
 */
async function initializeMsal(): Promise<PublicClientApplication> {
  if (msalInstance) {
    return msalInstance
  }

  const tenantId = import.meta.env.VITE_ENTRA_TENANT_ID
  const tenantSubdomain = import.meta.env.VITE_ENTRA_TENANT_SUBDOMAIN
  const clientId = import.meta.env.VITE_ENTRA_CLIENT_ID

  if (!clientId) {
    throw new Error('Entra ID configuration missing. Please set VITE_ENTRA_CLIENT_ID')
  }

  // Determine authority URL based on available configuration
  // External ID (CIAM) format: https://{subdomain}.ciamlogin.com/{tenantName}
  let authority: string
  if (tenantSubdomain) {
    authority = `https://${tenantSubdomain}.ciamlogin.com/${tenantSubdomain}.onmicrosoft.com`
  } else if (tenantId) {
    // Fallback to standard Azure AD format
    authority = `https://login.microsoftonline.com/${tenantId}/`
  } else {
    throw new Error('Either VITE_ENTRA_TENANT_ID or VITE_ENTRA_TENANT_SUBDOMAIN must be set')
  }

  const redirectUri = window.location.origin + '/auth/callback'

  const msalConfig: Configuration = {
    auth: {
      clientId,
      authority,
      redirectUri,
      postLogoutRedirectUri: window.location.origin,
      navigateToLoginRequestUrl: false
    },
    cache: {
      cacheLocation: 'localStorage',
      storeAuthStateInCookie: false
    }
  }

  console.log('[Entra Auth] MSAL Configuration:', {
    authority,
    clientId,
    redirectUri,
    origin: window.location.origin
  })

  msalInstance = new PublicClientApplication(msalConfig)
  await msalInstance.initialize()

  return msalInstance
}

async function prepareForRedirect(msal: PublicClientApplication) {
  try {
    await msal.handleRedirectPromise()
  } catch (err) {
    console.warn('[Entra Auth] Failed to clear pending redirect state:', err)
  }

  const activeAccount = msal.getActiveAccount()
  if (activeAccount) {
    msal.setActiveAccount(null)
  }
}

/**
 * Sign up with email - redirects directly to Entra's hosted create account page
 * User will enter email on Entra's page, not on our website
 */
export async function signUpWithEmail(lookupKey: string = 'pickleball_monthly') {
  isLoading.value = true
  error.value = null

  try {
    const msal = await initializeMsal()
    await prepareForRedirect(msal)

    // Store signup intent for after redirect
    sessionStorage.setItem('entra_signup_lookup_key', lookupKey)
    sessionStorage.setItem('entra_auth_action', 'signup')

    // Sign up flow using redirect (matches pbcoach implementation)
    // No loginHint - user enters email on Entra's page
    await msal.loginRedirect({
      scopes: MSAL_SCOPES,
      prompt: 'create' // Forces account creation on Entra's hosted page
    })

    // Redirect happens, flow continues in handleRedirectCallback

  } catch (err: any) {
    console.error('Sign up error:', err)
    error.value = err.message || 'Sign up failed'
    isLoading.value = false
    persistAuthSession(null, null)
    throw err
  }
}

/**
 * Sign up with Google
 */
export async function signUpWithGoogle(lookupKey: string = 'pickleball_monthly') {
  isLoading.value = true
  error.value = null

  try {
    const token = await requestGoogleIdToken()
    await completeFederatedFlow({
      provider: 'google',
      token,
      action: 'signup',
      lookupKey
    })
  } catch (err: any) {
    console.error('Google sign up error:', err)
    error.value = err.message || 'Google sign up failed'
    isLoading.value = false
    persistAuthSession(null, null)
    throw err
  }
}

/**
 * Sign up with Apple
 */
export async function signUpWithApple(lookupKey: string = 'pickleball_monthly') {
  isLoading.value = true
  error.value = null

  try {
    const token = await requestAppleIdToken()
    await completeFederatedFlow({
      provider: 'apple',
      token,
      action: 'signup',
      lookupKey
    })
  } catch (err: any) {
    console.error('Apple sign up error:', err)
    error.value = err.message || 'Apple sign up failed'
    isLoading.value = false
    persistAuthSession(null, null)
    throw err
  }
}

/**
 * Login (for existing customers)
 */
export async function login(email?: string) {
  isLoading.value = true
  error.value = null

  try {
    const msal = await initializeMsal()
    await prepareForRedirect(msal)

    // Store login intent
    sessionStorage.setItem('entra_auth_action', 'login')
    if (email) {
      sessionStorage.setItem('entra_login_email', email)
    }

    await msal.loginRedirect({
      scopes: MSAL_SCOPES,
      prompt: 'login',
      loginHint: email
    })

  } catch (err: any) {
    console.error('Login error:', err)
    error.value = err.message || 'Login failed'
    isLoading.value = false
    persistAuthSession(null, null)
    throw err
  }
}

export async function loginWithGoogle() {
  isLoading.value = true
  error.value = null

  try {
    const token = await requestGoogleIdToken()
    return await completeFederatedFlow({
      provider: 'google',
      token,
      action: 'login'
    })
  } catch (err: any) {
    console.error('Google login error:', err)
    error.value = err.message || 'Google login failed'
    isLoading.value = false
    persistAuthSession(null, null)
    throw err
  }
}

export async function loginWithApple() {
  isLoading.value = true
  error.value = null

  try {
    const token = await requestAppleIdToken()
    return await completeFederatedFlow({
      provider: 'apple',
      token,
      action: 'login'
    })
  } catch (err: any) {
    console.error('Apple login error:', err)
    error.value = err.message || 'Apple login failed'
    isLoading.value = false
    persistAuthSession(null, null)
    throw err
  }
}

/**
 * Logout
 */
export async function logout() {
  try {
    if (msalInstance) {
      const account = msalInstance.getAllAccounts()[0]
      if (account) {
        await msalInstance.logoutPopup({ account })
      }
      msalInstance.setActiveAccount(null)
    }
    currentUser.value = null
    persistAuthSession(null, null)
    sessionStorage.removeItem('entra_auth_action')
    sessionStorage.removeItem('entra_signup_email')
    sessionStorage.removeItem('entra_signup_lookup_key')
    sessionStorage.removeItem('entra_login_email')
  } catch (err: any) {
    console.error('Logout error:', err)
  }
}

/**
 * Handle redirect callback after Entra authentication
 * This should be called on the /auth/callback page
 */
export async function handleRedirectCallback() {
  try {
    const msal = await initializeMsal()

    // Handle the redirect response
    const response = await msal.handleRedirectPromise()

    if (!response) {
      console.log('[Entra Auth] No redirect response')
      isLoading.value = false
      return null
    }

    console.log('[Entra Auth] Redirect successful, processing auth')
    isLoading.value = true
    error.value = null

    if (response.account) {
      msal.setActiveAccount(response.account)
    }

    // Use ID token for authentication (not access token)
    // OIDC scopes (openid, profile, email) return an ID token with user identity
    const tokenFromResponse = response.idToken
    const token = tokenFromResponse || (await acquireTokenSilently(msal, response.account || null))

    if (!token) {
      throw new Error('No ID token returned from Entra')
    }

    persistAuthSession('entra', token)

    const authAction = sessionStorage.getItem('entra_auth_action')

    // Call authMe to create/get user in database
    const authMeResponse = await fetch(`${API_URL}/auth-me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!authMeResponse.ok) {
      throw new Error('Failed to create user account')
    }

    const userData = await authMeResponse.json()
    currentUser.value = userData.user

    // Handle based on auth action
    if (authAction === 'signup') {
      // Redirect to Stripe checkout
      const lookupKey = sessionStorage.getItem('entra_signup_lookup_key') || 'pickleball_monthly'
      const email = response.account?.username // Get email from Entra response

      // Clean up session storage
      sessionStorage.removeItem('entra_auth_action')
      sessionStorage.removeItem('entra_signup_lookup_key')

      await redirectToStripeCheckout({
        token,
        lookupKey,
        email
      })
      return 'redirecting_to_stripe'
    } else if (authAction === 'login') {
      // Clean up and redirect to account page
      sessionStorage.removeItem('entra_auth_action')
      sessionStorage.removeItem('entra_login_email')

      return 'login_success'
    }

    sessionStorage.removeItem('entra_auth_action')
    return 'success'
  } catch (err: any) {
    console.error('[Entra Auth] Redirect callback error:', err)
    error.value = err.message || 'Authentication failed'
    persistAuthSession(null, null)
    throw err
  } finally {
    isLoading.value = false
  }
}

/**
 * Helpers for Google / Apple flows
 */
type FederatedProvider = Exclude<AuthProvider, 'entra'>

async function redirectToStripeCheckout(params: { token: string; lookupKey: string; email?: string | null }) {
  const { token, lookupKey, email } = params

  const body: Record<string, unknown> = {
    lookup_key: lookupKey
  }

  if (email) {
    body.customer_email = email
  }

  if (currentUser.value?.id) {
    body.metadata = {
      user_id: currentUser.value.id
    }
  }

  const response = await fetch(`${API_URL}/create-checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(body)
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error((data as any)?.error || 'Failed to create checkout session')
  }

  if (!data || typeof data.url !== 'string') {
    throw new Error('No checkout URL received')
  }

  window.location.href = data.url
  return 'redirecting_to_stripe' as const
}

async function completeFederatedFlow(options: {
  provider: FederatedProvider
  token: string
  action: 'signup' | 'login'
  lookupKey?: string
}) {
  const { provider, token, action, lookupKey } = options

  try {
    persistAuthSession(provider, token)

    const authMeResponse = await fetch(`${API_URL}/auth-me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!authMeResponse.ok) {
      throw new Error('Failed to create user account')
    }

    const userData = await authMeResponse.json()
    currentUser.value = userData.user

    if (action === 'signup') {
      const effectiveLookupKey = lookupKey || 'pickleball_monthly'
      const email = userData.user?.email || null
      await redirectToStripeCheckout({
        token,
        lookupKey: effectiveLookupKey,
        email
      })
      return 'redirecting_to_stripe' as const
    }

    isLoading.value = false
    return 'login_success' as const
  } catch (err) {
    currentUser.value = null
    persistAuthSession(null, null)
    throw err
  }
}

/**
 * Check if user is authenticated
 */
export async function checkAuth(): Promise<boolean> {
  try {
    if (activeProvider.value === 'entra') {
      const msal = await initializeMsal()
      const accounts = msal.getAllAccounts()

      if (accounts.length === 0) {
        return false
      }

      const account = accounts[0]

      // Try to get token silently
      const token = await acquireTokenSilently(msal, account)

      if (!token) {
        return false
      }

      // Call authMe
      const authMeResponse = await fetch(`${API_URL}/auth-me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!authMeResponse.ok) {
        persistAuthSession(null, null)
        return false
      }

      const userData = await authMeResponse.json()
      currentUser.value = userData.user

      return true
    }

    if (!activeProvider.value || !accessToken.value) {
      return false
    }

    // Call authMe
    const authMeResponse = await fetch(`${API_URL}/auth-me`, {
      headers: {
        'Authorization': `Bearer ${accessToken.value}`
      }
    })

    if (!authMeResponse.ok) {
      persistAuthSession(null, null)
      currentUser.value = null
      return false
    }

    const userData = await authMeResponse.json()
    currentUser.value = userData.user

    return true
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) {
      // User needs to sign in again
      return false
    }
    console.error('Check auth error:', err)
    persistAuthSession(null, null)
    currentUser.value = null
    return false
  }
}

async function acquireTokenSilently(msal: PublicClientApplication, account: AccountInfo | null) {
  if (!account) {
    const accounts = msal.getAllAccounts()
    if (!accounts.length) {
      return null
    }
    account = accounts[0]
  }

  try {
    const result = await msal.acquireTokenSilent({
      account,
      scopes: MSAL_SCOPES
    })

    // Return ID token (not access token) for user authentication
    if (result?.idToken) {
      persistAuthSession('entra', result.idToken)
      return result.idToken
    }
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) {
      console.warn('[Entra Auth] Silent token acquisition requires interaction')
      return null
    }
    console.error('[Entra Auth] acquireTokenSilently error:', err)
    return null
  }

  return null
}

export async function getAccessToken(forceRefresh = false): Promise<string | null> {
  if (!forceRefresh && accessToken.value) {
    return accessToken.value
  }

  if (activeProvider.value === 'entra') {
    try {
      const msal = await initializeMsal()
      return await acquireTokenSilently(msal, msal.getActiveAccount())
    } catch (err) {
      console.error('[Entra Auth] getAccessToken failed:', err)
      return null
    }
  }

  // For social providers, we cannot silently refresh. Return the stored token.
  return accessToken.value
}

export function useEntraAuth() {
  return {
    currentUser,
    isLoading,
    error,
    signUpWithEmail,
    signUpWithGoogle,
    signUpWithApple,
    login,
    loginWithGoogle,
    loginWithApple,
    logout,
    checkAuth,
    handleRedirectCallback,
    getAccessToken
  }
}
