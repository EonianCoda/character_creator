interface CategoryItem {
  name: string
  category: string
  sub_category: string
  optional: number
  description: string
}

interface ChoiceItem {
  category_name: string
  name: string
  prompt: string
  description: string
  key: string
}

type SelectedAttributes = Record<string, string>

type PreviewSubcategory = {
  key: string
  label: string
  lines: { label: string; value: string }[]
}

export type { CategoryItem, ChoiceItem, PreviewSubcategory, SelectedAttributes }