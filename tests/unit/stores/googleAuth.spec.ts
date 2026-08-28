import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGoogleAuthStore } from '@/stores/googleAuth'

describe('Google auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'earthengine-studio.apps.googleusercontent.com')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('exposes the account details returned by a basic-profile access token', async () => {
    const fetchStub = vi.fn().mockResolvedValue({
      json: async () => ({
        email: 'ada@example.com',
        name: 'Ada Lovelace',
        picture: 'https://example.com/ada.png',
        sub: 'google-subject',
      }),
      ok: true,
    })

    vi.stubGlobal('fetch', fetchStub)

    const store = useGoogleAuthStore()

    expect(store.startAuthorization()).toBe(true)
    await store.loadProfile('access-token')

    expect(store.profile).toEqual({
      email: 'ada@example.com',
      name: 'Ada Lovelace',
      picture: 'https://example.com/ada.png',
      subject: 'google-subject',
    })

    expect(fetchStub).toHaveBeenCalledWith(
      'https://openidconnect.googleapis.com/v1/userinfo',
      { headers: { Authorization: 'Bearer access-token' } },
    )
    expect(store.status).toBe('authenticated')
  })

  it('leaves the application unconfigured without a Google client identifier', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '')

    const store = useGoogleAuthStore()

    expect(store.startAuthorization()).toBe(false)

    expect(store.isConfigured).toBe(false)
    expect(store.error).toBe('Google sign-in is not configured.')
    expect(store.status).toBe('unconfigured')
  })

  it('clears the in-memory Google session without retaining the access token', async () => {
    const fetchStub = vi.fn().mockResolvedValue({
      json: async () => ({ email: 'ada@example.com', sub: 'google-subject' }),
      ok: true,
    })

    vi.stubGlobal('fetch', fetchStub)

    const store = useGoogleAuthStore()

    await store.loadProfile('access-token')
    store.signOut()

    expect(store.accessToken).toBeNull()
    expect(store.profile).toBeNull()
    expect(store.status).toBe('ready')
  })
})
