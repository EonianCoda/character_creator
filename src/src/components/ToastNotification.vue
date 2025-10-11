<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { Toast } from 'bootstrap'
import type { AlertType } from '@/types'

const props = defineProps<{
  show: boolean
  message: string
  type?: AlertType
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const toastEl = ref<Element | null>(null)
const bsToast = ref<Toast | null>(null)

// 根據 type 計算樣式
const toastColor = computed(() => {
  switch (props.type) {
    case 'success':
      return 'bg-success text-white'
    case 'error':
      return 'bg-danger text-white'
    case 'warning':
      return 'bg-warning text-dark'
    case 'info':
      return 'bg-primary text-white'
    default:
      return 'bg-secondary text-white'
  }
})

watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      bsToast.value?.show()
    } else {
      bsToast.value?.hide()
    }
  },
)

onMounted(() => {
  if (toastEl.value) {
    bsToast.value = new Toast(toastEl.value, { delay: 3000 })
    toastEl.value.addEventListener('hidden.bs.toast', () => {
      emit('close')
    })
  }
})
</script>

<template>
  <div class="toast-container position-fixed bottom-0 end-0 p-3">
    <div
      ref="toastEl"
      class="toast"
      :class="toastColor"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div class="d-flex">
        <div class="toast-body">
          {{ message }}
        </div>
        <button
          type="button"
          class="btn-close"
          :class="props.type === 'warning' ? '' : 'btn-close-white'"
          data-bs-dismiss="toast"
          aria-label="Close"
        ></button>
      </div>
    </div>
  </div>
</template>