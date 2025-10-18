<script setup lang="ts">
import HeaderNav from './components/HeaderNav.vue'
import FooterNav from './components/FooterNav.vue'
import AuthModal from './components/auth/AuthModal.vue'
</script>

<template>
  <div id="app" class="flex flex-col min-h-screen">
    <HeaderNav />
    <main class="flex-grow pt-16 md:pt-20">
      <RouterView />
    </main>
    <FooterNav />

    <!-- Auth Modal (globally available) -->
    <AuthModal />
  </div>
</template>

<style scoped>
</style>
