import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useEntraAuth } from './useEntraAuth'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7071/api'

export function useStripeCheckout() {
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const router = useRouter()
  const { currentUser, checkAuth, getAccessToken } = useEntraAuth()

  const ensureAuthenticatedUser = async (): Promise<boolean> => {
    if (currentUser.value) {
      return true
    }

    try {
      const authenticated = await checkAuth()
      if (authenticated && currentUser.value) {
        return true
      }
    } catch (err) {
      console.error('[Stripe Checkout] Failed to verify authentication status:', err)
    }

    router.push('/sign-up')
    return false
  }

  const createCheckoutSession = async (lookupKey: string, referralCode?: string) => {
    // Require authentication before checkout
    const hasUser = await ensureAuthenticatedUser()
    if (!hasUser) {
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const token = await getAccessToken()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch(`${API_BASE_URL}/create-checkout-session`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          lookup_key: lookupKey,
          referral_code: referralCode,
          customer_email: currentUser.value?.email,
          metadata: {
            user_id: currentUser.value?.id,
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const data = await response.json()

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'An error occurred'
      console.error('Checkout error:', err)
    } finally {
      isLoading.value = false
    }
  }

  const createPortalSession = async (sessionId: string) => {
    isLoading.value = true
    error.value = null

    try {
      const token = await getAccessToken()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch(`${API_BASE_URL}/create-portal-session`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          session_id: sessionId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create portal session')
      }

      const data = await response.json()

      // Redirect to Stripe Customer Portal
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No portal URL received')
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'An error occurred'
      console.error('Portal error:', err)
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    error,
    createCheckoutSession,
    createPortalSession,
  }
}
