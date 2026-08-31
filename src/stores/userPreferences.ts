import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  fetchFirestoreUserPreferences,
  saveFirestoreUserPreferences,
} from '@/services/userPersistence'

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

/** Narrows accepted persisted appearance values to the themes supported by the current workspace. */
export function isThemeName (themeName: unknown): themeName is ThemeName {
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

/** Validates a structured Firestore layout record, accepting legacy serialized values only for safe local recovery. */
export function parseLayoutPreferences (value: unknown): LayoutPreferences | null {
  if (!value) {
    return null
  }

  let layoutPreferences: unknown = value

  if (typeof value === 'string') {
    try {
      layoutPreferences = JSON.parse(value) as unknown
    } catch {
      return null
    }
  }

  if (!layoutPreferences || typeof layoutPreferences !== 'object' || Array.isArray(layoutPreferences)) {
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

export const useUserPreferencesStore = defineStore('user-preferences', () => {
  /** Identifies the Firebase Auth user who currently owns the settings in this workspace. */
  const activeUserId = ref<string | null>(null)

  const theme = ref<ThemeName>('system')
  const layout = ref<LayoutPreferences>({ ...defaultLayoutPreferences })

  /** Restores validated Firestore settings for the Firebase Auth user that has just been restored in this browser. */
  async function initialize (userId: string) {
    activeUserId.value = userId
    theme.value = 'system'
    layout.value = { ...defaultLayoutPreferences }

    let savedPreferences

    try {
      savedPreferences = await fetchFirestoreUserPreferences(userId)
    } catch {
      return
    }

    if (activeUserId.value !== userId || !savedPreferences) {
      return
    }

    if (isThemeName(savedPreferences.theme)) {
      theme.value = savedPreferences.theme
    }

    const parsedLayoutPreferences = parseLayoutPreferences(savedPreferences.layout)

    if (parsedLayoutPreferences) {
      layout.value = parsedLayoutPreferences
    }
  }

  /** Removes the previous account's in-memory settings when no Firebase user owns the workspace. */
  function clearUser () {
    activeUserId.value = null
    theme.value = 'system'
    layout.value = { ...defaultLayoutPreferences }
  }

  /** Persists the complete settings record only while a Firebase Auth user owns the current workspace. */
  async function persistPreferences () {
    if (!activeUserId.value) {
      return
    }

    try {
      await saveFirestoreUserPreferences(activeUserId.value, {
        layout: layout.value,
        theme: theme.value,
      })
    } catch {
      // User interaction remains responsive when persistence is temporarily unavailable.
    }
  }

  function setTheme (themeName: ThemeName) {
    theme.value = themeName
    void persistPreferences()
  }

  function updateLayout (layoutUpdate: Partial<LayoutPreferences>) {
    layout.value = { ...layout.value, ...layoutUpdate }
    void persistPreferences()
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
    clearUser,
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
