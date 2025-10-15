<script setup lang="ts">
import { ref, computed, toRefs, type Ref } from 'vue'
import CharacterForm from '@/components/CharacterForm.vue'
import PromptDisplay from '@/components/PromptDisplay.vue'
import PromptParser from '@/components/PromptParser.vue'
import type { CategoryItem, ChoiceItem, SelectedAttributes } from '@/types'
import type { LanguageCode } from '@/config/language'
import type { AppSettings, PreviewSubcategory } from '@/types'

const props = defineProps<{
  t: (key: string, langOverride?: LanguageCode) => string
  categories: CategoryItem[]
  choices: ChoiceItem[]
  showToast: (message: string) => void
  appSettings: AppSettings
}>()

// const { creator, llm } = toRefs(props.appSettings)
const emit = defineEmits<{
  (e: 'randomize-field', fieldName: string): void
  (e: 'save-favorite', name: string, data: SelectedAttributes): void
  (e: 'import-json', jsonText: string): void
  (e: 'scroll-to-category', key: string): void
}>()

const selectedAttributes = ref<SelectedAttributes>({})

// Favorites cache
const favorites = ref<{ name: string; data: SelectedAttributes }[]>([])
const favoritesSearch = ref('')
const filteredFavorites = computed(() => {
  const q = favoritesSearch.value.trim().toLowerCase()
  if (!q) return favorites.value
  return favorites.value.filter((f) => f.name.toLowerCase().includes(q))
})

function loadFavorites() {
  const raw = localStorage.getItem('favorites')
  favorites.value = raw ? JSON.parse(raw) : []
}

function applyFavorite(fav: { name: string; data: SelectedAttributes }) {
  selectedAttributes.value = JSON.parse(JSON.stringify(fav.data))
}

// Helper maps for ordering
const categoryOrder = ['character_traits', 'appearance', 'attire', 'action_viewpoint'] as const
const fieldOrderByCategory = computed<Record<string, string[]>>(() => {
  const map: Record<string, string[]> = {}
  for (const c of categoryOrder) map[c] = []
  for (const item of props.categories) {
    const c = item.parent_category_id
    map[c] ??= []
    map[c].push(item.id)
  }
  return map
})

// Map of field name -> category for grouping preview
const fieldToCategory = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {}
  for (const item of props.categories) {
    map[item.id] = item.parent_category_id
  }
  return map
})

const groupedPreview = computed(() => {
  type LineItem = { field: string; label: string; value: string; subcategory: string }
  const grouped: Record<string, Record<string, LineItem[]>> = (
    categoryOrder as readonly string[]
  ).reduce(
    (acc, c) => {
      acc[c] = {}
      return acc
    },
    {} as Record<string, Record<string, LineItem[]>>,
  )

  for (const [field, value] of Object.entries(selectedAttributes.value)) {
    if (!value || !value.trim()) continue
    const c = fieldToCategory.value[field] || 'other'
    const subcategory = field
    grouped[c] ??= {}
    grouped[c][subcategory] ??= []

    const translatedLabel = props.t(field)
    const label =
      props.appSettings.creator.showOriginalText && translatedLabel !== field
        ? `${translatedLabel} (${field})`
        : translatedLabel

    const trimmedValue = value.trim()
    const translatedValue = props.t(trimmedValue)
    const valueText =
      props.appSettings.creator.showOriginalText && translatedValue !== trimmedValue && translatedValue !== ''
        ? `${translatedValue} (${trimmedValue})`
        : translatedValue

    grouped[c][subcategory].push({ field, label, value: valueText, subcategory })
  }

  const result: { key: string; label: string; subcategories: PreviewSubcategory[] }[] = []

  for (const c of categoryOrder as readonly string[]) {
    const categoryData = grouped[c]
    if (!categoryData) continue

    const subcategories: PreviewSubcategory[] = []
    for (const [subKey, items] of Object.entries(categoryData)) {
      if (!items || !items.length) continue
      const fields = fieldOrderByCategory.value[c] || []
      const sortedItems = items
        .slice()
        .sort((a, b) => fields.indexOf(a.field) - fields.indexOf(b.field))
      const lines = sortedItems.map((it) => ({ label: it.label, value: it.value }))
      subcategories.push({ key: subKey, label: props.t(subKey), lines })
    }

    if (subcategories.length) {
      result.push({ key: c, label: props.t(c), subcategories })
    }
  }

  // any other leftover categories
  for (const [key, categoryData] of Object.entries(grouped)) {
    if (!(categoryOrder as readonly string[]).includes(key) && categoryData) {
      const subcategories: PreviewSubcategory[] = []
      for (const [subKey, items] of Object.entries(categoryData)) {
        if (items && items.length) {
          subcategories.push({
            key: subKey,
            label: props.t(subKey),
            lines: items.map((it) => ({ label: it.label, value: it.value })),
          })
        }
      }
      if (subcategories.length) {
        result.push({ key, label: props.t(key), subcategories })
      }
    }
  }

  if (!result.length)
    return [
      {
        key: 'empty',
        label: props.t('Prompt Preview'),
        subcategories: [
          {
            key: 'empty',
            label: '',
            lines: [
              {
                label: props.t('No attributes selected yet. Select options on the left.', 'en'),
                value: '',
              },
            ],
          },
        ],
      },
    ]
  return result
})

const jsonData = computed(() => {
  const filtered: Record<string, string> = {}
  for (const [k, v] of Object.entries(selectedAttributes.value)) {
    if (v && v.trim()) filtered[k] = v.trim()
  }
  return JSON.stringify(filtered, null, 2)
})

