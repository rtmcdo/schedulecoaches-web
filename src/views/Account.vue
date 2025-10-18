<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const isLoading = ref(true)
const error = ref('')
const subscription = ref({
  status: 'active',
  plan: 'Pickleball Coach Monthly',
  price: '$20',
  billingPeriod: 'month',
  currentPeriodEnd: '2025-11-18',
  cancelAtPeriodEnd: false
})

onMounted(async () => {
  // TODO: Fetch actual subscription status from API
  // Simulate API call
  setTimeout(() => {
    isLoading.value = false
  }, 500)
})

const handleManageBilling = async () => {
  try {
    isLoading.value = true
    error.value = ''

    // Get the session_id from localStorage or session storage
    // In a real implementation, you'd have this from the login
    const sessionId = localStorage.getItem('stripe_session_id')

    if (!sessionId) {
      // If no session, redirect to Stripe portal directly
      // This is a fallback - in production you'd need to create a portal session via API
      alert('Please contact support@schedulecoaches.com to manage your subscription')
      return
    }

    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/api'}/create-portal-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create portal session')
    }

    // Redirect to Stripe Customer Portal
    window.location.href = data.url
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load billing portal'
    isLoading.value = false
  }
}

const handleSignOut = () => {
  // Clear session
  localStorage.removeItem('stripe_session_id')
  router.push('/')
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800'
    case 'past_due':
      return 'bg-yellow-100 text-yellow-800'
    case 'canceled':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Account Management</h1>
        <p class="text-lg text-gray-600">Manage your subscription and billing information</p>
      </div>

      <div v-if="isLoading" class="bg-white rounded-2xl shadow-lg p-8 text-center">
        <div class="animate-pulse">
          <div class="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
          <div class="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
        </div>
      </div>

      <div v-else class="space-y-6">
        <!-- Subscription Status Card -->
        <div class="bg-white rounded-2xl shadow-lg p-8">
          <div class="flex items-start justify-between mb-6">
            <div>
              <h2 class="text-2xl font-bold text-gray-900 mb-2">Your Subscription</h2>
              <div class="flex items-center gap-2">
                <span :class="['px-3 py-1 rounded-full text-sm font-medium', getStatusColor(subscription.status)]">
                  {{ subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1) }}
                </span>
                <span v-if="subscription.cancelAtPeriodEnd" class="px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                  Cancels on {{ formatDate(subscription.currentPeriodEnd) }}
                </span>
              </div>
            </div>
            <div class="text-right">
              <div class="text-3xl font-bold text-gray-900">{{ subscription.price }}</div>
              <div class="text-sm text-gray-500">per {{ subscription.billingPeriod }}</div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div class="bg-gray-50 rounded-lg p-4">
              <div class="text-sm text-gray-600 mb-1">Plan</div>
              <div class="font-semibold text-gray-900">{{ subscription.plan }}</div>
            </div>
            <div class="bg-gray-50 rounded-lg p-4">
              <div class="text-sm text-gray-600 mb-1">Next billing date</div>
              <div class="font-semibold text-gray-900">{{ formatDate(subscription.currentPeriodEnd) }}</div>
            </div>
          </div>

          <div v-if="error" class="mb-6 text-sm text-red-600 bg-red-50 p-4 rounded-lg">
            {{ error }}
          </div>

          <div class="flex flex-col sm:flex-row gap-4">
            <button
              @click="handleManageBilling"
              class="flex-1 bg-gradient-to-r from-primary-600 to-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-primary-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
            >
              Manage Billing & Payment
            </button>
            <button
              @click="handleSignOut"
              class="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="bg-white rounded-2xl shadow-lg p-8">
          <h3 class="text-xl font-bold text-gray-900 mb-6">Quick Actions</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="#"
              @click.prevent="handleManageBilling"
              class="flex items-start p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
            >
              <svg class="w-6 h-6 text-primary-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
              </svg>
              <div>
                <div class="font-semibold text-gray-900">Update Payment Method</div>
                <div class="text-sm text-gray-600">Change your credit card or payment details</div>
              </div>
            </a>

            <a
              href="#"
              @click.prevent="handleManageBilling"
              class="flex items-start p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
            >
              <svg class="w-6 h-6 text-primary-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <div>
                <div class="font-semibold text-gray-900">View Invoices</div>
                <div class="text-sm text-gray-600">Download past invoices and receipts</div>
              </div>
            </a>

            <RouterLink
              to="/contact"
              class="flex items-start p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
            >
              <svg class="w-6 h-6 text-primary-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"></path>
              </svg>
              <div>
                <div class="font-semibold text-gray-900">Get Support</div>
                <div class="text-sm text-gray-600">Contact our support team for help</div>
              </div>
            </RouterLink>

            <a
              href="#"
              @click.prevent="handleManageBilling"
              class="flex items-start p-4 border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors"
            >
              <svg class="w-6 h-6 text-red-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
              <div>
                <div class="font-semibold text-gray-900">Cancel Subscription</div>
                <div class="text-sm text-gray-600">End your subscription at any time</div>
              </div>
            </a>
          </div>
        </div>

        <!-- App Download -->
        <div class="bg-gradient-to-r from-primary-600 to-blue-600 rounded-2xl shadow-lg p-8 text-white">
          <h3 class="text-2xl font-bold mb-2">Download the App</h3>
          <p class="mb-6 text-primary-100">Get the most out of your subscription with our mobile app</p>
          <div class="flex flex-col sm:flex-row gap-4">
            <a
              href="https://apps.apple.com"
              target="_blank"
              class="inline-flex items-center justify-center px-6 py-3 bg-white text-gray-900 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg class="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Download on App Store
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
