<script setup lang="ts">
const route = useRoute()
const title = computed(() => `Page: ${route.path}`)

defineExpose({ title })
</script>

<template>
  <h1>{{ title }}</h1>
</template>
