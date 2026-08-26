import Cookies from 'js-cookie'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ThemeName = 'system' | 'light' | 'dark'

const userPreferenceCookiePrefix = 'earthengine-studio'
const userPreferenceCookieDuration = 365

export const themePreferenceKey = getUserPreferenceKey('theme')

export const themeOptions: Array<{ icon: string, title: string, value: ThemeName }> = [
  { icon: 'mdi-theme-light-dark', title: 'Use device theme', value: 'system' },
  { icon: 'mdi-weather-sunny', title: 'Light theme', value: 'light' },
  { icon: 'mdi-weather-night', title: 'Dark theme', value: 'dark' },
]

export function getUserPreferenceKey (preferenceName: string) {
  return `${userPreferenceCookiePrefix}.${preferenceName}`
}

export function isThemeName (themeName: string | null): themeName is ThemeName {
  return themeOptions.some(option => option.value === themeName)
}

export function resolveThemeName (themeName: ThemeName, prefersDark: boolean): 'light' | 'dark' {
  if (themeName === 'system') {
    return prefersDark ? 'dark' : 'light'
  }

  return themeName
}

export function readUserPreference<T extends string> (
  preferenceName: string,
  isValidPreference: (value: string | null) => value is T,
): T | null {
  if (typeof document === 'undefined') {
    return null
  }

  const preferenceValue = Cookies.get(getUserPreferenceKey(preferenceName)) ?? null

  return isValidPreference(preferenceValue) ? preferenceValue : null
}

export function writeUserPreference (preferenceName: string, preferenceValue: string) {
  if (typeof document === 'undefined') {
    return
  }

  Cookies.set(getUserPreferenceKey(preferenceName), preferenceValue, {
    expires: userPreferenceCookieDuration,
    path: '/',
    sameSite: 'lax',
  })
}

function restoreUserPreference<T extends string> (
  preferenceName: string,
  isValidPreference: (value: string | null) => value is T,
): T | null {
  const savedPreference = readUserPreference(preferenceName, isValidPreference)

  if (savedPreference || typeof localStorage === 'undefined') {
    return savedPreference
  }

  const preferenceKey = getUserPreferenceKey(preferenceName)
  const legacyPreference = localStorage.getItem(preferenceKey)

  if (!isValidPreference(legacyPreference)) {
    return null
  }

  writeUserPreference(preferenceName, legacyPreference)
  localStorage.removeItem(preferenceKey)

  return legacyPreference
}

export const useUserPreferencesStore = defineStore('user-preferences', () => {
  const theme = ref<ThemeName>('system')

  function initialize () {
    const savedThemeName = restoreUserPreference('theme', isThemeName)

    if (savedThemeName) {
      theme.value = savedThemeName
    }
  }

  function setTheme (themeName: ThemeName) {
    theme.value = themeName
    writeUserPreference('theme', themeName)
  }

  return {
    initialize,
    setTheme,
    theme,
  }
})
