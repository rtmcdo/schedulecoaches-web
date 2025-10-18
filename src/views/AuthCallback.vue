<script setup lang="ts">
import { onMounted } from 'vue'

/**
 * Auth Callback Page
 *
 * This page handles the redirect from Microsoft Entra ID after authentication.
 * MSAL will automatically process the token and close the popup/redirect.
 * This page is mostly for display purposes during the redirect.
 */

onMounted(() => {
  // MSAL handles the callback automatically
  // This page will either:
  // 1. Close automatically (if in popup mode)
  // 2. Redirect back to the app (if in redirect mode)
  console.log('Auth callback received')
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-blue-50">
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Completing sign in...</h1>
      <p class="text-gray-600">Please wait while we finish setting up your account.</p>
    </div>
  </div>
</template>
