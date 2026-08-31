import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { googleCloudProjectReadScope, googleEarthEngineScope } from '@/services/googleProjects'
import { useGoogleAuthStore } from '@/stores/googleAuth'

const firebaseRuntime = vi.hoisted(() => ({
  addScope: vi.fn(),
  auth: {},
  credentialFromResult: vi.fn(),
  onAuthStateChanged: vi.fn(),
  setCustomParameters: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('@/services/firebase', () => ({
  firebaseAuth: firebaseRuntime.auth,
  firebaseAuthReady: Promise.resolve(),
}))

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class {
    static credentialFromResult = firebaseRuntime.credentialFromResult

    addScope = firebaseRuntime.addScope
    setCustomParameters = firebaseRuntime.setCustomParameters
  },
  onAuthStateChanged: firebaseRuntime.onAuthStateChanged,
  signInWithPopup: firebaseRuntime.signInWithPopup,
  signOut: firebaseRuntime.signOut,
}))

describe('Firebase Google auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    firebaseRuntime.credentialFromResult.mockReturnValue({ accessToken: 'google-access-token' })
    firebaseRuntime.onAuthStateChanged.mockImplementation((_auth, observer) => {
      observer(null)
      return vi.fn()
    })
    firebaseRuntime.signOut.mockResolvedValue(undefined)
  })

  it('restores Firebase profile claims supplied by the Auth observer', async () => {
    firebaseRuntime.onAuthStateChanged.mockImplementation((_auth, observer) => {
      observer({
        email: 'ada@example.com',
        displayName: 'Ada Lovelace',
        emailVerified: true,
        photoURL: 'https://example.com/ada.png',
        uid: 'firebase-ada',
      })
      return vi.fn()
    })

    const store = useGoogleAuthStore()

    await store.initialize()

    expect(store.profile).toEqual({
      email: 'ada@example.com',
      emailVerified: true,
      name: 'Ada Lovelace',
      picture: 'https://example.com/ada.png',
      subject: 'firebase-ada',
    })
    expect(store.status).toBe('authenticated')
  })

  it('requests the Earth Engine scopes from Firebase Google sign-in and keeps the provider token in memory', async () => {
    firebaseRuntime.signInWithPopup.mockResolvedValue({
      user: {
        displayName: 'Ada Lovelace',
        email: 'ada@example.com',
        emailVerified: true,
        photoURL: 'https://example.com/ada.png',
        uid: 'firebase-ada',
      },
    })
    const store = useGoogleAuthStore()

    await store.signInWithGoogle()

    expect(firebaseRuntime.addScope).toHaveBeenCalledWith(googleCloudProjectReadScope)
    expect(firebaseRuntime.addScope).toHaveBeenCalledWith(googleEarthEngineScope)
    expect(firebaseRuntime.setCustomParameters).toHaveBeenCalledWith({ prompt: 'select_account' })
    expect(store.accessToken).toBe('google-access-token')
    expect(store.profile?.subject).toBe('firebase-ada')
    expect(store.status).toBe('authenticated')
  })

  it('clears the in-memory Google API token when Firebase signs out', async () => {
    firebaseRuntime.signInWithPopup.mockResolvedValue({
      user: {
        displayName: 'Ada Lovelace',
        email: 'ada@example.com',
        emailVerified: true,
        photoURL: null,
        uid: 'firebase-ada',
      },
    })

    const store = useGoogleAuthStore()

    await store.signInWithGoogle()
    await store.signOut()

    expect(firebaseRuntime.signOut).toHaveBeenCalledWith(firebaseRuntime.auth)
    expect(store.accessToken).toBeNull()
    expect(store.profile).toBeNull()
    expect(store.status).toBe('ready')
  })
})
