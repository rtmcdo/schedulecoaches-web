<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useStripeCheckout } from '@/composables/useStripeCheckout'
import { useAuth } from '@/composables/useAuth'

const route = useRoute()
const mobileMenuOpen = ref(false)
const sportsDropdownOpen = ref(false)
const userDropdownOpen = ref(false)
const isScrolled = ref(false)

const { isLoading, error, createCheckoutSession } = useStripeCheckout()
const { user, isAuthenticated, openAuthModal, signOut } = useAuth()

const handleScroll = () => {
  isScrolled.value = window.scrollY > 10
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

const closeMobileMenu = () => {
  mobileMenuOpen.value = false
  sportsDropdownOpen.value = false
  userDropdownOpen.value = false
}

const toggleSportsDropdown = () => {
  sportsDropdownOpen.value = !sportsDropdownOpen.value
}

const toggleUserDropdown = () => {
  userDropdownOpen.value = !userDropdownOpen.value
}

const handleCheckout = async () => {
  await createCheckoutSession('pickleball_monthly')
}

const handleSignOut = () => {
  signOut()
  closeMobileMenu()
}

// Get user initials for avatar
const getUserInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}
</script>

<template>
  <header
    class="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
    :class="isScrolled ? 'bg-white shadow-md' : 'shadow-md md:shadow-none'"
  >
    <nav class="mx-auto flex justify-between items-center py-4 px-5 md:py-4 max-w-7xl">
      <!-- Logo -->
      <RouterLink to="/" class="flex items-center gap-2" @click="closeMobileMenu">
        <span class="text-xl font-semibold cursor-pointer text-primary-600">
          ScheduleCoaches
        </span>
      </RouterLink>

      <!-- Desktop Menu -->
      <ul class="hidden md:flex space-x-6 items-center">
        <li>
          <RouterLink
            to="/"
            class="text-gray-700 hover:text-primary-600 transition-colors font-medium"
          >
            Home
          </RouterLink>
        </li>
        <li class="relative">
          <button
            @click="toggleSportsDropdown"
            class="text-gray-700 hover:text-primary-600 transition-colors font-medium flex items-center gap-1"
          >
            Sports
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <!-- Dropdown Menu -->
          <Transition
            enter-active-class="transition ease-out duration-100"
            enter-from-class="transform opacity-0 scale-95"
            enter-to-class="transform opacity-100 scale-100"
            leave-active-class="transition ease-in duration-75"
            leave-from-class="transform opacity-100 scale-100"
            leave-to-class="transform opacity-0 scale-95"
          >
            <div
              v-if="sportsDropdownOpen"
              class="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50"
            >
              <RouterLink
                to="/pickleball-coach"
                @click="sportsDropdownOpen = false"
                class="block px-4 py-2 text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
              >
                Pickleball
              </RouterLink>
              <RouterLink
                to="/tennis-coach"
                @click="sportsDropdownOpen = false"
                class="block px-4 py-2 text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
              >
                Tennis
              </RouterLink>
            </div>
          </Transition>
        </li>
        <li>
          <RouterLink
            to="/faq"
            class="text-gray-700 hover:text-primary-600 transition-colors font-medium"
          >
            FAQ
          </RouterLink>
        </li>
        <li>
          <RouterLink
            to="/contact"
            class="text-gray-700 hover:text-primary-600 transition-colors font-medium"
          >
            Contact
          </RouterLink>
        </li>
      </ul>

      <!-- Desktop CTA / User Menu -->
      <div class="hidden md:block">
        <!-- User Menu (Authenticated) -->
        <div v-if="isAuthenticated && user" class="relative">
          <button
            @click="toggleUserDropdown"
            class="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <!-- User Avatar -->
            <div class="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
              {{ getUserInitials(user.name) }}
            </div>
            <svg class="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <!-- Dropdown Menu -->
          <Transition
            enter-active-class="transition ease-out duration-100"
            enter-from-class="transform opacity-0 scale-95"
            enter-to-class="transform opacity-100 scale-100"
            leave-active-class="transition ease-in duration-75"
            leave-from-class="transform opacity-100 scale-100"
            leave-to-class="transform opacity-0 scale-95"
          >
            <div
              v-if="userDropdownOpen"
              class="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg py-2 z-50 border border-gray-200"
            >
              <!-- User Info -->
              <div class="px-4 py-3 border-b border-gray-200">
                <p class="text-sm font-semibold text-gray-900">{{ user.name }}</p>
                <p class="text-xs text-gray-500 truncate">{{ user.email }}</p>
              </div>

              <!-- Menu Items -->
              <a
                href="#"
                class="block px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
              >
                My Account
              </a>
              <a
                href="#"
                class="block px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
              >
                Billing
              </a>

              <!-- Sign Out -->
              <button
                @click="handleSignOut"
                class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-200 mt-1"
              >
                Sign Out
              </button>
            </div>
          </Transition>
        </div>

        <!-- Buy Now Button (Not Authenticated) -->
        <button
          v-else
          @click="handleCheckout"
          :disabled="isLoading"
          class="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="isLoading">Processing...</span>
          <span v-else>Buy Now</span>
        </button>
      </div>

      <!-- Mobile Menu Button -->
      <button
        @click="toggleMobileMenu"
        type="button"
        class="md:hidden bg-primary-600 text-white focus:outline-none rounded-full w-10 h-10 flex items-center justify-center"
        :aria-expanded="mobileMenuOpen"
      >
        <svg
          v-if="!mobileMenuOpen"
          class="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
        <svg
          v-else
          class="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
        <span class="sr-only">Toggle navigation</span>
      </button>
    </nav>

    <!-- Mobile Menu with Transition -->
    <Transition
      enter-active-class="transition ease-out duration-200 transform"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75 transform"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="mobileMenuOpen"
        class="md:hidden bg-white shadow-lg"
      >
        <ul class="flex flex-col space-y-4 pt-1 pb-6 px-6">
          <li>
            <RouterLink
              to="/"
              @click="closeMobileMenu"
              class="text-gray-700 hover:text-primary-600 block transition-colors"
            >
              Home
            </RouterLink>
          </li>
          <li>
            <div class="space-y-2">
              <button
                @click="toggleSportsDropdown"
                class="text-gray-700 hover:text-primary-600 transition-colors font-medium flex items-center justify-between w-full"
              >
                Sports
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" :class="{ 'rotate-180': sportsDropdownOpen }">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div v-if="sportsDropdownOpen" class="pl-4 space-y-2">
                <RouterLink
                  to="/pickleball-coach"
                  @click="closeMobileMenu"
                  class="text-gray-700 hover:text-primary-600 block transition-colors"
                >
                  Pickleball
                </RouterLink>
                <RouterLink
                  to="/tennis-coach"
                  @click="closeMobileMenu"
                  class="text-gray-700 hover:text-primary-600 block transition-colors"
                >
                  Tennis
                </RouterLink>
              </div>
            </div>
          </li>
          <li>
            <RouterLink
              to="/faq"
              @click="closeMobileMenu"
              class="text-gray-700 hover:text-primary-600 block transition-colors"
            >
              FAQ
            </RouterLink>
          </li>
          <li>
            <RouterLink
              to="/contact"
              @click="closeMobileMenu"
              class="text-gray-700 hover:text-primary-600 block transition-colors"
            >
              Contact
            </RouterLink>
          </li>
          <!-- User Info / CTA -->
          <li v-if="isAuthenticated && user" class="pt-2 border-t border-gray-200">
            <div class="flex items-center gap-3 py-3">
              <div class="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                {{ getUserInitials(user.name) }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-900 truncate">{{ user.name }}</p>
                <p class="text-xs text-gray-500 truncate">{{ user.email }}</p>
              </div>
            </div>
            <div class="space-y-2">
              <a
                href="#"
                class="block px-4 py-2 text-gray-700 hover:text-primary-600 transition-colors rounded-lg hover:bg-primary-50"
              >
                My Account
              </a>
              <a
                href="#"
                class="block px-4 py-2 text-gray-700 hover:text-primary-600 transition-colors rounded-lg hover:bg-primary-50"
              >
                Billing
              </a>
              <button
                @click="handleSignOut"
                class="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition-colors rounded-lg"
              >
                Sign Out
              </button>
            </div>
          </li>

          <!-- Buy Now Button (Not Authenticated) -->
          <li v-else class="pt-2">
            <button
              @click="handleCheckout"
              :disabled="isLoading"
              class="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors shadow-sm text-center w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="isLoading">Processing...</span>
              <span v-else>Buy Now</span>
            </button>
          </li>
        </ul>
      </div>
    </Transition>
  </header>
</template>

<style scoped>
.router-link-active {
  color: #2563eb;
}
</style>
