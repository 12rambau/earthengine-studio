import Cookies from 'js-cookie'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  getUserPreferenceKey,
  isThemeName,
  readUserPreference,
  resolveThemeName,
  themePreferenceKey,
  useUserPreferencesStore,
  writeUserPreference,
} from '@/stores/userPreferences'

function clearUserPreferenceCookie (preferenceName: string) {
  Cookies.remove(getUserPreferenceKey(preferenceName), { path: '/' })
}

describe('user preferences store', () => {
  beforeEach(() => {
    clearUserPreferenceCookie('theme')
    localStorage.clear()
    setActivePinia(createPinia())
  })

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

  it('persists any validated user preference in a cookie', () => {
    const isDensity = (value: string | null): value is 'comfortable' | 'compact' => {
      return value === 'comfortable' || value === 'compact'
    }

    writeUserPreference('density', 'compact')

    expect(readUserPreference('density', isDensity)).toBe('compact')

    clearUserPreferenceCookie('density')
  })

  it('restores the theme preference from the cookie', () => {
    writeUserPreference('theme', 'light')
    const userPreferencesStore = useUserPreferencesStore()

    userPreferencesStore.initialize()

    expect(userPreferencesStore.theme).toBe('light')
  })

  it('migrates the existing local theme preference to a cookie', () => {
    localStorage.setItem(themePreferenceKey, 'dark')
    const userPreferencesStore = useUserPreferencesStore()

    userPreferencesStore.initialize()

    expect(userPreferencesStore.theme).toBe('dark')
    expect(readUserPreference('theme', isThemeName)).toBe('dark')
    expect(localStorage.getItem(themePreferenceKey)).toBeNull()
  })

  it('persists a selected theme preference in a cookie', () => {
    const userPreferencesStore = useUserPreferencesStore()

    userPreferencesStore.setTheme('dark')

    expect(userPreferencesStore.theme).toBe('dark')
    expect(readUserPreference('theme', isThemeName)).toBe('dark')
  })
})
