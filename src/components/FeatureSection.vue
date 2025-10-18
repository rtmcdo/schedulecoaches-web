<script setup lang="ts">
interface Feature {
  text: string
}

interface Props {
  title: string
  description: string
  features: Feature[]
  screenshot: string
  imagePosition?: 'left' | 'right'
}

const props = withDefaults(defineProps<Props>(), {
  imagePosition: 'right'
})
</script>

<template>
  <section class="py-16 md:py-24">
    <div class="container mx-auto px-6">
      <div
        class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
        :class="imagePosition === 'left' ? 'lg:grid-flow-dense' : ''"
      >
        <!-- Text Content -->
        <div :class="imagePosition === 'left' ? 'lg:col-start-2' : ''">
          <h2 class="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            {{ title }}
          </h2>
          <p class="text-lg text-gray-600 mb-8">
            {{ description }}
          </p>

          <!-- Feature List -->
          <div class="space-y-4">
            <div
              v-for="(feature, index) in features"
              :key="index"
              class="flex items-start"
            >
              <svg class="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              <span class="text-gray-700 text-lg">{{ feature.text }}</span>
            </div>
          </div>
        </div>

        <!-- Screenshot -->
        <div
          :class="imagePosition === 'left' ? 'lg:col-start-1 lg:row-start-1' : ''"
          class="relative"
        >
          <div class="relative max-w-sm mx-auto">
            <!-- Phone Frame -->
            <div class="relative bg-gray-900 rounded-[3rem] p-4 shadow-2xl">
              <img
                :src="screenshot"
                :alt="title"
                class="w-full rounded-[2.5rem]"
              />
            </div>
            <!-- Decorative Elements -->
            <div class="absolute -z-10 -top-4 -right-4 w-72 h-72 bg-primary-100 rounded-full mix-blend-multiply filter blur-xl opacity-70"></div>
            <div class="absolute -z-10 -bottom-4 -left-4 w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-xl opacity-70"></div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
</style>
