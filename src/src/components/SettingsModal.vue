<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { Modal } from 'bootstrap'

// Copied from App.vue
interface CreatorSettings {
  showOriginalText: boolean
  hideCategoryDescriptions: boolean
}

interface LlmSettings {
  type: 'cloud' | 'local'
  apiUrl: string
  apiKey: string
}

interface AppSettings {
  creator: CreatorSettings
  llm: LlmSettings
}

const props = defineProps<{
  modelValue: AppSettings
  show: boolean
  t: (key: string) => string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: AppSettings): void
  (e: 'close'): void
}>()

const modalEl = ref<Element | null>(null)
const bsModal = ref<Modal | null>(null)

// Use a deep copy for local editing to avoid modifying the prop directly
const localSettings = ref<AppSettings>(JSON.parse(JSON.stringify(props.modelValue)))

watch(
  () => props.modelValue,
  (newVal) => {
    localSettings.value = JSON.parse(JSON.stringify(newVal))
  },
  { deep: true },
)

watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      bsModal.value?.show()
    } else {
      bsModal.value?.hide()
    }
  },
)

function save() {
  emit('update:modelValue', JSON.parse(JSON.stringify(localSettings.value)))
  emit('close')
}

function close() {
  emit('close')
}

onMounted(() => {
  if (modalEl.value) {
    bsModal.value = new Modal(modalEl.value)
    modalEl.value.addEventListener('hidden.bs.modal', () => {
      emit('close')
    })
  }
})
</script>

<template>
  <div
    class="modal fade"
    ref="modalEl"
    tabindex="-1"
    aria-labelledby="settingsModalLabel"
    aria-hidden="true"
  >
    <div class="modal-dialog modal-dialog-centered modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="settingsModalLabel">{{ t('Settings') }}</h5>
          <button type="button" class="btn-close" @click="close" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <ul class="nav nav-tabs" role="tablist">
            <li class="nav-item" role="presentation">
              <button
                class="nav-link active"
                id="creator-settings-tab"
                data-bs-toggle="tab"
                data-bs-target="#creator-settings"
                type="button"
                role="tab"
                aria-controls="creator-settings"
                aria-selected="true"
              >
                {{ t('Creator') }}
              </button>
            </li>
            <li class="nav-item" role="presentation">
              <button
                class="nav-link"
                id="llm-settings-tab"
                data-bs-toggle="tab"
                data-bs-target="#llm-settings"
                type="button"
                role="tab"
                aria-controls="llm-settings"
                aria-selected="false"
              >
                {{ t('LLM') }}
              </button>
            </li>
          </ul>
          <div class="tab-content pt-3">
            <!-- Creator Settings Tab -->
            <div
              class="tab-pane fade show active"
              id="creator-settings"
              role="tabpanel"
              aria-labelledby="creator-settings-tab"
            >
              <div class="form-check form-switch mb-2">
                <input
                  class="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="showOriginalTextSwitch"
                  v-model="localSettings.creator.showOriginalText"
                />
                <label class="form-check-label" for="showOriginalTextSwitch">
                  {{ t('Show original text in preview') }}
                </label>
              </div>
              <div class="form-check form-switch">
                <input
                  class="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="hideCategoryDescriptionsSwitch"
                  v-model="localSettings.creator.hideCategoryDescriptions"
                />
                <label class="form-check-label" for="hideCategoryDescriptionsSwitch">
                  {{ t('Hide category descriptions') }}
                </label>
              </div>
            </div>

            <!-- LLM Settings Tab -->
            <div
              class="tab-pane fade"
              id="llm-settings"
              role="tabpanel"
              aria-labelledby="llm-settings-tab"
            >
              <div class="mb-3">
                <label for="llmTypeSelect" class="form-label">{{ t('LLM Provider') }}</label>
                <select id="llmTypeSelect" class="form-select" v-model="localSettings.llm.type">
                  <option value="cloud">{{ t('Cloud API (Default)') }}</option>
                  <option value="local">{{ t('Local Ollama') }}</option>
                </select>
              </div>
              <div class="mb-3">
                <label for="apiUrlInput" class="form-label">{{ t('API URL') }}</label>
                <input
                  type="text"
                  class="form-control"
                  id="apiUrlInput"
                  v-model="localSettings.llm.apiUrl"
                  :placeholder="
                    localSettings.llm.type === 'local'
                      ? 'http://localhost:11434/api/generate'
                      : 'https://api.your-provider.com/v1/...'
                  "
                />
              </div>
              <div class="mb-3">
                <label for="apiKeyInput" class="form-label">{{ t('API Key') }}</label>
                <input
                  type="password"
                  class="form-control"
                  id="apiKeyInput"
                  v-model="localSettings.llm.apiKey"
                  :placeholder="t('Enter your API key')"
                />
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="close">{{ t('Close') }}</button>
          <button type="button" class="btn btn-primary" @click="save">
            {{ t('Save changes') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
