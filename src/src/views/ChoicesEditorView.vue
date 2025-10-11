<script setup lang="ts">
import { computed, ref, type Ref } from 'vue'
import type { AppSettings } from '@/types'

// Inputs
const props = defineProps<{
  categories: { name: string; category: string; sub_category: string }[]
  choices: { category_name: string; name: string; description: string }[]
  t: (key: string) => string
  appSettings: AppSettings
}>()

// Emits to parent (App.vue)
const emit = defineEmits<{
  (e: 'add-choice', item: { category_name: string; name: string; description: string }): void
  (e: 'delete-choice', item: { category_name: string; name: string }): void
  (e: 'save-i18n', payload: { name: string; translations: Record<string, string> }): void
}>()

// Search state for left tree
const search = ref('')

// Collapse state per category/sub
const collapseCat = ref<Record<string, boolean>>({})
const collapseSub = ref<Record<string, boolean>>({})
function toggleCat(cat: string) {
  collapseCat.value[cat] = !collapseCat.value[cat]
}
function toggleSub(cat: string, sub: string) {
  collapseSub.value[`${cat}__${sub}`] = !collapseSub.value[`${cat}__${sub}`]
}

// Build a tree structure: category -> sub_category -> [fields] -> choices
const tree = computed(() => {
  const t: Record<
    string,
    Record<
      string,
      Record<string, { name: string; choices: { name: string; description: string }[] }>
    >
  > = {}
  for (const c of props.categories) {
    const cat = c.category || 'general'
    const sub = c.sub_category || 'general'
    t[cat] ??= {}
    t[cat][sub] ??= {}
    t[cat][sub][c.name] ??= { name: c.name, choices: [] }
  }

  // Use a Set to track unique choices per field to avoid duplicates
  const choiceSets: Record<string, Set<string>> = {}
  for (const ch of props.choices) {
    if (!choiceSets[ch.category_name]) {
      choiceSets[ch.category_name] = new Set()
    }
    choiceSets[ch.category_name]?.add(ch.name)
  }

  for (const catKey of Object.keys(t)) {
    const subs = t[catKey]
    if (!subs) continue
    for (const subKey of Object.keys(subs)) {
      const fields = subs[subKey]
      if (!fields) continue
      for (const fieldName of Object.keys(fields)) {
        const fieldObj = fields[fieldName]
        if (fieldObj && choiceSets[fieldName]) {
          // Clear existing choices and rebuild from unique set
          fieldObj.choices = []
          for (const choiceName of choiceSets[fieldName]) {
            const choice = props.choices.find(
              (c) => c.category_name === fieldName && c.name === choiceName,
            )
            if (choice) {
              fieldObj.choices.push({ name: choice.name, description: choice.description })
            }
          }
        }
      }
    }
  }
  return t
})

// Auto-generate distinct colors for categories
const categoryColors = computed(() => {
  const colors = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark']
  const categoryKeys = Object.keys(tree.value)
  const colorMap: Record<string, string> = {}
  categoryKeys.forEach((cat, index) => {
    colorMap[cat] = colors[index % colors.length] || 'primary'
  })
  return colorMap
})

function matchesQuery(text: string): boolean {
  const q = search.value.trim().toLowerCase()
  if (!q) return true
  return text.toLowerCase().includes(q)
}

const selected = ref<{
  cat: string
  sub: string
  field: string
  choice?: { name: string; description: string }
} | null>(null)

const form = ref<{ category_name: string; name: string; description: string }>({
  category_name: '',
  name: '',
  description: '',
})
const i18nZhTw = ref('')
const i18nEn = ref('')

function selectField(cat: string, sub: string, field: string) {
  selected.value = { cat, sub, field }
  form.value = { category_name: field, name: '', description: '' }
  i18nZhTw.value = ''
  i18nEn.value = form.value.name || ''
}

function selectChoice(
  cat: string,
  sub: string,
  field: string,
  choice: { name: string; description: string },
) {
  selected.value = { cat, sub, field, choice }
  form.value = { category_name: field, name: choice.name, description: choice.description }
  i18nZhTw.value = ''
  i18nEn.value = form.value.name || ''
}

function addOrUpdate() {
  if (!form.value.category_name || !/^[A-Za-z0-9_\- ]+$/.test(form.value.name)) return
  emit('add-choice', { ...form.value })
}

function deleteChoice() {
  if (!form.value.category_name || !form.value.name) return
  emit('delete-choice', { category_name: form.value.category_name, name: form.value.name })
}

