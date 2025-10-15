<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { ChoiceItem, ParsedTag, PreviewSubcategory, PreviewLine } from '@/types'
import PromptDisplay from '@/components/PromptDisplay.vue'
import DraggableTags from '@/components/DraggableTags.vue' // Import the new component
import type { LanguageCode } from '@/config/language'
import type { AppSettings } from '@/types'
import { toCleanedKey } from '@/utils/common'

const props = defineProps<{
  t: (key: string, langOverride?: LanguageCode) => string
  choices: ChoiceItem[]
  showToast: (message: string) => void
  appSettings: AppSettings
}>()

// --- Refs --- //
const promptInput = ref('')
const tokens = ref<ParsedTag[]>([]) // For the draggable tags display
const parsedData = ref<Record<string, ParsedTag[]>>({}) // For the categorized display at the bottom

// A flag to prevent infinite loops between watchers
let isUpdatingInternally = false

// --- Computed Properties --- //

// A map for quick lookup of tag categories
const choiceMap = computed(() => {
  const map = new Map<string, string>()
  for (const choice of props.choices) {
    map.set(toCleanedKey(choice.id), choice.subcategory_id)
    if (choice.prompt) {
      map.set(toCleanedKey(choice.prompt), choice.subcategory_id)
    }
  }
  return map
})

// The categorized data for the bottom display
const groupedPreview = computed(() => {
  const result: { key: string; label: string; subcategories: PreviewSubcategory[] }[] = []
  const otherItems: PreviewLine[] = []

  for (const [categoryKey, tags] of Object.entries(parsedData.value)) {
    const lines: PreviewLine[] = tags.map((tag) => ({
      label: tag.text,
      value: tag.weight ? `${tag.weight}` : '',
      ...tag
    }))

    if (categoryKey === 'other') {
      otherItems.push(...lines)
      continue
    }

    result.push({
      key: categoryKey,
      label: props.t(categoryKey),
      subcategories: [{ key: categoryKey, label: props.t(categoryKey), lines }]
    })
  }

  if (otherItems.length > 0) {
    result.push({
      key: 'other',
      label: props.t('other'),
      subcategories: [{ key: 'other', label: props.t('other'), lines: otherItems }]
    })
  }

  if (!result.length && !promptInput.value) {
    return [
      {
        key: 'empty',
        label: props.t('Categorized Prompt'),
        subcategories: [
          {
            key: 'empty',
            label: '',
            lines: [{ label: props.t('Results will be displayed here.'), value: '' }]
          }
        ]
      }
    ]
  }

  return result
})

// JSON representation of the categorized data
const jsonData = computed(() => {
  return JSON.stringify(parsedData.value, null, 2)
})

// The final prompt is just the input text
const finalPrompt = computed(() => {
  return promptInput.value
})

// --- Watchers for Syncing --- //

/**
 * Watch for changes in the raw prompt input from the textarea.
 * When it changes, parse it into tokens for the draggable display
 * and update the categorized view at the bottom.
 */
watch(promptInput, (newPrompt) => {
  if (isUpdatingInternally) {
    return
  }

  const parsedTokens = parsePrompt(newPrompt)
  tokens.value = parsedTokens

  // --- Update categorized data (for bottom view) ---
  const grouped: Record<string, ParsedTag[]> = {}
  const otherCategory = 'other'
  for (const tag of parsedTokens) {
    const cleanedTag = toCleanedKey(tag.text)
    const category = choiceMap.value.get(cleanedTag) || otherCategory
    if (!grouped[category]) {
      grouped[category] = []
    }
    grouped[category].push(tag)
  }
  parsedData.value = grouped
})

/**
 * Watch for changes in the tokens array (e.g., from dragging).
 * When it changes, reconstruct the raw prompt string in the textarea.
 */
watch(
  tokens,
  (newTokens) => {
    const newPrompt = newTokens.map((t) => t.raw).join(', ')

    if (newPrompt !== promptInput.value) {
      isUpdatingInternally = true
      promptInput.value = newPrompt

      nextTick(() => {
        isUpdatingInternally = false
      })
    }
  },
  { deep: true }
)

// --- Parsing Logic --- //

/**
 * Processes a single raw token string (e.g., "(1girl:1.2)") into a structured ParsedTag object.
 * @param {string} raw - The raw token string.
 * @returns {ParsedTag} The structured tag object.
 */
function processToken(raw: string): ParsedTag {
  const trimmedRaw = raw.trim()
  const tag: ParsedTag = { raw: trimmedRaw, text: trimmedRaw }

  const loraMatch = trimmedRaw.match(/<((lora|lyco):([^:]+):([^>]+))>/i)
  if (loraMatch) {
    tag.isLora = true
    tag.text = loraMatch[3].trim()
    tag.weight = parseFloat(loraMatch[4])
    tag.bracketType = '<'
    return tag
  }

  const weightedMatch = trimmedRaw.match(/^\((.*):([\d.]+)\)$/)
  if (weightedMatch) {
    tag.text = weightedMatch[1].trim()
    tag.weight = parseFloat(weightedMatch[2])
    tag.bracketType = '('
    return tag
  }

  if (trimmedRaw.length > 1) {
    const openBracket = trimmedRaw[0]
    const closeBracket = trimmedRaw[trimmedRaw.length - 1]
    const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}' }
    if (pairs[openBracket] === closeBracket) {
      tag.text = trimmedRaw.substring(1, trimmedRaw.length - 1).trim()
      tag.bracketType = openBracket as '(' | '[' | '{'
      return tag
    }
  }

  return tag
}

/**
 * Parses a full prompt string into an array of structured ParsedTag objects.
 * Handles commas outside of brackets as separators.
 * @param {string} prompt - The full prompt string.
 * @returns {ParsedTag[]} An array of parsed tags.
 */
function parsePrompt(prompt: string): ParsedTag[] {
  const tokens: ParsedTag[] = []
  let buffer = ''
  let bracketStack: string[] = []
  const bracketPairs: Record<string, string> = { '(': ')', '[': ']', '{': '}', '<': '>' }
  const openBrackets = Object.keys(bracketPairs)
  const closeBrackets = Object.values(bracketPairs)

  for (const char of prompt) {
    if (char === ',' && bracketStack.length === 0) {
      if (buffer.trim()) {
        tokens.push(processToken(buffer))
      }
      buffer = ''
    } else {
      buffer += char
      if (openBrackets.includes(char)) {
        bracketStack.push(char)
      } else if (closeBrackets.includes(char)) {
        if (bracketStack.length > 0 && bracketPairs[bracketStack[bracketStack.length - 1]] === char) {
          bracketStack.pop()
        }
      }
    }
  }
  if (buffer.trim()) {
    tokens.push(processToken(buffer))
  }
  return tokens
}
</script>

<template>
  <div class="d-flex flex-column gap-4">
    <!-- 1. Top: Prompt Input -->
    <div>
      <label for="prompt-parser-input" class="form-label fw-semibold">{{ t('Prompt Input') }}</label>
      <textarea
        class="form-control"
        id="prompt-parser-input"
        rows="5"
        v-model="promptInput"
        placeholder=""
      ></textarea>
    </div>

    <!-- 2. Middle: Draggable Tags -->
    <div>
      <label class="form-label fw-semibold">{{ t('Draggable Tags') }}</label>
      <DraggableTags v-model="tokens" :t="t" />
    </div>

    <!-- 3. Bottom: Categorized Result -->
    <div>
      <label class="form-label fw-semibold">{{ t('Categorized Prompt') }}</label>
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
