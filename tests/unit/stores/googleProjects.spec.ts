import type * as GoogleProjectsService from '@/services/googleProjects'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGoogleProjectsStore } from '@/stores/googleProjects'
import { useUserPreferencesStore } from '@/stores/userPreferences'

vi.mock('@/services/googleProjects', async () => {
  const actual = await vi.importActual<typeof GoogleProjectsService>('@/services/googleProjects')

  return { ...actual, fetchGoogleCloudProjects: vi.fn() }
})

vi.mock('@/services/userPersistence', () => ({
  fetchFirestoreUserPreferences: vi.fn().mockResolvedValue(null),
  saveFirestoreUserPreferences: vi.fn().mockResolvedValue(undefined),
}))

const projects = [
  { id: 'earth-analysis', name: 'Earth Analysis' },
  { id: 'ldc-crop-monitor', name: 'LDC Crop Monitor' },
]

describe('Google projects store', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    const { fetchGoogleCloudProjects } = await import('@/services/googleProjects')
    vi.mocked(fetchGoogleCloudProjects).mockResolvedValue(projects)
  })

  it('restores the last selected project remembered for this user', async () => {
    const userPreferencesStore = useUserPreferencesStore()
    await userPreferencesStore.initialize('google-subject')
    userPreferencesStore.setLastProjectId('ldc-crop-monitor')

    const store = useGoogleProjectsStore()
    await store.loadProjects('access-token')

    expect(store.selectedProject).toEqual(projects[1])
  })

  it('falls back to the first project when no project was previously remembered', async () => {
    const userPreferencesStore = useUserPreferencesStore()
    await userPreferencesStore.initialize('google-subject')

    const store = useGoogleProjectsStore()
    await store.loadProjects('access-token')

    expect(store.selectedProject).toEqual(projects[0])
  })

  it('falls back to the first project when the remembered project is no longer available', async () => {
    const userPreferencesStore = useUserPreferencesStore()
    await userPreferencesStore.initialize('google-subject')
    userPreferencesStore.setLastProjectId('deleted-project')

    const store = useGoogleProjectsStore()
    await store.loadProjects('access-token')

    expect(store.selectedProject).toEqual(projects[0])
  })

  it('remembers a manually selected project for this user', () => {
    const userPreferencesStore = useUserPreferencesStore()
    const store = useGoogleProjectsStore()

    store.selectProject(projects[1])

    expect(userPreferencesStore.lastProjectId).toBe('ldc-crop-monitor')
  })
})
