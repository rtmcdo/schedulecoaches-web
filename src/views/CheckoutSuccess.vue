<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useStripeCheckout } from '@/composables/useStripeCheckout'

const route = useRoute()
const { isLoading, error, createPortalSession } = useStripeCheckout()
const sessionId = ref<string | null>(null)

onMounted(() => {
  // Get session_id from URL query params
  sessionId.value = route.query.session_id as string || null
})

const handleManageBilling = async () => {
  if (sessionId.value) {
    await createPortalSession(sessionId.value)
  }
}
</script>

<template>
  <div class="checkout-success">
    <div class="container mx-auto px-6 py-20 md:py-32">
      <div class="max-w-2xl mx-auto text-center">
        <!-- Success Icon -->
        <div class="mb-8">
          <div class="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg class="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
        </div>

        <!-- Success Message -->
        <h1 class="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Welcome to ScheduleCoaches!
        </h1>
        <p class="text-xl text-gray-600 mb-4">
          Your subscription has been activated successfully.
        </p>
        <p class="text-base text-gray-500 mb-8">
          We've sent a receipt to your email address.
        </p>

        <!-- App Download Section -->
        <div class="bg-gradient-to-br from-primary-50 to-blue-50 rounded-2xl p-8 md:p-12 mb-8">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">
            Get Started with the App
          </h2>
          <p class="text-gray-600 mb-6">
            Download the Pickleball Coach app to start managing your coaching business.
          </p>

          <div class="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <a
              href="https://apps.apple.com/app/pickleball-coach"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center justify-center bg-black text-white font-semibold px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <svg class="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              App Store
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.pickleballcoach"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center justify-center bg-black text-white font-semibold px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <svg class="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.5,12.92 20.16,13.19L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
              </svg>
              Google Play
            </a>
          </div>

          <p class="text-sm text-gray-500">
            Use the same email address you used for this subscription to log in to the app.
          </p>
        </div>

        <!-- Manage Billing Section -->
        <div class="border-t border-gray-200 pt-8">
          <h3 class="text-xl font-bold text-gray-900 mb-4">
            Manage Your Subscription
          </h3>
          <p class="text-gray-600 mb-6">
            Need to update your payment method or cancel your subscription?
          </p>
          <button
            v-if="sessionId"
            @click="handleManageBilling"
            :disabled="isLoading"
            class="inline-block bg-primary-600 hover:bg-primary-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isLoading">Loading...</span>
            <span v-else>Manage Billing</span>
          </button>
          <p class="text-sm text-gray-500 mt-4">
            You can update your billing information, view invoices, and manage your subscription anytime.
          </p>
          <p v-if="error" class="text-red-600 text-sm mt-2">{{ error }}</p>
        </div>

        <!-- Support Section -->
        <div class="mt-12 pt-8 border-t border-gray-200">
          <p class="text-gray-600">
            Questions? Contact us at <a href="mailto:support@schedulecoaches.com" class="text-primary-600 hover:text-primary-700 font-semibold">support@schedulecoaches.com</a>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
