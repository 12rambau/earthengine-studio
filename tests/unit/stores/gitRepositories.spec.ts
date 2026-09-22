import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGitRepositoriesStore } from '@/stores/gitRepositories'

const firebaseRuntime = vi.hoisted(() => ({
  addScope: vi.fn(),
  auth: { currentUser: null as { uid: string } | null },
  credentialFromResult: vi.fn(),
  linkWithPopup: vi.fn(),
  reauthenticateWithPopup: vi.fn(),
}))

vi.mock('@/services/firebase', () => ({
  firebaseAuth: firebaseRuntime.auth,
}))

vi.mock('firebase/auth', () => ({
  GithubAuthProvider: class {
    static credentialFromResult = firebaseRuntime.credentialFromResult

    addScope = firebaseRuntime.addScope
  },
  linkWithPopup: firebaseRuntime.linkWithPopup,
  reauthenticateWithPopup: firebaseRuntime.reauthenticateWithPopup,
}))

describe('Git repositories store GitHub connection', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    firebaseRuntime.auth.currentUser = { uid: 'firebase-ada' }
    firebaseRuntime.credentialFromResult.mockReturnValue({ accessToken: 'github-access-token' })
  })

  it('requests repository scope and links GitHub to the signed-in Firebase user', async () => {
    firebaseRuntime.linkWithPopup.mockResolvedValue({
      user: { providerData: [{ displayName: 'ada-lovelace', providerId: 'github.com' }] },
    })

    const store = useGitRepositoriesStore()

    await store.connectGitHubAccount()

    expect(firebaseRuntime.addScope).toHaveBeenCalledWith('repo')
    expect(firebaseRuntime.linkWithPopup).toHaveBeenCalledWith(firebaseRuntime.auth.currentUser, expect.anything())
    expect(store.githubAccessToken).toBe('github-access-token')
    expect(store.githubUsername).toBe('ada-lovelace')
    expect(store.githubConnectionError).toBeNull()
  })

  it('re-authenticates instead of linking when GitHub is already a connected provider', async () => {
    firebaseRuntime.linkWithPopup.mockRejectedValue({ code: 'auth/provider-already-linked' })
    firebaseRuntime.reauthenticateWithPopup.mockResolvedValue({
      user: { providerData: [{ displayName: 'ada-lovelace', providerId: 'github.com' }] },
    })

    const store = useGitRepositoriesStore()

    await store.connectGitHubAccount()

    expect(firebaseRuntime.reauthenticateWithPopup).toHaveBeenCalledWith(firebaseRuntime.auth.currentUser, expect.anything())
    expect(store.githubAccessToken).toBe('github-access-token')
  })

  it('reports a recoverable error without a signed-in Firebase user', async () => {
    firebaseRuntime.auth.currentUser = null

    const store = useGitRepositoriesStore()

    await store.connectGitHubAccount()

    expect(firebaseRuntime.linkWithPopup).not.toHaveBeenCalled()
    expect(store.githubConnectionError).toBe('Sign in with Google before connecting GitHub.')
  })
})
