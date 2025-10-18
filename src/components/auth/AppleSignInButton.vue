<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuth } from '@/composables/useAuth'

const { signInWithOAuth } = useAuth()
const isLoading = ref(false)

// Declare AppleID global
declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (config: any) => void
        signIn: () => Promise<any>
      }
    }
  }
}

onMounted(() => {
  // Initialize Apple Sign-In when the component mounts
  if (window.AppleID) {
    initializeAppleSignIn()
  } else {
    // If Apple SDK not loaded yet, wait for it
    const checkApple = setInterval(() => {
      if (window.AppleID) {
        clearInterval(checkApple)
        initializeAppleSignIn()
      }
    }, 100)

    // Stop checking after 10 seconds
    setTimeout(() => clearInterval(checkApple), 10000)
  }
})

const initializeAppleSignIn = () => {
  if (!window.AppleID) return

  try {
    window.AppleID.auth.init({
      clientId: import.meta.env.VITE_APPLE_CLIENT_ID,
      scope: 'name email',
      redirectURI: import.meta.env.VITE_APPLE_REDIRECT_URI || window.location.origin,
      usePopup: true,
    })
  } catch (err) {
    console.error('Apple Sign-In initialization error:', err)
  }
}

const handleAppleSignIn = async () => {
  if (!window.AppleID) {
    console.error('Apple Sign-In not available')
    return
  }

  isLoading.value = true

  try {
    const response = await window.AppleID.auth.signIn()

    // Extract the identity token and user info
    const { authorization, user } = response

    await signInWithOAuth({
      provider: 'apple',
      idToken: authorization.id_token,
      email: user?.email,
      name: user?.name ? `${user.name.firstName} ${user.name.lastName}` : undefined,
    })
  } catch (err: any) {
    // User cancelled or error occurred
    if (err?.error !== 'popup_closed_by_user') {
      console.error('Apple sign-in error:', err)
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <button
    @click="handleAppleSignIn"
    :disabled="isLoading"
    class="w-full flex items-center justify-center gap-3 bg-black hover:bg-gray-900 text-white font-semibold px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <!-- Apple Logo -->
    <svg v-if="!isLoading" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>

    <!-- Loading Spinner -->
    <div
      v-if="isLoading"
      class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"
    ></div>

    <span v-if="isLoading">Signing in...</span>
    <span v-else>Continue with Apple</span>
  </button>
</template>
