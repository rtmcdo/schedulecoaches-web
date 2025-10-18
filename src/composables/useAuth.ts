import { ref, computed } from 'vue'
import type { User, AuthResponse, LoginCredentials, SignUpData, OAuthTokenData } from '@/types/auth'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7071/api'

// Global state (shared across all instances of useAuth)
const user = ref<User | null>(null)
const token = ref<string | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)

// Auth modal state
const showAuthModal = ref(false)
const authModalDefaultTab = ref<'signin' | 'signup'>('signin')

export function useAuth() {
  const isAuthenticated = computed(() => !!user.value && !!token.value)

  // Initialize auth state from localStorage
  const initAuth = () => {
    const storedToken = localStorage.getItem('auth_token')
    const storedUser = localStorage.getItem('auth_user')

    if (storedToken && storedUser) {
      try {
        token.value = storedToken
        user.value = JSON.parse(storedUser)
      } catch (err) {
        console.error('Failed to parse stored user data:', err)
        clearAuth()
      }
    }
  }

  // Clear auth state
  const clearAuth = () => {
    token.value = null
    user.value = null
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
  }

  // Store auth data
  const setAuth = (authData: AuthResponse) => {
    token.value = authData.token
    user.value = authData.user
    localStorage.setItem('auth_token', authData.token)
    localStorage.setItem('auth_user', JSON.stringify(authData.user))
  }

  // Sign up with email/password
  const signUp = async (data: SignUpData) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Sign up failed')
      }

      const authData: AuthResponse = await response.json()
      setAuth(authData)
      showAuthModal.value = false

      return authData.user
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Sign up failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Sign in with email/password
  const signIn = async (credentials: LoginCredentials) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_BASE_URL}/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Sign in failed')
      }

      const authData: AuthResponse = await response.json()
      setAuth(authData)
      showAuthModal.value = false

      return authData.user
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Sign in failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // OAuth sign in (Google, Apple)
  const signInWithOAuth = async (tokenData: OAuthTokenData) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_BASE_URL}/auth-me`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: tokenData.provider,
          idToken: tokenData.idToken,
          email: tokenData.email,
          name: tokenData.name,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'OAuth sign in failed')
      }

      const authData: AuthResponse = await response.json()
      setAuth(authData)
      showAuthModal.value = false

      return authData.user
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'OAuth sign in failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Sign out
  const signOut = () => {
    clearAuth()
    // Redirect to home page after sign out
    if (window.location.pathname !== '/') {
      window.location.href = '/'
    }
  }

  // Open auth modal
  const openAuthModal = (defaultTab: 'signin' | 'signup' = 'signin') => {
    authModalDefaultTab.value = defaultTab
    showAuthModal.value = true
  }

  // Close auth modal
  const closeAuthModal = () => {
    showAuthModal.value = false
    error.value = null
  }

  // Require authentication (for checkout, etc.)
  const requireAuth = (): boolean => {
    if (!isAuthenticated.value) {
      openAuthModal('signin')
      return false
    }
    return true
  }

  // Initialize on first use
  if (!token.value && !user.value) {
    initAuth()
  }

  return {
    // State
    user,
    token,
    isLoading,
    error,
    isAuthenticated,
    showAuthModal,
    authModalDefaultTab,

    // Methods
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    openAuthModal,
    closeAuthModal,
    requireAuth,
    initAuth,
  }
}
