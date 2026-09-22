import type {
  GitRepository,
  GitRepositoryConnectionInput,
  GitRepositoryFile,
} from '@/services/gitRepositories'
import {
  GithubAuthProvider,
  linkWithPopup,
  reauthenticateWithPopup,
  type User,
} from 'firebase/auth'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { firebaseAuth } from '@/services/firebase'
import {
  connectGitRepository,
  createGitRepositoryScript,
  fetchGitRepositoryFiles,
} from '@/services/gitRepositories'

/** Requests read/write access to the connected account's repositories, matching the scope of the removed personal access token flow. */
const githubRepositoryScope = 'repo'

/** Manages remote Git repositories used as the source of truth for Earth Engine JavaScript scripts. */
export const useGitRepositoriesStore = defineStore('git-repositories', () => {
  /** Holds repositories that have been verified during the current browser session. */
  const repositories = ref<GitRepository[]>([])

  /** Caches each repository's filtered JavaScript file list for the rendered scripts filesystem. */
  const filesByRepository = ref<Record<string, GitRepositoryFile[]>>({})

  /** Tracks repository file-tree requests independently so one slow repository does not block others. */
  const isLoadingByRepository = ref<Record<string, boolean>>({})

  /** Retains non-fatal file-tree request errors beside the repository that produced them. */
  const loadErrorsByRepository = ref<Record<string, string | null>>({})

  /** Keeps provider tokens strictly in memory so credentials never enter browser preferences or remote storage. */
  const accessTokens = new Map<string, string>()

  /** Holds the GitHub OAuth token granted to the signed-in Firebase user, kept only for this browser session. */
  const githubAccessToken = ref<string | null>(null)

  /** Displays the connected GitHub account without exposing its access token. */
  const githubUsername = ref<string | null>(null)

  /** Indicates that the GitHub authorization popup is open or its result is being processed. */
  const isConnectingGitHub = ref(false)

  /** Exposes a recoverable reason why the GitHub OAuth connection could not be completed. */
  const githubConnectionError = ref<string | null>(null)

  /**
   * Authorizes GitHub through Firebase Authentication so a repository connection needs no manually created token.
   * Links GitHub to the signed-in Google identity, or re-authenticates it to refresh an expired token.
   */
  async function connectGitHubAccount () {
    if (!firebaseAuth?.currentUser) {
      githubConnectionError.value = 'Sign in with Google before connecting GitHub.'
      return
    }

    githubConnectionError.value = null
    isConnectingGitHub.value = true

    const provider = new GithubAuthProvider()
    provider.addScope(githubRepositoryScope)

    try {
      const result = await authorizeGitHubProvider(firebaseAuth.currentUser, provider)
      const credential = GithubAuthProvider.credentialFromResult(result)

      githubAccessToken.value = credential?.accessToken ?? null
      githubUsername.value = result.user.providerData.find(profile => profile.providerId === 'github.com')?.displayName ?? null
    } catch (connectionError) {
      githubConnectionError.value = connectionError instanceof Error ? connectionError.message : 'Unable to connect GitHub.'
    } finally {
      isConnectingGitHub.value = false
    }
  }

  /** Links GitHub as a new provider for this user, or re-authenticates it when it is already linked. */
  async function authorizeGitHubProvider (user: User, provider: GithubAuthProvider) {
    try {
      return await linkWithPopup(user, provider)
    } catch (linkError) {
      const errorCode = linkError && typeof linkError === 'object' && 'code' in linkError ? linkError.code : undefined

      if (errorCode === 'auth/provider-already-linked' || errorCode === 'auth/credential-already-in-use') {
        return reauthenticateWithPopup(user, provider)
      }

      throw linkError
    }
  }

  /** Connects a repository with its token, then populates its JavaScript filesystem without exposing credentials. */
  async function addRepository (input: GitRepositoryConnectionInput, accessToken: string) {
    const repository = await connectGitRepository(input, accessToken)
    const existingIndex = repositories.value.findIndex(current => current.id === repository.id)

    if (existingIndex === -1) {
      repositories.value.push(repository)
    } else {
      repositories.value[existingIndex] = repository
    }

    accessTokens.set(repository.id, accessToken)
    await refreshRepository(repository.id)

    return repository
  }

  /** Refreshes the visible JavaScript file tree for a repository connected in this browser session. */
  async function refreshRepository (repositoryId: string) {
    const repository = getRepository(repositoryId)
    const accessToken = accessTokens.get(repositoryId)

    if (!repository || accessToken === undefined) {
      return
    }

    isLoadingByRepository.value = { ...isLoadingByRepository.value, [repositoryId]: true }
    loadErrorsByRepository.value = { ...loadErrorsByRepository.value, [repositoryId]: null }

    try {
      filesByRepository.value = {
        ...filesByRepository.value,
        [repositoryId]: await fetchGitRepositoryFiles(repository, accessToken),
      }
    } catch (error) {
      loadErrorsByRepository.value = {
        ...loadErrorsByRepository.value,
        [repositoryId]: error instanceof Error ? error.message : 'Unable to retrieve repository scripts.',
      }
    } finally {
      isLoadingByRepository.value = { ...isLoadingByRepository.value, [repositoryId]: false }
    }
  }

  /** Creates a script directly in a connected remote repository and updates the local filesystem representation. */
  async function createScript (repositoryId: string, path: string, content: string) {
    const repository = getRepository(repositoryId)
    const accessToken = accessTokens.get(repositoryId)

    if (!repository || accessToken === undefined) {
      throw new Error('Connect the repository again before creating a script.')
    }

    await createGitRepositoryScript(repository, accessToken, path, content)
    const files = [...(filesByRepository.value[repositoryId] ?? []), { path }]
    files.sort((first, second) => first.path.localeCompare(second.path))
    filesByRepository.value = { ...filesByRepository.value, [repositoryId]: files }
  }

  /** Removes a repository connection and its in-memory credential without changing the remote repository. */
  function removeRepository (repositoryId: string) {
    repositories.value = repositories.value.filter(repository => repository.id !== repositoryId)
    accessTokens.delete(repositoryId)
    const { [repositoryId]: _removedFiles, ...remainingFiles } = filesByRepository.value
    const { [repositoryId]: _removedLoadingState, ...remainingLoadingState } = isLoadingByRepository.value
    const { [repositoryId]: _removedError, ...remainingErrors } = loadErrorsByRepository.value

    filesByRepository.value = remainingFiles
    isLoadingByRepository.value = remainingLoadingState
    loadErrorsByRepository.value = remainingErrors
  }

  /** Resolves a connected repository by its stable provider-qualified ID. */
  function getRepository (repositoryId: string) {
    return repositories.value.find(repository => repository.id === repositoryId)
  }

  return {
    addRepository,
    connectGitHubAccount,
    createScript,
    filesByRepository,
    githubAccessToken,
    githubConnectionError,
    githubUsername,
    isConnectingGitHub,
    isLoadingByRepository,
    loadErrorsByRepository,
    refreshRepository,
    removeRepository,
    repositories,
  }
})