// Final prompt reactive and ordered by category and field order
const finalPrompt = computed(() => {
  const parts: string[] = []

  // A map for quick lookup: key is 'category_name#choice_name', value is the prompt
  const promptMap = new Map<string, string>()
  for (const choice of props.choices) {
    if (choice.prompt) {
      promptMap.set(`${choice.subcategory_id}#${choice.id}`, choice.prompt)
    }
  }

  const processField = (field: string, selectedValue: string) => {
    if (selectedValue && selectedValue.trim()) {
      const mapKey = `${field}#${selectedValue.trim()}`
      const prompt = promptMap.get(mapKey)
      parts.push(prompt || selectedValue.trim())
    }
  }

  // Process ordered fields
  for (const c of categoryOrder as readonly string[]) {
    const fields = fieldOrderByCategory.value[c] || []
    for (const field of fields) {
      const v = selectedAttributes.value[field]
      if (v) processField(field, v)
    }
  }

  // Process any other fields
  for (const [field, v] of Object.entries(selectedAttributes.value)) {
    if (!fieldToCategory.value[field]) {
      if (v) processField(field, v)
    }
  }

  return parts.length
    ? parts.join(', ')
    : props.t("Click 'Generate Prompt' to see the final output.", 'en')
})

function onRandomizeField(fieldName: string) {
  emit('randomize-field', fieldName)
}

function handleSaveFavorite(name: string) {
  emit('save-favorite', name, selectedAttributes.value)
}

function handleImportJson(jsonText: string) {
  try {
    const obj = JSON.parse(jsonText)
    if (obj && typeof obj === 'object') {
      selectedAttributes.value = obj as SelectedAttributes
    }
  } catch (e) {
    console.error('Invalid JSON for import', e)
  }
}

function clearAll() {
  selectedAttributes.value = {}
}

function randomAll() {
  const next: SelectedAttributes = {}
  for (const item of props.categories) {
    const opts = props.choices.filter((c) => c.subcategory_id === item.id).map((c) => c.id)
    if (opts.length > 0) {
      next[item.id] = opts[Math.floor(Math.random() * opts.length)] ?? ''
    }
  }
  selectedAttributes.value = next
}

function onRandomize(fieldName: string) {
  const opts = props.choices.filter((c) => c.subcategory_id === fieldName).map((c) => c.id)
  if (opts.length > 0) {
    const val = opts[Math.floor(Math.random() * opts.length)] ?? ''
    selectedAttributes.value = { ...selectedAttributes.value, [fieldName]: val }
  }
}

defineExpose({
  randomizeField: onRandomize,
})

loadFavorites()
</script>

<template>
  <div>
    <ul class="nav nav-pills mb-3" role="tablist">
      <li class="nav-item">
        <button
          class="nav-link active"
          data-bs-toggle="tab"
          data-bs-target="#subtab_form"
          type="button"
          role="tab"
        >
          Form
        </button>
      </li>
      <li class="nav-item">
        <button
          class="nav-link"
          data-bs-toggle="tab"
          data-bs-target="#subtab_favorites"
          type="button"
          role="tab"
        >
          Favorites
        </button>
      </li>
      <li class="nav-item">
        <button
          class="nav-link"
          data-bs-toggle="tab"
          data-bs-target="#subtab_parser"
          type="button"
          role="tab"
        >
          {{ t('Prompt Parser') }}
        </button>
      </li>
    </ul>
    <div class="d-flex gap-2 mb-3">
      <button class="btn btn-outline-secondary btn-sm" @click="clearAll">
        <i class="bi bi-x-circle"></i> Clear
      </button>
      <button class="btn btn-outline-primary btn-sm" @click="randomAll">
        <i class="bi bi-shuffle"></i> Random All
      </button>
    </div>
    <div class="tab-content">
      <div id="subtab_form" class="tab-pane fade show active" role="tabpanel">
        <div class="row g-3">
          <div class="col-12 col-lg-7">
            <CharacterForm
              :categories="categories"
              :choices="choices"
              v-model="selectedAttributes"
              :hideCategoryDescriptions="appSettings.creator.hideCategoryDescriptions"
              :t="t"
              @randomize="onRandomize"
            />
          </div>
          <div class="col-12 col-lg-5">
            <PromptDisplay
              :grouped-preview="groupedPreview"
              :show-toast="showToast"
              :json-data="jsonData"
              :final-prompt="finalPrompt"
              :t="t"
              @generate="() => {}"
              @navigate="(key: string) => emit('scroll-to-category', key)"
              @save-favorite="handleSaveFavorite"
              @import-json="handleImportJson"
            />
          </div>
        </div>
      </div>
      <div id="subtab_favorites" class="tab-pane fade" role="tabpanel">
        <div class="mb-3">
          <input class="form-control" v-model="favoritesSearch" placeholder="Search favorites" />
        </div>
        <div class="row g-3">
          <div v-for="fav in filteredFavorites" :key="fav.name" class="col-12 col-md-6">
            <div class="card h-100">
              <div class="card-header d-flex justify-content-between align-items-center">
                <span class="fw-semibold">{{ fav.name }}</span>
                <button class="btn btn-sm btn-outline-primary" @click="applyFavorite(fav)">
                  Apply
                </button>
              </div>
              <div class="card-body">
                <pre class="mb-0" style="white-space: pre-wrap">{{
                  JSON.stringify(fav.data, null, 2)
                }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div id="subtab_parser" class="tab-pane fade" role="tabpanel">
        <PromptParser
          :choices="choices"
          :t="t"
          :show-toast="showToast"
          :app-settings="appSettings"
        />
      </div>
    </div>
  </div>
</template>