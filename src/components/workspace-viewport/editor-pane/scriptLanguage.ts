/** Identifies the Monaco language modes intentionally supported by the script editor today. */
export type ScriptLanguage = 'javascript' | 'markdown' | 'plaintext' | 'python'

/** Maps a lowercase file extension to its supported Monaco language. */
const languagesByExtension: Record<string, ScriptLanguage> = {
  js: 'javascript',
  md: 'markdown',
  py: 'python',
}

/** Resolves the Monaco language for a script from its file extension, falling back to raw plain text for anything unsupported. */
export function resolveScriptLanguage (name: string): ScriptLanguage {
  const extension = name.split('.').pop()?.toLowerCase()

  return (extension && languagesByExtension[extension]) || 'plaintext'
}
