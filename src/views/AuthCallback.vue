<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useEntraAuth } from '@/composables/useEntraAuth'

const router = useRouter()
const { handleRedirectCallback } = useEntraAuth()
const status = ref('Processing authentication...')
const hasError = ref(false)

onMounted(async () => {
  try {
    console.log('[AuthCallback] Processing Entra redirect')
    status.value = 'Verifying your account...'

    const result = await handleRedirectCallback()

    if (result === 'redirecting_to_stripe') {
      status.value = 'Redirecting to payment...'
      // handleRedirectCallback will redirect to Stripe
    } else if (result === 'login_success') {
      status.value = 'Login successful! Redirecting...'
      setTimeout(() => {
        router.push('/account')
      }, 1000)
    } else if (result === null) {
      // No redirect response, go home
      console.log('[AuthCallback] No redirect response, returning home')
      router.push('/')
    } else {
      status.value = 'Authentication successful!'
      setTimeout(() => {
        router.push('/')
      }, 1000)
    }
  } catch (error: any) {
    console.error('[AuthCallback] Error processing redirect:', error)
    hasError.value = true
    status.value = error.message || 'Authentication failed. Please try again.'

    // Redirect back to sign up page after error
    setTimeout(() => {
      router.push('/sign-up')
    }, 3000)
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-blue-50">
    <div class="text-center max-w-md mx-auto px-4">
      <div v-if="!hasError" class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
      <div v-else class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </div>
      <h1 class="text-2xl font-bold text-gray-900 mb-2">{{ hasError ? 'Authentication Error' : 'Processing...' }}</h1>
      <p :class="hasError ? 'text-red-600' : 'text-gray-600'">{{ status }}</p>
      <p v-if="hasError" class="text-sm text-gray-500 mt-4">Redirecting you back to sign up...</p>
    </div>
  </div>
</template>
