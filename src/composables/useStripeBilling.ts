import { ref } from 'vue'

const API_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export function useStripeBilling() {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Open Stripe Billing Portal
   *
   * Creates a billing portal session and redirects the user to Stripe's hosted portal
   * where they can:
   * - Update payment methods
   * - View invoices
   * - Cancel subscription
   * - Update billing information
   */
  async function openBillingPortal(accessToken: string) {
    isLoading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_URL}/api/create-portal-session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to open billing portal')
      }

      const data = await response.json()

      if (!data.url) {
        throw new Error('No portal URL received')
      }

      // Redirect to Stripe Billing Portal
      window.location.href = data.url

    } catch (err: any) {
      console.error('Billing portal error:', err)
      error.value = err.message || 'Failed to open billing portal'
      isLoading.value = false
      throw err
    }
  }

  return {
    isLoading,
    error,
    openBillingPortal
  }
}
