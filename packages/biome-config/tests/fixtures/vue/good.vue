<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
defineExpose({ count })
</script>

<template>
  <button @click="count++">{{ count }}</button>
</template>
