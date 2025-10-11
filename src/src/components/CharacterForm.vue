<script setup lang="ts">
import { computed } from 'vue'
import SelectInput from './SelectInput.vue'
import type { CategoryItem, ChoiceItem, SelectedAttributes } from '@/types'
import type { LanguageCode } from '@/config/language'

const props = defineProps<{
  categories: CategoryItem[]
  choices: ChoiceItem[]
  modelValue: SelectedAttributes
  t: (key: string, langOverride?: LanguageCode) => string
  hideCategoryDescriptions: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: SelectedAttributes): void
  (e: 'randomize', fieldName: string): void
}>()

// A simple color palette for cards. Ensure good contrast with text.
const bgColors = [
  'rgba(var(--bs-primary-rgb), 0.1)',
  'rgba(var(--bs-success-rgb), 0.1)',
  'rgba(var(--bs-info-rgb), 0.1)',
  'rgba(var(--bs-warning-rgb), 0.05)',
  'rgba(var(--bs-danger-rgb), 0.05)',
  'rgba(var(--bs-secondary-rgb), 0.1)',
]

function getColorForString(str: string): string {
  if (str === 'general') return '' // Don't color the general category
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash % bgColors.length)
  return bgColors[index] as string
}

// Group categories -> subcategories -> items
const grouped = computed(() => {
  const map: Record<string, Record<string, CategoryItem[]>> = {}
  for (const item of props.categories) {
    const main = item.category
    const sub = item.sub_category && item.sub_category.length ? item.sub_category : 'general'
    map[main] ??= {}
    map[main][sub] ??= []
    map[main][sub].push(item)
  }
  return map
})

function updateField(name: string, value: string) {
  emit('update:modelValue', { ...props.modelValue, [name]: value })
  // Persist a newly created custom choice for this field
  if (value && !getChoices(name).includes(value)) {
    try {
      const raw = localStorage.getItem('customChoices')
      const arr: ChoiceItem[] = raw ? JSON.parse(raw) : []
      arr.push({ category_name: name, name: value, description: '' })
      localStorage.setItem('customChoices', JSON.stringify(arr))
    } catch {}
  }
}

// Build choices for a field from props.choices
function getChoices(name: string): string[] {
  const arr = props.choices.filter((c) => c.category_name === name).map((c) => c.name)
  return [''].concat(arr)
}

// Humanize text for display if not localized
function prettyLabel(text: string): string {
  const token = text.replace(/_/g, ' ').replace(/\s+/g, ' ').trim()
  return token.replace(/\b\w/g, (m) => m.toUpperCase())
}

// Combined label: original plus localized translation in parentheses if different
function optionLabel(value: string): string {
  if (!value) return ''
  const localized = props.t(value)
  if (!localized || localized.toLowerCase() === value.toLowerCase()) return prettyLabel(value)
  return `${prettyLabel(value)} (${localized})`
}

function selectOptionsFor(name: string): { value: string; label: string }[] {
  return getChoices(name).map((v) => ({ value: v, label: optionLabel(v) }))
}
</script>

<template>
  <div>
    <!-- Tabs for main categories -->
    <ul class="nav nav-tabs nav-fill mb-3" role="tablist">
      <li class="nav-item" v-for="(subs, main) in grouped" :key="main">
        <button
          class="nav-link"
          :class="{ active: Object.keys(grouped)[0] === main }"
          data-bs-toggle="tab"
          :data-bs-target="`#tab_${main}`"
          type="button"
          role="tab"
        >
          {{ props.t(main) }}
        </button>
      </li>
    </ul>

    <!-- Per-category panes -->
    <div class="tab-content">
      <div
        class="tab-pane fade"
        :class="{
          show: Object.keys(grouped)[0] === main,
          active: Object.keys(grouped)[0] === main,
        }"
        v-for="(subs, main) in grouped"
        :key="`pane_${main}`"
        :id="`tab_${main}`"
        role="tabpanel"
      >
        <div v-for="(items, sub) in subs" :key="`${main}_${sub}`" class="mb-3">
          <div class="card border">
            <div
              class="card-header d-flex justify-content-between align-items-center"
              :style="{ backgroundColor: getColorForString(sub) }"
            >
              <span class="text-uppercase" style="letter-spacing: 0.04em">{{
                props.t(sub !== 'general' ? sub : main)
              }}</span>
              <button
                class="btn btn-sm btn-outline-secondary"
                type="button"
                data-bs-toggle="collapse"
                :data-bs-target="`#collapse_${main}_${sub}`"
                aria-label="Toggle"
              >
                <i class="bi bi-caret-down-fill"></i>
              </button>
            </div>
            <div class="collapse show" :id="`collapse_${main}_${sub}`">
              <div class="card-body">
                <div class="row g-3">
                  <div v-for="item in items" :key="item.name" class="col-12 col-md-6">
                    <div class="d-flex justify-content-between align-items-center">
                      <label class="form-label fw-semibold mb-1">{{ props.t(item.name) }}</label>
                      <button
                        class="btn btn-sm btn-outline-secondary"
                        type="button"
                        @click="emit('randomize', item.name)"
                        aria-label="Randomize"
                      >
                        <i class="bi bi-shuffle"></i>
                      </button>
                    </div>
                    <div class="description-wrapper mb-1">
                      <small
                        v-if="item.description && !hideCategoryDescriptions"
                        class="text-muted d-block description-truncate"
                        >{{ item.description }}</small
                      >
                    </div>
                    <SelectInput
                      :model-value="modelValue[item.name] || ''"
                      :options="selectOptionsFor(item.name)"
                      :placeholder="props.t(item.name)"
                      @update:modelValue="(v: string) => updateField(item.name, v)"
                      :is-filled="!!modelValue[item.name]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.description-wrapper {
  height: 1.4em;
}

.description-truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Improve contrast in dark mode */
:root[data-bs-theme='dark'] .form-control,
:root[data-bs-theme='dark'] .card,
:root[data-bs-theme='dark'] .card-header {
  border-color: rgba(255, 255, 255, 0.25);
}
</style>
