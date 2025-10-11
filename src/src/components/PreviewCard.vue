<script setup lang="ts">
// PreviewCard: shows one preview category section with lines and a navigate button
const props = defineProps<{
  title: string
  lines: string[]
  categoryKey: string
}>()

const emit = defineEmits<{
  (e: 'navigate', categoryKey: string): void
}>()
</script>

<template>
  <div class="card mb-3 border">
    <div class="card-header fw-semibold bg-primary-subtle text-primary">{{ title }}</div>
    <div class="card-body">
      <ul class="mb-0">
        <li v-for="line in lines" :key="line">{{ line }}</li>
      </ul>
      <div class="text-end mt-2">
        <button class="btn btn-sm btn-outline-primary" @click="emit('navigate', categoryKey)">
          Go
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Improve border visibility in dark mode */
:root[data-bs-theme='dark'] .card {
  border-color: rgba(255, 255, 255, 0.25) !important;
}
</style>
