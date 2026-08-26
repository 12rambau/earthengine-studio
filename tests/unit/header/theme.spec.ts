import { describe, expect, it } from 'vitest'
import { isThemeName, resolveThemeName } from '@/components/header/theme'

describe('theme helpers', () => {
  it('accepts the supported theme preferences only', () => {
    expect(isThemeName('system')).toBe(true)
    expect(isThemeName('light')).toBe(true)
    expect(isThemeName('dark')).toBe(true)
    expect(isThemeName('contrast')).toBe(false)
    expect(isThemeName(null)).toBe(false)
  })

  it('resolves the system preference from the device color scheme', () => {
    expect(resolveThemeName('system', true)).toBe('dark')
    expect(resolveThemeName('system', false)).toBe('light')
  })

  it('keeps explicit theme preferences unchanged', () => {
    expect(resolveThemeName('light', true)).toBe('light')
    expect(resolveThemeName('dark', false)).toBe('dark')
  })
})
