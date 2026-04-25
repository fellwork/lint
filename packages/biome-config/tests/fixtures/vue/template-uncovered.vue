<script setup lang="ts">
import { ref } from 'vue'

const items = ref(['a', 'b', 'c'])
</script>

<template>
  <!--
    Documented gap (see extras/GAPS.md):
    Biome does NOT lint Vue templates. Both of the following are bugs that
    eslint-plugin-vue would have caught but this preset does not:
      1. Missing :key on v-for
      2. Direct mutation of a ref's value in template via .value
    The fixture asserts these go uncaught — if Biome ever adds template
    coverage, this fixture will start firing rules and we'll need to update
    the GAPS.md and possibly the preset.
  -->
  <ul>
    <li v-for="item in items">{{ item }}</li>
  </ul>
</template>
