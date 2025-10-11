<script setup lang="ts">
import { ref } from 'vue'
import { generateImageFromPrompt, LlmType } from '@/services/llm_service'
import type { PreviewSubcategory } from '@/types'

const props = defineProps<{
  groupedPreview: {
    key: string
    label: string
    subcategories: PreviewSubcategory[]
  }[]
  jsonData: string
  finalPrompt: string
  t: (key: string, langOverride?: 'zh_tw' | 'en') => string
  showToast: (message: string) => void
}>()

const emit = defineEmits<{
  (e: 'navigate', key: string): void
  (e: 'save-favorite', name: string): void
  (e: 'import-json', text: string): void
}>()

const favoriteName = ref('')
const importText = ref('')

const isGenerating = ref(false)
const generationStatus = ref('')

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    props.showToast(props.t('Copied to clipboard'))
  } catch (err) {
    console.error('Failed to copy text: ', err)
    props.showToast(props.t('Copy failed'))
  }
}

async function handleGenerate() {
  isGenerating.value = true
  generationStatus.value = 'Connecting to LLM...'
  try {
    const result = await generateImageFromPrompt(props.finalPrompt, 'cloud')
    generationStatus.value = result.message
    props.showToast(result.message)
  } catch (error: any) {
    generationStatus.value = `Error: ${error.message}`
    props.showToast(`Error: ${error.message}`)
  } finally {
    isGenerating.value = false
    setTimeout(() => (generationStatus.value = ''), 5000) // Clear status after 5s
  }
}
</script>

<template>
  <div>
    <div class="mb-3" id="previewCards">
      <div v-for="group in groupedPreview" :key="group.key" class="card mb-3">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h6 class="mb-0">{{ group.label }}</h6>
          <button
            v-if="group.key !== 'empty'"
            class="btn btn-sm btn-outline-primary"
            @click="emit('navigate', group.key)"
          >
            {{ t('Go') }}
          </button>
        </div>
        <div class="card-body">
          <div v-for="subcategory in group.subcategories" :key="subcategory.key" class="mb-3">
            <h6 v-if="subcategory.label" class="text-muted small mb-2">{{ subcategory.label }}</h6>
            <table
              class="table table-sm table-borderless mb-0"
              v-if="subcategory.lines.length > 0 && subcategory.lines[0].value"
            >
              <tbody>
                <tr v-for="line in subcategory.lines" :key="line.label">
                  <td class="w-50">{{ line.label }}</td>
                  <td>{{ line.value }}</td>
                </tr>
              </tbody>
            </table>
            <p v-else class="mb-0">{{ subcategory.lines[0]?.label || '' }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="accordion mb-3" id="jsonAccordion">
      <div class="accordion-item border">
        <h2 class="accordion-header d-flex align-items-center">
          <button
            class="accordion-button collapsed"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#collapseJson"
          >
            {{ t('Generated Prompt Data (JSON)') }}
          </button>
          <button
            class="btn btn-sm btn-outline-secondary ms-auto me-2"
            @click="copyToClipboard(jsonData)"
          >
            <i class="bi bi-clipboard"></i>
          </button>
        </h2>
        <div id="collapseJson" class="accordion-collapse collapse">
          <div class="accordion-body">
            <textarea class="form-control mb-2" rows="10" readonly :value="jsonData"></textarea>
            <div class="row g-2 align-items-end">
              <div class="col-12 col-md-6">
                <label class="form-label">{{ t('Save as Favorite') }}</label>
                <input class="form-control" v-model="favoriteName" placeholder="My preset" />
              </div>
              <div class="col-12 col-md-6 text-end">
                <button
                  class="btn btn-outline-primary"
                  @click="emit('save-favorite', favoriteName)"
                >
                  {{ t('Save') }}
                </button>
              </div>
            </div>
            <div class="mt-3">
              <label class="form-label">{{ t('Import JSON') }}</label>
              <textarea
                class="form-control mb-2"
                rows="4"
                v-model="importText"
                placeholder='{
  "gender": "female"
}'
              ></textarea>
              <button class="btn btn-outline-secondary" @click="emit('import-json', importText)">
                {{ t('Apply') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="accordion mb-3" id="finalAccordion">
      <div class="accordion-item border">
        <h2 class="accordion-header d-flex align-items-center">
          <button
            class="accordion-button"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#collapseFinal"
          >
            {{ t('Final Prompt for LLM/SD') }}
          </button>
          <button
            class="btn btn-sm btn-outline-secondary ms-auto me-2"
            @click="copyToClipboard(finalPrompt)"
          >
            <i class="bi bi-clipboard"></i>
          </button>
        </h2>
        <div id="collapseFinal" class="accordion-collapse collapse show">
          <div class="accordion-body">
            <textarea class="form-control" rows="10" readonly :value="finalPrompt"></textarea>
            <div class="mt-3">
              <button
                class="btn btn-primary w-100"
                @click="handleGenerate"
                :disabled="isGenerating"
              >
                <span
                  v-if="isGenerating"
                  class="spinner-border spinner-border-sm"
                  role="status"
                  aria-hidden="true"
                ></span>
                {{ isGenerating ? t('Generating...') : t('Generate Image with LLM') }}
              </button>
              <div v-if="generationStatus" class="form-text text-center mt-2">
                {{ generationStatus }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.accordion-header .accordion-button {
  width: calc(100% - 50px); /* Adjust width to make space for the button */
}

:root[data-bs-theme='dark'] .accordion-item {
  border-color: rgba(255, 255, 255, 0.25) !important;
}
</style>
