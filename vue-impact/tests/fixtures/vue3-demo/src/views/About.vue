<template>
  <div class="about-page">关于我们</div>
</template>

<script setup>
import { useAbout } from '@/composables/about'
const info = useAbout()
</script>
