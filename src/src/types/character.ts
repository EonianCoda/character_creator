interface CategoryItem {
  parent_category_id: string // Category id
  id: string // Sub-category id
  description: string
  key: string
}

interface ChoiceItem {
  category_id: string
  subcategory_id: string
  id: string
  prompt: string
  description: string
  key: string
}

type SelectedAttributes = Record<string, string>

interface PreviewLine {
  label: string
  value: string
  [key: string]: any
}

type PreviewSubcategory = {
  key: string
  label: string
  lines: PreviewLine[]
}

export type { CategoryItem as CategoryItem, ChoiceItem, PreviewSubcategory, SelectedAttributes, PreviewLine }