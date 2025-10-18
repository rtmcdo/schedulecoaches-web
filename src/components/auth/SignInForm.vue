<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import GoogleSignInButton from './GoogleSignInButton.vue'
import AppleSignInButton from './AppleSignInButton.vue'

defineEmits<{
  switchToSignup: []
}>()

const { signIn, isLoading, error } = useAuth()

const email = ref('')
const password = ref('')

const handleSubmit = async () => {
  try {
    await signIn({
      email: email.value,
      password: password.value,
    })
  } catch (err) {
    // Error is handled by useAuth
    console.error('Sign in error:', err)
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- OAuth Buttons -->
    <div class="space-y-3">
      <GoogleSignInButton />
      <AppleSignInButton />
    </div>

    <!-- Divider -->
    <div class="relative">
      <div class="absolute inset-0 flex items-center">
        <div class="w-full border-t border-gray-300"></div>
      </div>
      <div class="relative flex justify-center text-sm">
        <span class="px-2 bg-white text-gray-500">Or continue with email</span>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
      {{ error }}
    </div>

    <!-- Email/Password Form -->
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <label for="signin-email" class="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          id="signin-email"
          v-model="email"
          type="email"
          required
          autocomplete="email"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label for="signin-password" class="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <input
          id="signin-password"
          v-model="password"
          type="password"
          required
          autocomplete="current-password"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
          placeholder="••••••••"
        />
      </div>

      <!-- Forgot Password Link -->
      <div class="flex items-center justify-end">
        <a href="#" class="text-sm text-primary-600 hover:text-primary-700 font-medium">
          Forgot password?
        </a>
      </div>

      <!-- Submit Button -->
      <button
        type="submit"
        :disabled="isLoading"
        class="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span v-if="isLoading">Signing in...</span>
        <span v-else>Sign In</span>
      </button>
    </form>

    <!-- Switch to Sign Up -->
    <div class="text-center text-sm text-gray-600">
      Don't have an account?
      <button
        @click="$emit('switchToSignup')"
        class="text-primary-600 hover:text-primary-700 font-semibold"
      >
        Sign up
      </button>
    </div>
  </div>
</template>
