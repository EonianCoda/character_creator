<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { ChoiceItem } from '@/types'
import PromptDisplay from '@/components/PromptDisplay.vue' // Re-using for display
import type { LanguageCode } from '@/config/language'
import type { AppSettings, PreviewSubcategory } from '@/types'
import { toCleanedKey } from '@/utils/common'
const props = defineProps<{
  t: (key: string, langOverride?: LanguageCode) => string
  choices: ChoiceItem[]
  showToast: (message: string) => void
  appSettings: AppSettings
}>()

const promptInput = ref('')
const parsedData = ref<Record<string, string[]>>({})

const choiceMap = computed(() => {
  const map = new Map<string, string>()
  for (const choice of props.choices) {
    // Normalize and map both name and prompt value to the category
    map.set(toCleanedKey(choice.name), choice.category_name)
    if (choice.prompt) {
      map.set(toCleanedKey(choice.prompt), choice.category_name)
    }
  }
  return map
})

watch(promptInput, (newPrompt) => {
  const tags = newPrompt.split(',')
  const grouped: Record<string, string[]> = {}
  const otherCategory = 'other'

  for (const tag of tags) {
    const cleanedTag = toCleanedKey(tag)
    const category = choiceMap.value.get(cleanedTag)
    if (category) {
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push(tag)
    } else {
      if (!grouped[otherCategory]) {
        grouped[otherCategory] = []
      }
      grouped[otherCategory].push(tag)
    }
  }
  parsedData.value = grouped
})

const groupedPreview = computed(() => {
  const result: { key: string; label: string; subcategories: PreviewSubcategory[] }[] = []
  const otherItems: { label: string; value: string }[] = []

  for (const [categoryKey, tags] of Object.entries(parsedData.value)) {
    if (categoryKey === 'other') {
      otherItems.push(...tags.map(tag => ({ label: tag, value: '' })))
      continue
    }

    const subcategories: PreviewSubcategory[] = [{
      key: categoryKey,
      label: props.t(categoryKey),
      lines: tags.map(tag => ({ label: tag, value: '' }))
    }]

    result.push({
      key: categoryKey,
      label: props.t(categoryKey),
      subcategories
    })
  }

  if (otherItems.length > 0) {
    result.push({
      key: 'other',
      label: props.t('other'),
      subcategories: [{
        key: 'other',
        label: props.t('other'),
        lines: otherItems
      }]
    })
  }

  if (!result.length && !promptInput.value) {
     return [
      {
        key: 'empty',
        label: props.t('Parsed Prompt'),
        subcategories: [
          {
            key: 'empty',
            label: '',
            lines: [
              {
                label: props.t('Paste your prompt on the left to see the parsed result.'),
                value: '',
              },
            ],
          },
        ],
      },
    ]
  }

  return result
})

const jsonData = computed(() => {
  return JSON.stringify(parsedData.value, null, 2)
})

const finalPrompt = computed(() => {
    return promptInput.value
})

</script>

<template>
  <div class="row g-3">
    <div class="col-12 col-lg-7">
      <div class="form-floating">
        <textarea
          class="form-control"
          placeholder="Paste your prompt here"
          id="prompt-input-textarea"
          style="height: 400px"
          v-model="promptInput"
        ></textarea>
        <label for="prompt-input-textarea">{{ t('Prompt Input') }}</label>
      </div>
    </div>
    <div class="col-12 col-lg-5">
       <PromptDisplay
            :grouped-preview="groupedPreview"
            :show-toast="showToast"
            :json-data="jsonData"
            :final-prompt="finalPrompt"
            :t="t"
            :is-parser-view="true"
        />
    </div>
  </div>
</template>
