<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import GoogleSignInButton from './GoogleSignInButton.vue'
import AppleSignInButton from './AppleSignInButton.vue'

defineEmits<{
  switchToSignin: []
}>()

const { signUp, isLoading, error } = useAuth()

const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const acceptTerms = ref(false)
const validationError = ref<string | null>(null)

const handleSubmit = async () => {
  validationError.value = null

  // Validation
  if (password.value.length < 8) {
    validationError.value = 'Password must be at least 8 characters long'
    return
  }

  if (password.value !== confirmPassword.value) {
    validationError.value = 'Passwords do not match'
    return
  }

  if (!acceptTerms.value) {
    validationError.value = 'You must accept the terms and conditions'
    return
  }

  try {
    await signUp({
      name: name.value,
      email: email.value,
      password: password.value,
    })
  } catch (err) {
    // Error is handled by useAuth
    console.error('Sign up error:', err)
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
    <div v-if="error || validationError" class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
      {{ error || validationError }}
    </div>

    <!-- Email/Password Form -->
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <label for="signup-name" class="block text-sm font-medium text-gray-700 mb-1">
          Full Name
        </label>
        <input
          id="signup-name"
          v-model="name"
          type="text"
          required
          autocomplete="name"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
          placeholder="John Doe"
        />
      </div>

      <div>
        <label for="signup-email" class="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          id="signup-email"
          v-model="email"
          type="email"
          required
          autocomplete="email"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label for="signup-password" class="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <input
          id="signup-password"
          v-model="password"
          type="password"
          required
          autocomplete="new-password"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
          placeholder="••••••••"
        />
        <p class="mt-1 text-xs text-gray-500">Must be at least 8 characters</p>
      </div>

      <div>
        <label for="signup-confirm-password" class="block text-sm font-medium text-gray-700 mb-1">
          Confirm Password
        </label>
        <input
          id="signup-confirm-password"
          v-model="confirmPassword"
          type="password"
          required
          autocomplete="new-password"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
          placeholder="••••••••"
        />
      </div>

      <!-- Terms Acceptance -->
      <div class="flex items-start">
        <input
          id="accept-terms"
          v-model="acceptTerms"
          type="checkbox"
          class="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
        />
        <label for="accept-terms" class="ml-2 text-sm text-gray-600">
          I agree to the
          <a href="/terms" target="_blank" class="text-primary-600 hover:text-primary-700 font-medium">Terms of Service</a>
          and
          <a href="/privacy" target="_blank" class="text-primary-600 hover:text-primary-700 font-medium">Privacy Policy</a>
        </label>
      </div>

      <!-- Submit Button -->
      <button
        type="submit"
        :disabled="isLoading"
        class="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span v-if="isLoading">Creating account...</span>
        <span v-else>Create Account</span>
      </button>
    </form>

    <!-- Switch to Sign In -->
    <div class="text-center text-sm text-gray-600">
      Already have an account?
      <button
        @click="$emit('switchToSignin')"
        class="text-primary-600 hover:text-primary-700 font-semibold"
      >
        Sign in
      </button>
    </div>
  </div>
</template>
