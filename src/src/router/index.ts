import { createRouter, createWebHistory } from 'vue-router'
import CharacterCreatorView from '../views/CharacterCreatorView.vue'
import ChoicesEditorView from '../views/ChoicesEditorView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'creator',
      component: CharacterCreatorView,
    },
    {
      path: '/choices-editor',
      name: 'choices-editor',
      component: ChoicesEditorView,
    },
  ],
  linkActiveClass: 'active',
})

export default router
