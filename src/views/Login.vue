<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useEntraAuth } from '@/composables/useEntraAuth'

const router = useRouter()
const {
  login,
  loginWithGoogle,
  loginWithApple,
  isLoading: authLoading,
  error: authError
} = useEntraAuth()
const localError = ref('')

const isProcessing = computed(() => authLoading.value)
const displayError = computed(() => localError.value || authError.value || '')

const handleLogin = async () => {
  localError.value = ''

  try {
    // Redirect to Entra email login (uses redirect flow)
    await login('')
  } catch (err) {
    localError.value = err instanceof Error ? err.message : 'Login failed. Please try again.'
  }
}

const handleGoogleLogin = async () => {
  localError.value = ''
  try {
    const result = await loginWithGoogle()
    if (result === 'login_success') {
      router.push('/account')
    }
  } catch (err) {
    localError.value = err instanceof Error ? err.message : 'Google login failed. Please try again.'
  }
}

const handleAppleLogin = async () => {
  localError.value = ''
  try {
    const result = await loginWithApple()
    if (result === 'login_success') {
      router.push('/account')
    }
  } catch (err) {
    localError.value = err instanceof Error ? err.message : 'Apple login failed. Please try again.'
  }
}

</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md mx-auto">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
        <p class="text-lg text-gray-600">Sign in to manage your account and subscription</p>
      </div>

      <!-- Login Card -->
      <div class="bg-white rounded-2xl shadow-lg p-8 mb-6">
        <!-- OAuth Buttons -->
        <div class="space-y-3">
          <button
            @click="handleGoogleLogin"
            type="button"
            :disabled="isProcessing"
            class="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span v-if="!isProcessing">Continue with Google</span>
            <span v-else>Signing in...</span>
          </button>

          <button
            @click="handleAppleLogin"
            type="button"
            :disabled="isProcessing"
            class="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-black text-white hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            <span v-if="!isProcessing">Continue with Apple</span>
            <span v-else>Signing in...</span>
          </button>

          <button
            @click="handleLogin"
            type="button"
            :disabled="isProcessing"
            class="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
            <span v-if="!isProcessing">Continue with Email</span>
            <span v-else>Signing in...</span>
          </button>
        </div>

        <div v-if="displayError" class="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
          {{ displayError }}
        </div>
      </div>

      <!-- Don't have an account -->
      <div class="text-center">
        <p class="text-sm text-gray-600">
          Don't have an account?
          <RouterLink to="/sign-up" class="text-primary-600 hover:underline font-medium">Start your free trial</RouterLink>
        </p>
      </div>

      <!-- Help text -->
      <div class="mt-8 text-center">
        <p class="text-sm text-gray-500">
          Need help? Contact us at
          <a href="mailto:support@schedulecoaches.com" class="text-primary-600 hover:underline">
            support@schedulecoaches.com
          </a>
        </p>
      </div>
    </div>
  </div>
</template>
