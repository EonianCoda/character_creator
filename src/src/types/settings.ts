// Settings Interfaces
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

export type { AppSettings, CreatorSettings, LlmSettings }