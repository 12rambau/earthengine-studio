import { describe, expect, it } from 'vitest'
import { resolveScriptLanguage } from '@/components/workspace-viewport/editor-pane/scriptLanguage'

describe('script language resolution', () => {
  it('resolves the three supported script languages from their file extension', () => {
    expect(resolveScriptLanguage('analysis.js')).toBe('javascript')
    expect(resolveScriptLanguage('notes.md')).toBe('markdown')
    expect(resolveScriptLanguage('preprocess.py')).toBe('python')
  })

  it('matches extensions case-insensitively', () => {
    expect(resolveScriptLanguage('analysis.JS')).toBe('javascript')
    expect(resolveScriptLanguage('notes.MD')).toBe('markdown')
  })

  it('falls back to raw plain text for any unsupported or missing extension', () => {
    expect(resolveScriptLanguage('README.txt')).toBe('plaintext')
    expect(resolveScriptLanguage('Dockerfile')).toBe('plaintext')
    expect(resolveScriptLanguage('archive.tar.gz')).toBe('plaintext')
    expect(resolveScriptLanguage('.gitignore')).toBe('plaintext')
  })
})
