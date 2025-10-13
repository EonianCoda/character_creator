<script setup lang="ts">
import { onMounted, ref, watch,reactive } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import SettingsModal from '@/components/SettingsModal.vue'
import ToastNotification from '@/components/ToastNotification.vue'
import type { CategoryItem, ChoiceItem, SelectedAttributes, AlertType } from '@/types'
import { type LanguageCode, languageOptions, defaultLanguage } from '@/config/language'
import type { AppSettings } from '@/types'
import { toCleanedKey } from '@/utils/common'

const currentLanguage = ref<LanguageCode>(defaultLanguage)
const i18nDict = ref<Record<string, string>>({})
const categoriesData = ref<CategoryItem[]>([])
const choices = ref<ChoiceItem[]>([])

const appSettings = ref<AppSettings>({
  creator: {
    showOriginalText: true,
    hideCategoryDescriptions: false,
  },
  llm: {
    type: 'cloud',
    apiUrl: '',
    apiKey: '',
  },
})

const isSettingsModalVisible = ref(false)

const toast = ref<{
  show: boolean
  message: string
  type: AlertType
}>({
  show: false,
  message: '',
  type: 'success',
})

function showToast(message: string, type: AlertType = 'success') {
  toast.value.message = t(message)
  toast.value.show = true
  toast.value.type = type
}

function t(key: string, langOverride?: LanguageCode): string {
  const lang = langOverride ?? currentLanguage.value
  const cleanedKey = toCleanedKey(key)
  if (i18nDict.value[cleanedKey]) return i18nDict.value[cleanedKey]
  return key
}

async function loadConfig() {
  const [i18nRes, i18nTags, categoriesRes, choicesRes] = await Promise.all([
    fetch(`/i18n/${currentLanguage.value}.json`),
    fetch(`/i18n/tags/${currentLanguage.value}.json`),
    fetch('/categories.json'),
    fetch('/choices.json'),
  ])

  const rawI18n = {
  ...(await i18nRes.json()),
  ...(await i18nTags.json()),
  }

  // 移除 key 中的底線與空格
  i18nDict.value = Object.entries(rawI18n).reduce((acc, [key, value]) => {
    const cleanedKey = toCleanedKey(key)
    acc[cleanedKey] = value
    return acc
  }, {} as Record<string, any>)

  categoriesData.value = await categoriesRes.json()
  choices.value = await choicesRes.json()
  // Add a unique key to each choice for easier identification
  choices.value = choices.value.map((choice) => ({ ...choice, key: toCleanedKey(`${choice.name}`) }))

  loadCustomChoices()
}

function loadCustomChoices() {
  try {
    const raw = localStorage.getItem('customChoices')
    if (raw) {
      const customChoices = JSON.parse(raw) as ChoiceItem[]
      const customChoiceNames = new Set(customChoices.map((c) => `${c.category_name}#${c.name}`))
      // Filter out default choices that have been customized
      const filteredDefaultChoices = choices.value.filter(
        (c) => !customChoiceNames.has(`${c.category_name}#${c.name}`),
      )
      choices.value = [...filteredDefaultChoices, ...customChoices]
    }
  } catch {}
}

function addChoice(item: ChoiceItem) {
  const existingIndex = choices.value.findIndex(
    (c) => c.category_name === item.category_name && c.name === item.name,
  )
  if (existingIndex !== -1) {
    choices.value.splice(existingIndex, 1, item)
  } else {
    choices.value.push(item)
  }
  updateCustomChoicesInStorage()
}

function deleteChoice(payload: { category_name: string; name: string }) {
  choices.value = choices.value.filter(
    (c) => !(c.category_name === payload.category_name && c.name === payload.name),
  )
  updateCustomChoicesInStorage()
}

function updateCustomChoicesInStorage() {
  const customChoices = choices.value.filter((c) => !c.description.startsWith('Default:')) // A bit of a guess, assuming we can identify non-default choices
  localStorage.setItem('customChoices', JSON.stringify(customChoices))
}

function saveI18n(payload: { name: string; translations: Record<string, string> }) {
  // This seems to be for downloading, which is a browser action.
  // This logic might need to be re-evaluated in a real backend scenario.
  console.log('Saving i18n for', payload)
}

