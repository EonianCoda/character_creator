<script setup lang="ts">
import { computed, ref } from 'vue'

// Inputs
const props = defineProps<{
  categories: { name: string; category: string; sub_category: string }[]
  choices: { category_name: string; name: string; description: string }[]
  t: (key: string) => string
}>()

// Emits
const emit = defineEmits<{
  (e: 'add-choice', item: { category_name: string; name: string; description: string }): void
}>()

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
  for (const ch of props.choices) {
    // locate field by name across tree
    for (const cat of Object.keys(t)) {
      for (const sub of Object.keys(t[cat])) {
        if (t[cat][sub][ch.category_name]) {
          t[cat][sub][ch.category_name].choices.push({ name: ch.name, description: ch.description })
        }
      }
    }
  }
  return t
})

// Selection state for left panel
const selected = ref<{ cat: string; sub: string; field: string; choice?: string } | null>(null)

// Form state for right panel
const form = ref<{ category_name: string; name: string; description: string }>({
  category_name: '',
  name: '',
  description: '',
})

function selectField(cat: string, sub: string, field: string) {
  selected.value = { cat, sub, field }
  form.value = { category_name: field, name: '', description: '' }
}

function selectChoice(
  cat: string,
  sub: string,
  field: string,
  choice: string,
  description: string,
) {
  selected.value = { cat, sub, field, choice }
  form.value = { category_name: field, name: choice, description }
}

function addOrUpdate() {
  if (!form.value.category_name || !form.value.name) return
  emit('add-choice', { ...form.value })
}
</script>

<template>
  <div class="row g-3">
    <!-- Left: tree list -->
    <div class="col-12 col-lg-5">
      <div class="list-group border" style="max-height: 60vh; overflow: auto">
        <div v-for="(subs, cat) in tree" :key="cat" class="list-group-item p-0">
          <div class="px-3 py-2 fw-semibold bg-body-secondary">{{ cat }}</div>
          <div v-for="(fields, sub) in subs" :key="sub" class="border-top">
            <div class="px-3 py-2 text-muted small">{{ sub }}</div>
            <div v-for="(fieldObj, fieldName) in fields" :key="fieldName" class="border-top">
              <button
                type="button"
                class="list-group-item list-group-item-action"
                @click="selectField(cat, sub, fieldName)"
              >
                {{ fieldName }}
              </button>
              <div class="ps-4">
                <button
                  v-for="c in fieldObj.choices"
                  :key="c.name"
                  type="button"
                  class="list-group-item list-group-item-action"
                  @click="selectChoice(cat, sub, fieldName, c.name, c.description)"
                >
                  - {{ c.name }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Right: form -->
    <div class="col-12 col-lg-7">
      <div class="card">
        <div class="card-header">{{ t('Edit Choice') }}</div>
        <div class="card-body">
          <div class="row g-3">
            <div class="col-12 col-md-6">
              <label class="form-label">{{ t('Field') }}</label>
              <input class="form-control" v-model="form.category_name" readonly />
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">{{ t('Name') }}</label>
              <input class="form-control" v-model="form.name" />
            </div>
            <div class="col-12">
              <label class="form-label">{{ t('Description') }}</label>
              <input class="form-control" v-model="form.description" />
            </div>
          </div>
          <div class="text-end mt-3">
            <button class="btn btn-primary" @click="addOrUpdate">{{ t('Save') }}</button>
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
