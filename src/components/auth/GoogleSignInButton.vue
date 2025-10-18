<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuth } from '@/composables/useAuth'

const { signInWithOAuth } = useAuth()
const isLoading = ref(false)

// Declare google global
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void
          renderButton: (element: HTMLElement, config: any) => void
        }
      }
    }
  }
}

onMounted(() => {
  // Initialize Google Sign-In when the component mounts
  if (window.google) {
    initializeGoogleSignIn()
  } else {
    // If Google SDK not loaded yet, wait for it
    const checkGoogle = setInterval(() => {
      if (window.google) {
        clearInterval(checkGoogle)
        initializeGoogleSignIn()
      }
    }, 100)

    // Stop checking after 10 seconds
    setTimeout(() => clearInterval(checkGoogle), 10000)
  }
})

const initializeGoogleSignIn = () => {
  if (!window.google) return

  window.google.accounts.id.initialize({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    callback: handleGoogleResponse,
  })

  // Render the Google Sign-In button
  const buttonDiv = document.getElementById('google-signin-button')
  if (buttonDiv) {
    window.google.accounts.id.renderButton(
      buttonDiv,
      {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        width: buttonDiv.offsetWidth,
      }
    )
  }
}

const handleGoogleResponse = async (response: any) => {
  isLoading.value = true

  try {
    // The response contains the JWT credential
    await signInWithOAuth({
      provider: 'google',
      idToken: response.credential,
    })
  } catch (err) {
    console.error('Google sign-in error:', err)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="relative">
    <!-- Google Sign-In Button Container -->
    <div id="google-signin-button" class="w-full"></div>

    <!-- Loading Overlay -->
    <div
      v-if="isLoading"
      class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg"
    >
      <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
    </div>
  </div>
</template>

<style scoped>
/* Ensure the Google button fills the width */
#google-signin-button > div {
  width: 100% !important;
}
</style>