function saveFavorite(name: string, data: SelectedAttributes) {
  if (!name) return
  const raw = localStorage.getItem('favorites')
  const list: { name: string; data: SelectedAttributes }[] = raw ? JSON.parse(raw) : []
  const dataClone = JSON.parse(JSON.stringify(data))
  const idx = list.findIndex((x) => x.name === name)
  if (idx >= 0) list[idx] = { name, data: dataClone }
  else list.push({ name, data: dataClone })
  localStorage.setItem('favorites', JSON.stringify(list))
  showToast(t('Favorite saved'))
}

function scrollToCategory(key: string) {
  const btn = document.querySelector(
    `button[data-bs-target=\"#tab_${key}\"]`,
  ) as HTMLButtonElement | null
  if (btn) btn.click()
  const pane = document.getElementById(`tab_${key}`)
  if (pane) pane.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function loadSettings() {
  try {
    const raw = localStorage.getItem('appSettings')
    if (raw) {
      const savedSettings = JSON.parse(raw)
      // Deep merge to avoid losing new settings keys on load
      if (savedSettings.creator) {
        appSettings.value.creator = { ...appSettings.value.creator, ...savedSettings.creator }
      }
      if (savedSettings.llm) {
        appSettings.value.llm = { ...appSettings.value.llm, ...savedSettings.llm }
      }
    }
  } catch {}
}

function saveSettings() {
  localStorage.setItem('appSettings', JSON.stringify(appSettings.value))
}

onMounted(() => {
  loadConfig()
  loadSettings()
})

watch(currentLanguage, async () => {
  await loadConfig()
})

watch(appSettings, saveSettings, { deep: true })

// Dark mode
const isDark = ref(true)
watch(
  isDark,
  (val) => {
    const theme = val ? 'dark' : 'light'
    document.documentElement.setAttribute('data-bs-theme', theme)
  },
  { immediate: true },
)
</script>

<template>
  <div class="container-fluid py-4">
    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div class="d-flex align-items-center gap-3">
        <h1 class="h3 mb-0">{{ t('Character Prompt Generator') }}</h1>
        <button class="btn btn-outline-secondary btn-sm" @click="isDark = !isDark">
          <i class="bi" :class="isDark ? 'bi-moon-stars' : 'bi-brightness-high'" />
        </button>
      </div>
      <div class="d-flex align-items-center gap-2">
        <a class="text-body-secondary" href="#" target="_blank" aria-label="GitHub">
          <i class="bi bi-github" style="font-size: 1.25rem"></i>
        </a>
        <label class="form-label mb-0">{{ t('Language') }}</label>
        <select v-model="currentLanguage" class="form-select form-select-sm" style="width: 160px">
          <option v-for="lang in languageOptions" :key="lang.value" :value="lang.value">
            {{ lang.label }}
          </option>
        </select>
        <button class="btn btn-outline-secondary btn-sm" @click="isSettingsModalVisible = true">
          <i class="bi bi-gear"></i>
        </button>
      </div>
    </div>

    <ul class="nav nav-tabs mb-3" role="tablist">
      <li class="nav-item">
        <RouterLink to="/" class="nav-link">{{ t('Character_create') }}</RouterLink>
      </li>
      <li class="nav-item">
        <RouterLink to="/choices-editor" class="nav-link">{{ t('Choices Editor') }}</RouterLink>
      </li>
    </ul>

    <div class="tab-content">
      <RouterView v-slot="{ Component }">
        <component
          :is="Component"
          :t="t"
          :categories="categoriesData"
          :choices="choices"
          :appSettings="appSettings"
          :show-toast="showToast"
          @add-choice="addChoice"
          @delete-choice="deleteChoice"
          @save-i18n="saveI18n"
          @save-favorite="saveFavorite"
          @scroll-to-category="scrollToCategory"
        />
      </RouterView>
    </div>

    <footer class="mt-4 pt-3 border-top text-center text-body-secondary small">
      <div>© 2025 Character Prompt Generator</div>
    </footer>

    <SettingsModal
      v-model="appSettings"
      :show="isSettingsModalVisible"
      :t="t"
      @close="isSettingsModalVisible = false"
    />
    <ToastNotification :show="toast.show" :message="toast.message" :type="toast.type" @close="toast.show = false" />
  </div>
</template>

<style scoped>
/* helper targets for scroll navigation */
[id^='tab_'] .tab-pane {
  scroll-margin-top: 80px;
}

.nav-tabs .nav-link {
  cursor: pointer;
}
</style>
