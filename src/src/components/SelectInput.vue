<script setup lang="ts">
// SelectInput: wrapper around @vueform/multiselect for single-select with search and create option
import { computed } from 'vue'
import Multiselect from '@vueform/multiselect'

const props = defineProps<{
  modelValue: string
  options: { value: string; label: string }[]
  placeholder?: string
  isFilled: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

// Bridge v-model to parent using a computed getter/setter
const model = computed<string>({
  get: () => props.modelValue || '',
  set: (val) => emit('update:modelValue', val ?? ''),
})
</script>

<template>
  <Multiselect
    v-model="model"
    :options="props.options"
    :placeholder="props.placeholder || ''"
    :searchable="true"
    mode="single"
    :close-on-select="true"
    :create-option="true"
    :allow-absent="true"
    :class="{ 'is-filled': props.isFilled }"
  />
</template>

<style src="@vueform/multiselect/themes/default.css"></style>

<style scoped>
.multiselect.is-filled {
  --ms-border-color: var(--bs-success);
}

:root[data-bs-theme='dark'] .multiselect {
  --ms-bg: var(--bs-body-bg);
  --ms-border-color: rgba(255, 255, 255, 0.25);
  --ms-option-bg-selected: var(--bs-primary-bg-subtle);
  --ms-option-color: var(--bs-body-color);
  --ms-dropdown-bg: var(--bs-body-bg);
  --ms-dropdown-border-color: rgba(255, 255, 255, 0.25);
}

:root[data-bs-theme='dark'] .multiselect.is-filled {
  --ms-border-color: var(--bs-success);
}
</style>
