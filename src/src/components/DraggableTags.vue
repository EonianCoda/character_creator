<!--
This component displays a list of parsed prompt tags as draggable blocks.
It uses vue-smooth-dnd for smooth dragging and provides controls for
editing weight and deleting tags on hover.
-->
<script setup lang="ts">
import { ref } from 'vue'
import type { ParsedTag } from '@/types'
// import { Container, Draggable } from 'vue-smooth-dnd'
import { Container, Draggable, type DropResult } from 'vue3-smooth-dnd'


const props = defineProps<{
  modelValue: ParsedTag[] // Use v-model for easy two-way binding
  t: (key: string) => string // i18n function
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', tokens: ParsedTag[]): void
}>()

// --- Drag and Drop Logic --- //
function onDrop(dropResult: any) {
  const { removedIndex, addedIndex } = dropResult
  if (removedIndex === null && addedIndex === null) return

  const newTokens = [...props.modelValue]
  const itemToAdd = dropResult.payload

  if (removedIndex !== null) {
    newTokens.splice(removedIndex, 1)
  }
  if (addedIndex !== null) {
    newTokens.splice(addedIndex, 0, itemToAdd)
  }
  emit('update:modelValue', newTokens)
}

function getChildPayload(index: number) {
  return props.modelValue[index]
}


// --- State for Hover Controls --- //
const activeTagIndex = ref<number | null>(null)
const isOverControls = ref(false) // To prevent hiding controls when moving mouse from tag to controls
const controlsPosition = ref({ top: '0px', left: '0px' })
let hideTimeout: number | null = null

/**
 * Shows the editing controls for a tag.
 * @param {number} index - The index of the tag.
 * @param {MouseEvent} event - The mouse event to position the controls.
 */
function showControls(index: number, event: MouseEvent) {
  if (hideTimeout) clearTimeout(hideTimeout)
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  controlsPosition.value = {
    top: `${rect.top - 50}px`, // Position above the tag
    left: `${rect.left}px`
  }
  activeTagIndex.value = index
}

/**
 * Hides the editing controls with a small delay.
 */
function hideControls() {
  hideTimeout = window.setTimeout(() => {
    if (!isOverControls.value) {
      activeTagIndex.value = null
    }
  }, 100)
}

/**
 * Deletes a tag from the list.
 * @param {number} index - The index of the tag to delete.
 */
function deleteTag(index: number) {
  const newTokens = [...props.modelValue]
  newTokens.splice(index, 1)
  emit('update:modelValue', newTokens)
  activeTagIndex.value = null // Hide controls after deleting
}

/**
 * Updates the weight of a tag.
 * @param {number} index - The index of the tag to update.
 * @param {Event} event - The input event from the weight field.
 */
function updateWeight(index: number, event: Event) {
  const target = event.target as HTMLInputElement
  let newWeight = parseFloat(target.value)
  if (isNaN(newWeight)) {
    newWeight = 1
  }

  const newTokens = [...props.modelValue]
  const token = { ...newTokens[index] } // Create a copy

  // Reconstruct the raw string with the new weight
  if (newWeight === 1 && token.bracketType === '(') {
    // If weight is 1, remove the weighting brackets and weight
    token.raw = token.text
    token.bracketType = null
    token.weight = undefined
  } else {
    token.raw = `(${token.text}:${newWeight})`
    token.bracketType = '(' // Ensure it has weight brackets
    token.weight = newWeight
  }

  newTokens[index] = token
  emit('update:modelValue', newTokens)
}

// Helper to get the current weight or default to 1
function getWeight(token: ParsedTag): number {
  return token.weight ?? 1
}
</script>

<template>
  <div>
    <!-- Draggable Container -->
    <Container
      @drop="onDrop"
      :get-child-payload="getChildPayload"
      orientation="horizontal"
      class="draggable-tags-container border rounded p-3"
    >
      <Draggable v-for="(token, index) in props.modelValue" :key="token.raw">
        <div
          class="tag-item d-inline-flex flex-column border rounded p-2 me-2 mb-2 shadow-sm"
          @mouseenter="showControls(index, $event)"
          @mouseleave="hideControls"
        >
          <!-- Top part: The tag itself -->
          <div class="d-flex align-items-center">
            <i v-if="token.isLora" class="bi bi-memory me-1" title="Lora Tag"></i>
            <span
              :class="{
                'fw-bold': token.bracketType === '(',
                'fst-italic': token.bracketType === '['
              }"
            >
              {{ token.text }}
            </span>
          </div>
          <!-- Bottom part: The translation -->
          <small class="text-muted mt-1">{{ t(token.text) }}</small>
        </div>
      </Draggable>
      <div v-if="!modelValue.length" class="text-muted p-3 text-center">
        Tags will appear here once a prompt is entered.
      </div>
    </Container>

    <!-- Hover Controls Popup -->
    <Teleport to="body">
      <div
        v-if="activeTagIndex !== null && modelValue[activeTagIndex]"
        class="tag-controls card shadow-lg p-2"
        :style="controlsPosition"
        @mouseenter="isOverControls = true"
        @mouseleave="isOverControls = false; hideControls()"
      >
        <div class="d-flex align-items-center">
          <label class="form-label me-2 mb-0 small">Weight:</label>
          <input
            type="number"
            class="form-control form-control-sm"
            style="width: 70px"
            :value="getWeight(modelValue[activeTagIndex])"
            step="0.1"
            @input="updateWeight(activeTagIndex, $event)"
          />
          <button class="btn btn-sm btn-outline-danger ms-2" @click="deleteTag(activeTagIndex)">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.draggable-tags-container {
  min-height: 120px;
  background-color: var(--bs-tertiary-bg); /* More prominent background */
  display: flex;
  flex-wrap: wrap;
}
.tag-item {
  cursor: grab;
  background-color: var(--bs-body-bg);
  transition: transform 0.2s ease-in-out;
  user-select: none;
}
.tag-item:active {
  cursor: grabbing;
}
.tag-controls {
  position: fixed;
  z-index: 1050; /* High z-index to appear over other elements */
  background-color: var(--bs-body-bg);
}

/* Style for the ghost element during drag */
.smooth-dnd-ghost {
  opacity: 0.8;
  background-color: var(--bs-primary-bg-subtle);
  border: 1px solid var(--bs-primary);
  border-radius: var(--bs-border-radius);
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
  padding: 0.5rem; /* Match the p-2 */
  transform: rotate(5deg); /* Add a slight tilt for a more dynamic feel */
}
</style>
