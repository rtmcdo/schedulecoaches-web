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

  const msalConfig: Configuration = {
    auth: {
      clientId,
      authority,
      redirectUri: window.location.origin + '/auth/callback',
      postLogoutRedirectUri: window.location.origin,
      navigateToLoginRequestUrl: false
    },
    cache: {
      cacheLocation: 'localStorage',
      storeAuthStateInCookie: false
    }
  }

  console.log('[Entra Auth] Initializing MSAL with authority:', authority)

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

    // Sign up flow (creates account in Entra ID)
    const result = await msal.loginPopup({
      scopes: ['openid', 'profile', 'email'],
      prompt: 'create', // Forces account creation
      loginHint: email
    })

    if (!result) {
      throw new Error('Sign up cancelled')
    }

    // Get access token
    const accessToken = result.accessToken

    // Call authMe to create user in our database
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

    // Now redirect to Stripe checkout with user's email
    const checkoutResponse = await fetch(`${API_URL}/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        lookup_key: lookupKey,
        customer_email: result.account?.username || email
      })
    })

    if (!checkoutResponse.ok) {
      throw new Error('Failed to create checkout session')
    }

    const checkoutData = await checkoutResponse.json()

    // Redirect to Stripe
    window.location.href = checkoutData.url

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

    const result = await msal.loginPopup({
      scopes: ['openid', 'profile', 'email'],
      prompt: 'select_account',
      extraQueryParameters: {
        domain_hint: 'google.com'
      }
    })

    if (!result) {
      throw new Error('Google sign up cancelled')
    }

    const accessToken = result.accessToken

    // Call authMe
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

    // Redirect to Stripe
    const checkoutResponse = await fetch(`${API_URL}/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        lookup_key: lookupKey,
        customer_email: result.account?.username
      })
    })

    if (!checkoutResponse.ok) {
      throw new Error('Failed to create checkout session')
    }

    const checkoutData = await checkoutResponse.json()
    window.location.href = checkoutData.url

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

    const result = await msal.loginPopup({
      scopes: ['openid', 'profile', 'email'],
      prompt: 'select_account',
      extraQueryParameters: {
        domain_hint: 'apple.com'
      }
    })

    if (!result) {
      throw new Error('Apple sign up cancelled')
    }

    const accessToken = result.accessToken

    // Call authMe
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

    // Redirect to Stripe
    const checkoutResponse = await fetch(`${API_URL}/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        lookup_key: lookupKey,
        customer_email: result.account?.username
      })
    })

    if (!checkoutResponse.ok) {
      throw new Error('Failed to create checkout session')
    }

    const checkoutData = await checkoutResponse.json()
    window.location.href = checkoutData.url

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

    const result = await msal.loginPopup({
      scopes: ['openid', 'profile', 'email'],
      prompt: 'login',
      loginHint: email
    })

    if (!result) {
      throw new Error('Login cancelled')
    }

    const accessToken = result.accessToken

    // Call authMe
    const authMeResponse = await fetch(`${API_URL}/auth-me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!authMeResponse.ok) {
      throw new Error('Failed to authenticate')
    }

    const userData = await authMeResponse.json()
    currentUser.value = userData.user

    return userData.user

  } catch (err: any) {
    console.error('Login error:', err)
    error.value = err.message || 'Login failed'
    throw err
  } finally {
    isLoading.value = false
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
      scopes: ['openid', 'profile', 'email']
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
    checkAuth
  }
}
