<script setup lang="ts">
import HeaderNav from './components/HeaderNav.vue'
import FooterNav from './components/FooterNav.vue'
</script>

<template>
  <div id="app" class="flex flex-col min-h-screen">
    <HeaderNav />
    <main class="flex-grow pt-16 md:pt-20">
      <RouterView />
    </main>
    <FooterNav />
  </div>
</template>

<style scoped>
</style>
