import Cookies from 'js-cookie'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ThemeName = 'system' | 'light' | 'dark'
export type PrimarySidebarPosition = 'left' | 'right'
export type PanelAlignment = 'left' | 'right' | 'center' | 'justify'

export const workspacePanelHeightRange = { maximum: 720, minimum: 160 }
export const workspaceSidebarWidthRange = { maximum: 720, minimum: 160 }

export interface LayoutPreferences {
  panelAlignment: PanelAlignment
  panelHeight: number
  panelVisible: boolean
  primarySidebarPosition: PrimarySidebarPosition
  primarySidebarVisible: boolean
  primarySidebarWidth: number
  secondarySidebarVisible: boolean
  secondarySidebarWidth: number
}

const userPreferenceCookiePrefix = 'earthengine-studio'
const userPreferenceCookieDuration = 365

export const themePreferenceKey = getUserPreferenceKey('theme')
export const layoutPreferenceKey = getUserPreferenceKey('layout')

export const defaultLayoutPreferences: LayoutPreferences = {
  panelAlignment: 'justify',
  panelHeight: 220,
  panelVisible: true,
  primarySidebarPosition: 'left',
  primarySidebarVisible: true,
  primarySidebarWidth: 280,
  secondarySidebarVisible: true,
  secondarySidebarWidth: 320,
}

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

export function isPanelAlignment (panelAlignment: string | null | undefined): panelAlignment is PanelAlignment {
  return ['left', 'right', 'center', 'justify'].includes(panelAlignment ?? '')
}

export function isPrimarySidebarPosition (
  primarySidebarPosition: string | null | undefined,
): primarySidebarPosition is PrimarySidebarPosition {
  return ['left', 'right'].includes(primarySidebarPosition ?? '')
}

export function clampWorkspacePanelSize (
  size: number,
  sizeRange: { maximum: number, minimum: number },
) {
  return Math.min(sizeRange.maximum, Math.max(sizeRange.minimum, Math.round(size)))
}

function isWorkspacePanelSize (
  size: number | null | undefined,
  sizeRange: { maximum: number, minimum: number },
) {
  return typeof size === 'number'
    && Number.isFinite(size)
    && size >= sizeRange.minimum
    && size <= sizeRange.maximum
}

export function parseLayoutPreferences (value: string | null): LayoutPreferences | null {
  if (!value) {
    return null
  }

  try {
    const layoutPreferences: unknown = JSON.parse(value)

    if (!layoutPreferences || typeof layoutPreferences !== 'object') {
      return null
    }

    const layout = layoutPreferences as Partial<LayoutPreferences>
    const panelHeight = layout.panelHeight ?? defaultLayoutPreferences.panelHeight
    const primarySidebarWidth = layout.primarySidebarWidth ?? defaultLayoutPreferences.primarySidebarWidth
    const secondarySidebarWidth = layout.secondarySidebarWidth ?? defaultLayoutPreferences.secondarySidebarWidth

    if (
      !isPanelAlignment(layout.panelAlignment)
      || !isPrimarySidebarPosition(layout.primarySidebarPosition)
      || !isWorkspacePanelSize(panelHeight, workspacePanelHeightRange)
      || !isWorkspacePanelSize(primarySidebarWidth, workspaceSidebarWidthRange)
      || !isWorkspacePanelSize(secondarySidebarWidth, workspaceSidebarWidthRange)
      || typeof layout.panelVisible !== 'boolean'
      || typeof layout.primarySidebarVisible !== 'boolean'
      || typeof layout.secondarySidebarVisible !== 'boolean'
    ) {
      return null
    }

    return {
      panelAlignment: layout.panelAlignment,
      panelHeight,
      panelVisible: layout.panelVisible,
      primarySidebarPosition: layout.primarySidebarPosition,
      primarySidebarVisible: layout.primarySidebarVisible,
      primarySidebarWidth,
      secondarySidebarVisible: layout.secondarySidebarVisible,
      secondarySidebarWidth,
    }
  } catch {
    return null
  }
}

export function serializeLayoutPreferences (layoutPreferences: LayoutPreferences) {
  return JSON.stringify(layoutPreferences)
}

export function resolveThemeName (themeName: ThemeName, prefersDark: boolean): 'light' | 'dark' {
  if (themeName === 'system') {
    return prefersDark ? 'dark' : 'light'
  }

  return themeName
}

function isSerializedLayoutPreferences (value: string | null): value is string {
  return parseLayoutPreferences(value) !== null
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
  const layout = ref<LayoutPreferences>({ ...defaultLayoutPreferences })

  function initialize () {
    const savedThemeName = restoreUserPreference('theme', isThemeName)
    const savedLayoutPreferences = restoreUserPreference('layout', isSerializedLayoutPreferences)

    if (savedThemeName) {
      theme.value = savedThemeName
    }

    const parsedLayoutPreferences = parseLayoutPreferences(savedLayoutPreferences)

    if (parsedLayoutPreferences) {
      layout.value = parsedLayoutPreferences
    }
  }

  function setTheme (themeName: ThemeName) {
    theme.value = themeName
    writeUserPreference('theme', themeName)
  }

  function updateLayout (layoutUpdate: Partial<LayoutPreferences>) {
    layout.value = { ...layout.value, ...layoutUpdate }
    writeUserPreference('layout', serializeLayoutPreferences(layout.value))
  }

  function setPanelAlignment (panelAlignment: PanelAlignment) {
    updateLayout({ panelAlignment })
  }

  function setPanelHeight (panelHeight: number) {
    updateLayout({
      panelHeight: clampWorkspacePanelSize(panelHeight, workspacePanelHeightRange),
    })
  }

  function setPanelVisibility (panelVisible: boolean) {
    updateLayout({ panelVisible })
  }

  function setPrimarySidebarPosition (primarySidebarPosition: PrimarySidebarPosition) {
    updateLayout({ primarySidebarPosition })
  }

  function setPrimarySidebarVisibility (primarySidebarVisible: boolean) {
    updateLayout({ primarySidebarVisible })
  }

  function setPrimarySidebarWidth (primarySidebarWidth: number) {
    updateLayout({
      primarySidebarWidth: clampWorkspacePanelSize(primarySidebarWidth, workspaceSidebarWidthRange),
    })
  }

  function setSecondarySidebarVisibility (secondarySidebarVisible: boolean) {
    updateLayout({ secondarySidebarVisible })
  }

  function setSecondarySidebarWidth (secondarySidebarWidth: number) {
    updateLayout({
      secondarySidebarWidth: clampWorkspacePanelSize(secondarySidebarWidth, workspaceSidebarWidthRange),
    })
  }

  function togglePanelVisibility () {
    setPanelVisibility(!layout.value.panelVisible)
  }

  function togglePrimarySidebarVisibility () {
    setPrimarySidebarVisibility(!layout.value.primarySidebarVisible)
  }

  function toggleSecondarySidebarVisibility () {
    setSecondarySidebarVisibility(!layout.value.secondarySidebarVisible)
  }

  return {
    initialize,
    layout,
    setPanelAlignment,
    setPanelHeight,
    setPanelVisibility,
    setPrimarySidebarPosition,
    setPrimarySidebarVisibility,
    setPrimarySidebarWidth,
    setSecondarySidebarVisibility,
    setSecondarySidebarWidth,
    setTheme,
    theme,
    togglePanelVisibility,
    togglePrimarySidebarVisibility,
    toggleSecondarySidebarVisibility,
  }
})
