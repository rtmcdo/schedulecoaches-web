import { ref } from 'vue'
import { useAuth } from './useAuth'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7071/api'

export function useStripeCheckout() {
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const { user, requireAuth } = useAuth()

  const createCheckoutSession = async (lookupKey: string, referralCode?: string) => {
    // Require authentication before checkout
    if (!requireAuth()) {
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_BASE_URL}/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lookup_key: lookupKey,
          referral_code: referralCode,
          customer_email: user.value?.email,
          metadata: {
            user_id: user.value?.id,
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
      const response = await fetch(`${API_BASE_URL}/create-portal-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
