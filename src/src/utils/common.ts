function toCleanedKey(key: string): string {
  return key.replace(/[_\s]/g, '').toLowerCase().trim()
}

export { toCleanedKey }