<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useEntraAuth } from '@/composables/useEntraAuth'

const router = useRouter()
const { currentUser, getAccessToken } = useEntraAuth()
const isAuthenticated = computed(() => !!currentUser.value)
const token = computed(() => getAccessToken())

const isLoading = ref(true)
const error = ref('')

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

onMounted(async () => {
  // Redirect to login if not authenticated
  if (!isAuthenticated.value || !token.value) {
    router.push('/login')
    return
  }

  // Redirect directly to Stripe portal
  await handleManageBilling()
})

const handleManageBilling = async () => {
  try {
    isLoading.value = true
    error.value = ''

    if (!token.value) {
      throw new Error('You must be logged in to manage billing')
    }

    // Call the backend to create a Stripe billing portal session
    const response = await fetch(`${API_BASE_URL}/api/create-portal-session`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.value}`,
        'Content-Type': 'application/json',
      },
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
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-blue-50">
    <div class="text-center max-w-md mx-auto px-4">
      <div v-if="!error" class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
      <div v-else class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </div>
      <h1 class="text-2xl font-bold text-gray-900 mb-2">{{ error ? 'Error' : 'Redirecting...' }}</h1>
      <p :class="error ? 'text-red-600' : 'text-gray-600'">
        {{ error || 'Taking you to the billing portal...' }}
      </p>
      <button
        v-if="error"
        @click="router.push('/login')"
        class="mt-6 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
      >
        Back to Login
      </button>
    </div>
  </div>
</template>
