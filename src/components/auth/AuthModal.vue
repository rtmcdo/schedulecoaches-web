<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAuth } from '@/composables/useAuth'
import SignInForm from './SignInForm.vue'
import SignUpForm from './SignUpForm.vue'

const { showAuthModal, authModalDefaultTab, closeAuthModal } = useAuth()

const activeTab = ref<'signin' | 'signup'>('signin')

// Watch for default tab changes
watch(authModalDefaultTab, (newTab) => {
  activeTab.value = newTab
})

// Watch for modal opening to reset tab
watch(showAuthModal, (isOpen) => {
  if (isOpen) {
    activeTab.value = authModalDefaultTab.value
  }
})

const switchTab = (tab: 'signin' | 'signup') => {
  activeTab.value = tab
}
</script>

<template>
  <!-- Modal Backdrop -->
  <Transition
    enter-active-class="transition-opacity duration-300"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-200"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="showAuthModal"
      class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      @click.self="closeAuthModal"
    >
      <!-- Modal Content -->
      <Transition
        enter-active-class="transition-all duration-300"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition-all duration-200"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="showAuthModal"
          class="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
          @click.stop
        >
          <!-- Header -->
          <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
            <div class="flex items-center justify-between">
              <h2 class="text-2xl font-bold text-gray-900">
                {{ activeTab === 'signin' ? 'Welcome Back' : 'Create Account' }}
              </h2>
              <button
                @click="closeAuthModal"
                class="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Tab Navigation -->
            <div class="flex gap-4 mt-4">
              <button
                @click="switchTab('signin')"
                class="flex-1 pb-2 text-sm font-semibold transition-colors relative"
                :class="activeTab === 'signin' ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'"
              >
                Sign In
                <div
                  v-if="activeTab === 'signin'"
                  class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600"
                ></div>
              </button>
              <button
                @click="switchTab('signup')"
                class="flex-1 pb-2 text-sm font-semibold transition-colors relative"
                :class="activeTab === 'signup' ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'"
              >
                Sign Up
                <div
                  v-if="activeTab === 'signup'"
                  class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600"
                ></div>
              </button>
            </div>
          </div>

          <!-- Form Content -->
          <div class="p-6">
            <SignInForm v-if="activeTab === 'signin'" @switch-to-signup="switchTab('signup')" />
            <SignUpForm v-else @switch-to-signin="switchTab('signin')" />
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<style scoped>
/* Ensure modal is above everything */
.z-50 {
  z-index: 9999;
}
</style>
