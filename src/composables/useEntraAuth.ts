import { ref } from 'vue'
import {
  PublicClientApplication,
  type Configuration,
  InteractionRequiredAuthError
} from '@azure/msal-browser'

const API_URL = import.meta.env.VITE_API_BASE_URL || '/api'

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

// MSAL instance
let msalInstance: PublicClientApplication | null = null

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

/**
 * Sign up with email - creates Entra account then redirects to Stripe
 */
export async function signUpWithEmail(email: string, lookupKey: string = 'pickleball_monthly') {
  isLoading.value = true
  error.value = null

  try {
    const msal = await initializeMsal()

    // Store signup intent for after redirect
    sessionStorage.setItem('entra_signup_email', email)
    sessionStorage.setItem('entra_signup_lookup_key', lookupKey)
    sessionStorage.setItem('entra_auth_action', 'signup')

    // Sign up flow using redirect (matches pbcoach implementation)
    await msal.loginRedirect({
      scopes: ['openid', 'profile', 'email', 'offline_access'],
      prompt: 'create', // Forces account creation
      loginHint: email
    })

    // Redirect happens, flow continues in handleRedirectCallback

  } catch (err: any) {
    console.error('Sign up error:', err)
    error.value = err.message || 'Sign up failed'
    isLoading.value = false
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
    const msal = await initializeMsal()

    // Store signup intent
    sessionStorage.setItem('entra_signup_lookup_key', lookupKey)
    sessionStorage.setItem('entra_auth_action', 'signup')

    await msal.loginRedirect({
      scopes: ['openid', 'profile', 'email', 'offline_access'],
      prompt: 'select_account',
      extraQueryParameters: {
        domain_hint: 'google.com'
      }
    })

  } catch (err: any) {
    console.error('Google sign up error:', err)
    error.value = err.message || 'Google sign up failed'
    isLoading.value = false
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
    const msal = await initializeMsal()

    // Store signup intent
    sessionStorage.setItem('entra_signup_lookup_key', lookupKey)
    sessionStorage.setItem('entra_auth_action', 'signup')

    await msal.loginRedirect({
      scopes: ['openid', 'profile', 'email', 'offline_access'],
      prompt: 'select_account',
      extraQueryParameters: {
        domain_hint: 'apple.com'
      }
    })

  } catch (err: any) {
    console.error('Apple sign up error:', err)
    error.value = err.message || 'Apple sign up failed'
    isLoading.value = false
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

    // Store login intent
    sessionStorage.setItem('entra_auth_action', 'login')
    if (email) {
      sessionStorage.setItem('entra_login_email', email)
    }

    await msal.loginRedirect({
      scopes: ['openid', 'profile', 'email', 'offline_access'],
      prompt: 'login',
      loginHint: email
    })

  } catch (err: any) {
    console.error('Login error:', err)
    error.value = err.message || 'Login failed'
    isLoading.value = false
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
    }
    currentUser.value = null
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
      return null
    }

    console.log('[Entra Auth] Redirect successful, processing auth')

    const accessToken = response.accessToken
    const authAction = sessionStorage.getItem('entra_auth_action')

    // Call authMe to create/get user in database
    const authMeResponse = await fetch(`${API_URL}/auth-me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
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
      const email = response.account?.username || sessionStorage.getItem('entra_signup_email')

      const checkoutResponse = await fetch(`${API_URL}/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          lookup_key: lookupKey,
          customer_email: email
        })
      })

      if (!checkoutResponse.ok) {
        throw new Error('Failed to create checkout session')
      }

      const checkoutData = await checkoutResponse.json()

      // Clean up session storage
      sessionStorage.removeItem('entra_auth_action')
      sessionStorage.removeItem('entra_signup_email')
      sessionStorage.removeItem('entra_signup_lookup_key')

      // Redirect to Stripe
      window.location.href = checkoutData.url
      return 'redirecting_to_stripe'
    } else if (authAction === 'login') {
      // Clean up and redirect to account page
      sessionStorage.removeItem('entra_auth_action')
      sessionStorage.removeItem('entra_login_email')

      return 'login_success'
    }

    return 'success'
  } catch (err: any) {
    console.error('[Entra Auth] Redirect callback error:', err)
    error.value = err.message || 'Authentication failed'
    throw err
  }
}

/**
 * Check if user is authenticated
 */
export async function checkAuth(): Promise<boolean> {
  try {
    const msal = await initializeMsal()
    const accounts = msal.getAllAccounts()

    if (accounts.length === 0) {
      return false
    }

    const account = accounts[0]

    // Try to get token silently
    const result = await msal.acquireTokenSilent({
      account,
      scopes: ['openid', 'profile', 'email', 'offline_access']
    })

    const accessToken = result.accessToken

    // Call authMe
    const authMeResponse = await fetch(`${API_URL}/auth-me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!authMeResponse.ok) {
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
    return false
  }
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
    logout,
    checkAuth,
    handleRedirectCallback
  }
}
