<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'

const isVisible = ref(false)

onMounted(() => {
  // Trigger animation after component mounts
  setTimeout(() => {
    isVisible.value = true
  }, 100)
})
</script>

<template>
  <section class="relative bg-gradient-to-br from-primary-50 via-white to-blue-50 py-20 md:py-32 overflow-hidden">
    <!-- Background Pattern -->
    <div class="absolute inset-0 opacity-5">
      <div class="absolute transform rotate-45 -right-32 -top-32 w-96 h-96 bg-primary-400 rounded-full blur-3xl"></div>
      <div class="absolute transform -rotate-45 -left-32 -bottom-32 w-96 h-96 bg-blue-400 rounded-full blur-3xl"></div>
    </div>

    <div class="container mx-auto px-6 relative z-10">
      <!-- Hero Text -->
      <Transition
        enter-active-class="transition-all duration-1000 ease-out"
        enter-from-class="opacity-0 translate-y-8"
        enter-to-class="opacity-100 translate-y-0"
      >
        <div v-if="isVisible" class="text-center mb-16">
          <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Manage Your Coaching Business
          </h1>
          <p class="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto">
            Professional coaching management software for Pickleball and Tennis coaches.
            Schedule sessions, track clients, and grow your business.
          </p>
        </div>
      </Transition>

      <!-- Sport Cards -->
      <Transition
        enter-active-class="transition-all duration-1000 ease-out delay-300"
        enter-from-class="opacity-0 translate-y-8"
        enter-to-class="opacity-100 translate-y-0"
      >
        <div v-if="isVisible" class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <!-- Pickleball Coach Card -->
          <RouterLink
            to="/pickleball-coach"
            class="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-transparent hover:border-primary-400 transform hover:-translate-y-2"
          >
            <div class="p-8">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-2xl font-bold text-gray-900">Pickleball Coach</h3>
                <div class="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                  <svg class="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
              <p class="text-gray-600 mb-6">
                Complete coaching management for pickleball professionals. Track sessions, manage clients, and handle payments all in one place.
              </p>

              <!-- Feature Highlights -->
              <div class="space-y-3 mb-6">
                <div class="flex items-center text-sm text-gray-700">
                  <svg class="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                  Schedule Management
                </div>
                <div class="flex items-center text-sm text-gray-700">
                  <svg class="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                  Client Database
                </div>
                <div class="flex items-center text-sm text-gray-700">
                  <svg class="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                  Revenue Tracking
                </div>
              </div>

              <div class="inline-flex items-center text-primary-600 font-semibold group-hover:text-primary-700">
                Learn More
                <svg class="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </RouterLink>

          <!-- Tennis Coach Card -->
          <div class="relative bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-gray-200">
            <div class="p-8 opacity-75">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-2xl font-bold text-gray-900">Tennis Coach</h3>
                <span class="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-semibold rounded-full">
                  Coming Soon
                </span>
              </div>
              <p class="text-gray-600 mb-6">
                Professional coaching management built specifically for tennis coaches. All the same powerful features, tailored for tennis.
              </p>

              <!-- Feature Highlights -->
              <div class="space-y-3 mb-6">
                <div class="flex items-center text-sm text-gray-700">
                  <svg class="w-5 h-5 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                  Schedule Management
                </div>
                <div class="flex items-center text-sm text-gray-700">
                  <svg class="w-5 h-5 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                  Client Database
                </div>
                <div class="flex items-center text-sm text-gray-700">
                  <svg class="w-5 h-5 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                  Revenue Tracking
                </div>
              </div>

              <div class="inline-flex items-center text-gray-500 font-semibold">
                Launching Soon
              </div>
            </div>

            <!-- Coming Soon Overlay Badge -->
            <div class="absolute top-0 right-0 w-32 h-32 overflow-hidden">
              <div class="absolute transform rotate-45 bg-yellow-400 text-yellow-900 text-xs font-bold py-1 right-[-35px] top-[32px] w-[170px] text-center shadow-lg">
                COMING SOON
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Additional CTA -->
      <Transition
        enter-active-class="transition-all duration-1000 ease-out delay-500"
        enter-from-class="opacity-0 translate-y-8"
        enter-to-class="opacity-100 translate-y-0"
      >
        <div v-if="isVisible" class="text-center mt-12">
          <RouterLink
            to="/checkout-success"
            class="inline-block bg-primary-600 hover:bg-primary-700 text-white font-bold px-8 py-4 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Get Started Today
          </RouterLink>
        </div>
      </Transition>
    </div>
  </section>
</template>

<style scoped>
</style>
