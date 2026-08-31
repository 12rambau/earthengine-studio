import type {
  GitRepository,
  GitRepositoryConnectionInput,
  GitRepositoryFile,
} from '@/services/gitRepositories'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  connectGitRepository,
  createGitRepositoryScript,
  fetchGitRepositoryFiles,
} from '@/services/gitRepositories'

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
    createScript,
    filesByRepository,
    isLoadingByRepository,
    loadErrorsByRepository,
    refreshRepository,
    removeRepository,
    repositories,
  }
})
