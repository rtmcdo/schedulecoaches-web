<script setup lang="ts">
import { RouterLink } from 'vue-router'
import FeatureSection from '@/components/FeatureSection.vue'
import PricingSection from '@/components/PricingSection.vue'

// Feature data for each section
const dashboardFeatures = [
  { text: 'View today\'s schedule at a glance' },
  { text: 'Track upcoming appointments and availability' },
  { text: 'Monitor revenue and client statistics' },
  { text: 'Quick access to all coaching activities' }
]

const calendarFeatures = [
  { text: 'Intuitive weekly and monthly calendar views' },
  { text: 'Drag-and-drop appointment scheduling' },
  { text: 'Set recurring availability patterns' },
  { text: 'Sync with your device calendar' }
]

const clientFeatures = [
  { text: 'Maintain detailed client profiles and contact info' },
  { text: 'Track session history and progress notes' },
  { text: 'Monitor client packages and remaining sessions' },
  { text: 'Send automated reminders via SMS and email' }
]

const settingsFeatures = [
  { text: 'Configure session types: private coaching and clinics' },
  { text: 'Set custom pricing and session durations' },
  { text: 'Share your dedicated booking URL and QR code' },
  { text: 'Customize availability and business hours' }
]
</script>

<template>
  <div class="pickleball-coach">
    <!-- Hero Section -->
    <section class="bg-gradient-to-br from-primary-50 via-white to-blue-50 py-20 md:py-28">
      <div class="container mx-auto px-6 text-center">
        <div class="inline-block bg-primary-600 text-white text-sm font-semibold px-4 py-2 rounded-full mb-6">
          Only $20/month
        </div>
        <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
          Everything You Need to<br class="hidden sm:block" />Run Your Pickleball Coaching Business
        </h1>
        <p class="text-xl text-gray-600 max-w-3xl mx-auto mb-10">
          Professional coaching management software designed specifically for pickleball coaches.
          Schedule sessions, manage clients, track revenue, and grow your business—all from your phone or desktop.
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <RouterLink
            to="/checkout-success"
            class="inline-block bg-primary-600 hover:bg-primary-700 text-white font-bold px-8 py-4 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Start Your Free Trial
          </RouterLink>
          <a
            href="#features"
            class="inline-block bg-white hover:bg-gray-50 text-primary-600 font-bold px-8 py-4 rounded-lg border-2 border-primary-600 transition-all duration-300"
          >
            See All Features
          </a>
        </div>
      </div>
    </section>

    <!-- Dashboard Feature -->
    <FeatureSection
      title="Dashboard & Analytics"
      description="Get a complete overview of your coaching business with an intuitive dashboard. See today's schedule, upcoming appointments, and key metrics all in one place. Stay organized and never miss a session."
      :features="dashboardFeatures"
      screenshot="/assets/screenshots/dashboard.png"
      image-position="right"
    />

    <!-- Calendar Feature -->
    <section class="bg-gray-50">
      <FeatureSection
        title="Calendar Management"
        description="Effortlessly manage your coaching schedule with powerful calendar tools. Set your availability, book appointments, and let clients schedule sessions through your dedicated booking link. Automatic reminders keep everyone on track."
        :features="calendarFeatures"
        screenshot="/assets/screenshots/calendar.png"
        image-position="left"
      />
    </section>

    <!-- Client Management Feature -->
    <FeatureSection
      title="Client Management"
      description="Build stronger relationships with comprehensive client profiles. Track progress, manage session packages, and maintain detailed notes. Keep all your client information organized and accessible from anywhere."
      :features="clientFeatures"
      screenshot="/assets/screenshots/clients.png"
      image-position="right"
    />

    <!-- Settings Feature -->
    <section class="bg-gray-50">
      <FeatureSection
        title="Business Settings"
        description="Customize your coaching business to match your style. Define session types, set pricing, configure availability, and share your unique booking URL and QR code with clients for easy scheduling."
        :features="settingsFeatures"
        screenshot="/assets/screenshots/settings.png"
        image-position="left"
      />
    </section>

    <!-- Feature Grid -->
    <section id="features" class="py-16 md:py-24 bg-white">
      <div class="container mx-auto px-6">
        <div class="text-center mb-12">
          <h2 class="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Everything You Need in One Place
          </h2>
          <p class="text-xl text-gray-600 max-w-2xl mx-auto">
            Powerful features to help you manage and grow your pickleball coaching business
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          <!-- Feature 1 -->
          <div class="text-center">
            <div class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 class="text-lg font-bold text-gray-900 mb-2">Smart Scheduling</h3>
            <p class="text-gray-600">Automated booking and calendar sync</p>
          </div>

          <!-- Feature 2 -->
          <div class="text-center">
            <div class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 class="text-lg font-bold text-gray-900 mb-2">Client Database</h3>
            <p class="text-gray-600">Unlimited clients and profiles</p>
          </div>

          <!-- Feature 3 -->
          <div class="text-center">
            <div class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h3 class="text-lg font-bold text-gray-900 mb-2">SMS & Email Reminders</h3>
            <p class="text-gray-600">Automated notifications for clients</p>
          </div>

          <!-- Feature 4 -->
          <div class="text-center">
            <div class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 class="text-lg font-bold text-gray-900 mb-2">Revenue Tracking</h3>
            <p class="text-gray-600">Optional financial analytics</p>
          </div>

          <!-- Feature 5 -->
          <div class="text-center">
            <div class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 class="text-lg font-bold text-gray-900 mb-2">Mobile Apps</h3>
            <p class="text-gray-600">iOS and Android apps included</p>
          </div>

          <!-- Feature 6 -->
          <div class="text-center">
            <div class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <h3 class="text-lg font-bold text-gray-900 mb-2">Booking URL & QR Code</h3>
            <p class="text-gray-600">Dedicated link for easy client scheduling</p>
          </div>

          <!-- Feature 7 -->
          <div class="text-center">
            <div class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 class="text-lg font-bold text-gray-900 mb-2">Session Types</h3>
            <p class="text-gray-600">Private coaching and clinics</p>
          </div>

          <!-- Feature 8 -->
          <div class="text-center">
            <div class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3 class="text-lg font-bold text-gray-900 mb-2">Session Packages</h3>
            <p class="text-gray-600">Manage multi-session packages</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing Section -->
    <PricingSection />

    <!-- Bottom CTA Section -->
    <section class="py-16 md:py-24 bg-gradient-to-br from-primary-600 to-blue-600">
      <div class="container mx-auto px-6 text-center">
        <h2 class="text-3xl md:text-4xl font-bold text-white mb-6">
          Ready to Grow Your Coaching Business?
        </h2>
        <p class="text-xl text-primary-100 mb-10 max-w-2xl mx-auto">
          Join hundreds of pickleball coaches who trust ScheduleCoaches to manage their business.
          Start your free trial today—no credit card required.
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <RouterLink
            to="/checkout-success"
            class="inline-block bg-white hover:bg-gray-100 text-primary-600 font-bold px-8 py-4 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Start Free Trial
          </RouterLink>
          <RouterLink
            to="/faq"
            class="inline-block bg-transparent hover:bg-primary-700 text-white font-bold px-8 py-4 rounded-lg border-2 border-white transition-all duration-300"
          >
            View FAQ
          </RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
</style>
