<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="checkout-cancel">
    <div class="container mx-auto px-6 py-20 md:py-32">
      <div class="max-w-2xl mx-auto text-center">
        <!-- Cancel Icon -->
        <div class="mb-8">
          <div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
            <svg class="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
        </div>

        <!-- Cancel Message -->
        <h1 class="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Checkout Canceled
        </h1>
        <p class="text-xl text-gray-600 mb-8">
          Your subscription was not activated. No charges were made to your account.
        </p>

        <!-- Return Options -->
        <div class="bg-gray-50 rounded-2xl p-8 md:p-12 mb-8">
          <p class="text-gray-700 mb-6">
            Changed your mind? You can still subscribe to get started with ScheduleCoaches.
          </p>

          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <RouterLink
              to="/pickleball-coach"
              class="inline-block bg-primary-600 hover:bg-primary-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors shadow-lg hover:shadow-xl"
            >
              View Features
            </RouterLink>
            <RouterLink
              to="/"
              class="inline-block bg-white hover:bg-gray-50 text-gray-700 font-semibold px-8 py-3 rounded-lg border-2 border-gray-300 transition-colors"
            >
              Back to Home
            </RouterLink>
          </div>
        </div>

        <!-- FAQ Link -->
        <div class="mt-8">
          <p class="text-gray-600">
            Have questions? Check out our <RouterLink to="/faq" class="text-primary-600 hover:text-primary-700 font-semibold">FAQ page</RouterLink> or contact us at <a href="mailto:support@schedulecoaches.com" class="text-primary-600 hover:text-primary-700 font-semibold">support@schedulecoaches.com</a>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
