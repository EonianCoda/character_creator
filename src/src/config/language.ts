// Language-Releated
export interface LanguageOption {
  value: string
  label: string
}

export const defaultLanguage = 'zh_tw'

export const languageOptions = [
  { value: 'zh_tw', label: '繁體中文' },
  { value: 'en', label: 'English' },
] as const

export type LanguageCode = (typeof languageOptions)[number]['value']
