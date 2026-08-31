import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clampWorkspacePanelSize,
  defaultLayoutPreferences,
  isPanelAlignment,
  isPrimarySidebarPosition,
  isThemeName,
  parseLayoutPreferences,
  resolveThemeName,
  serializeLayoutPreferences,
  useUserPreferencesStore,
  workspacePanelHeightRange,
  workspaceSidebarWidthRange,
} from '@/stores/userPreferences'

const firebasePersistence = vi.hoisted(() => ({
  fetchFirestoreUserPreferences: vi.fn(),
  saveFirestoreUserPreferences: vi.fn(),
}))

vi.mock('@/services/userPersistence', () => firebasePersistence)

describe('user preferences store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    firebasePersistence.fetchFirestoreUserPreferences.mockResolvedValue(null)
    firebasePersistence.saveFirestoreUserPreferences.mockResolvedValue(undefined)
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

  it('restores the theme preference from Firestore', async () => {
    firebasePersistence.fetchFirestoreUserPreferences.mockResolvedValue({
      layout: defaultLayoutPreferences,
      theme: 'light',
    })
    const userPreferencesStore = useUserPreferencesStore()

    await userPreferencesStore.initialize('google-subject')

    expect(userPreferencesStore.theme).toBe('light')
  })

  it('restores the layout preferences from Firestore', async () => {
    const savedLayout = {
      ...defaultLayoutPreferences,
      panelAlignment: 'center' as const,
      primarySidebarPosition: 'right' as const,
      secondarySidebarVisible: false,
    }
    firebasePersistence.fetchFirestoreUserPreferences.mockResolvedValue({
      layout: savedLayout,
      theme: 'system',
    })
    const userPreferencesStore = useUserPreferencesStore()

    await userPreferencesStore.initialize('google-subject')

    expect(userPreferencesStore.layout).toEqual(savedLayout)
  })

  it('persists a selected theme for the active Firebase user', async () => {
    const userPreferencesStore = useUserPreferencesStore()

    await userPreferencesStore.initialize('google-subject')
    userPreferencesStore.setTheme('dark')

    expect(userPreferencesStore.theme).toBe('dark')
    expect(firebasePersistence.saveFirestoreUserPreferences).toHaveBeenLastCalledWith('google-subject', {
      layout: defaultLayoutPreferences,
      theme: 'dark',
    })
  })

  it('persists layout updates for the active Firebase user', async () => {
    const userPreferencesStore = useUserPreferencesStore()

    await userPreferencesStore.initialize('google-subject')
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
    expect(firebasePersistence.saveFirestoreUserPreferences).toHaveBeenLastCalledWith('google-subject', {
      layout: userPreferencesStore.layout,
      theme: 'system',
    })
  })
})