function saveTranslations() {
  if (!form.value.name) return
  const translations: Record<string, string> = {}
  if (i18nZhTw.value) translations['zh_tw'] = i18nZhTw.value
  translations['en'] = i18nEn.value || form.value.name
  emit('save-i18n', { name: form.value.name, translations })
}

function localizedChoiceLabel(name: string): string {
  const localized = props.t(name)
  if (localized && localized.toLowerCase() !== name.toLowerCase()) return `${name} (${localized})`
  return name
}
</script>

<template>
  <div class="row g-3">
    <div class="col-12 col-lg-5">
      <input class="form-control mb-2" v-model="search" :placeholder="t('Search')" />
      <div class="list-group border" style="max-height: 60vh; overflow: auto">
        <div v-for="(subs, cat) in tree" :key="cat" class="list-group-item p-0">
          <div
            class="d-flex align-items-center justify-content-between px-3 py-2 fw-semibold"
            :class="`bg-${categoryColors[cat]}-subtle border-${categoryColors[cat]}`"
          >
            <span>{{ t(cat) }}</span>
            <button class="btn btn-sm btn-outline-secondary" type="button" @click="toggleCat(cat)">
              <i
                class="bi"
                :class="collapseCat[cat] ? 'bi-caret-right-fill' : 'bi-caret-down-fill'"
              ></i>
            </button>
          </div>
          <div v-show="!collapseCat[cat]">
            <div v-for="(fields, sub) in subs" :key="sub" class="border-top">
              <div
                class="d-flex align-items-center justify-content-between px-3 py-2 text-muted small"
                :class="`bg-${categoryColors[cat]}-subtle`"
              >
                <span>{{ t(sub) }}</span>
                <button
                  class="btn btn-sm btn-outline-secondary"
                  type="button"
                  @click="toggleSub(cat, sub)"
                >
                  <i
                    class="bi"
                    :class="
                      collapseSub[`${cat}__${sub}`] ? 'bi-caret-right-fill' : 'bi-caret-down-fill'
                    "
                  ></i>
                </button>
              </div>
              <div v-show="!collapseSub[`${cat}__${sub}`]">
                <div v-for="(fieldObj, fieldName) in fields" :key="fieldName" class="border-top">
                  <button
                    v-if="matchesQuery(fieldName)"
                    type="button"
                    class="list-group-item list-group-item-action"
                    @click="selectField(cat, sub, fieldName)"
                  >
                    {{ t(fieldName) }}
                  </button>
                  <div class="ps-4">
                    <button
                      v-for="c in fieldObj.choices"
                      v-show="matchesQuery(c.name)"
                      :key="c.name"
                      type="button"
                      class="list-group-item list-group-item-action"
                      @click="selectChoice(cat, sub, fieldName, c)"
                    >
                      - {{ localizedChoiceLabel(c.name) }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="col-12 col-lg-7">
      <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center">
          <span>{{ t('Edit Choice') }}</span>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-primary" @click="addOrUpdate">
              {{ t('Save') }}
            </button>
            <button class="btn btn-sm btn-outline-danger" @click="deleteChoice">
              {{ t('Delete') }}
            </button>
          </div>
        </div>
        <div class="card-body">
          <div class="row g-3">
            <div class="col-12 col-md-6">
              <label class="form-label">{{ t('Field') }}</label>
              <input class="form-control" v-model="form.category_name" readonly />
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">{{ t('Name') }}</label>
              <input class="form-control" v-model="form.name" placeholder="^[A-Za-z0-9_\- ]+$" />
            </div>
            <div class="col-12">
              <label class="form-label">{{ t('Description') }}</label>
              <input class="form-control" v-model="form.description" />
            </div>
          </div>

          <hr />
          <div>
            <div class="d-flex align-items-center justify-content-between mb-2">
              <span class="fw-semibold">{{ t('Translations') }}</span>
              <button class="btn btn-sm btn-outline-secondary" @click="saveTranslations">
                {{ t('Save') }}
              </button>
            </div>
            <div class="row g-3">
              <div class="col-12 col-md-6">
                <label class="form-label">zh_tw</label>
                <input class="form-control" v-model="i18nZhTw" placeholder="繁體中文" />
              </div>
              <div class="col-12 col-md-6">
                <label class="form-label">en</label>
                <input class="form-control" v-model="i18nEn" placeholder="English" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
:root[data-bs-theme='dark'] .list-group-item {
  border-color: rgba(255, 255, 255, 0.2);
}
</style>
