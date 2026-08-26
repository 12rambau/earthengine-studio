import Cookies from 'js-cookie'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  clampWorkspacePanelSize,
  defaultLayoutPreferences,
  getUserPreferenceKey,
  isPanelAlignment,
  isPrimarySidebarPosition,
  isThemeName,
  layoutPreferenceKey,
  parseLayoutPreferences,
  readUserPreference,
  resolveThemeName,
  serializeLayoutPreferences,
  themePreferenceKey,
  useUserPreferencesStore,
  workspacePanelHeightRange,
  workspaceSidebarWidthRange,
  writeUserPreference,
} from '@/stores/userPreferences'

function clearUserPreferenceCookie (preferenceName: string) {
  Cookies.remove(getUserPreferenceKey(preferenceName), { path: '/' })
}

describe('user preferences store', () => {
  beforeEach(() => {
    clearUserPreferenceCookie('layout')
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

  it('parses complete and valid layout preferences only', () => {
    expect(parseLayoutPreferences(serializeLayoutPreferences(defaultLayoutPreferences))).toEqual(defaultLayoutPreferences)
    expect(parseLayoutPreferences(JSON.stringify({
      panelAlignment: 'justify',
      panelVisible: true,
      primarySidebarPosition: 'left',
      primarySidebarVisible: true,
      secondarySidebarVisible: true,
    }))).toEqual(defaultLayoutPreferences)
    expect(parseLayoutPreferences('{"panelVisible":true}')).toBeNull()
    expect(parseLayoutPreferences('{invalid json}')).toBeNull()
  })

  it('accepts the supported layout positions and alignments only', () => {
    expect(isPrimarySidebarPosition('left')).toBe(true)
    expect(isPrimarySidebarPosition('right')).toBe(true)
    expect(isPrimarySidebarPosition('center')).toBe(false)
    expect(isPanelAlignment('left')).toBe(true)
    expect(isPanelAlignment('center')).toBe(true)
    expect(isPanelAlignment('stretch')).toBe(false)
  })

  it('bounds resizable panel dimensions', () => {
    expect(clampWorkspacePanelSize(80, workspaceSidebarWidthRange)).toBe(160)
    expect(clampWorkspacePanelSize(800, workspacePanelHeightRange)).toBe(720)
    expect(clampWorkspacePanelSize(287.6, workspaceSidebarWidthRange)).toBe(288)
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

  it('restores the layout preferences from the cookie', () => {
    const savedLayout = {
      ...defaultLayoutPreferences,
      panelAlignment: 'center' as const,
      primarySidebarPosition: 'right' as const,
      secondarySidebarVisible: false,
    }
    writeUserPreference('layout', serializeLayoutPreferences(savedLayout))
    const userPreferencesStore = useUserPreferencesStore()

    userPreferencesStore.initialize()

    expect(userPreferencesStore.layout).toEqual(savedLayout)
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

  it('persists layout updates in a cookie', () => {
    const userPreferencesStore = useUserPreferencesStore()

    userPreferencesStore.setPrimarySidebarPosition('right')
    userPreferencesStore.setPanelAlignment('left')
    userPreferencesStore.setPanelHeight(320)
    userPreferencesStore.setPrimarySidebarWidth(360)
    userPreferencesStore.setSecondarySidebarWidth(420)
    userPreferencesStore.togglePanelVisibility()

    expect(userPreferencesStore.layout).toEqual({
      ...defaultLayoutPreferences,
      panelAlignment: 'left',
      panelHeight: 320,
      panelVisible: false,
      primarySidebarPosition: 'right',
      primarySidebarWidth: 360,
      secondarySidebarWidth: 420,
    })
    expect(parseLayoutPreferences(Cookies.get(layoutPreferenceKey) ?? null)).toEqual(userPreferencesStore.layout)
  })
})
