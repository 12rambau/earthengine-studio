import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  fetchGoogleCloudProjects,
  type GoogleCloudProject,
} from '@/services/googleProjects'

/** Describes the visible loading state of the user's Google Cloud project list. */
export type GoogleProjectStatus = 'error' | 'idle' | 'loading' | 'ready'

/** Shares the current account's available Google Cloud projects and active project across the workspace. */
export const useGoogleProjectsStore = defineStore('google-projects', () => {
  /** Holds all projects returned across the Cloud Resource Manager result pages. */
  const projects = ref<GoogleCloudProject[]>([])

  /** Keeps the project used by future Earth Engine and Google Cloud service calls. */
  const selectedProject = ref<GoogleCloudProject | null>(null)

  /** Exposes a recoverable reason why the connected account's projects could not be listed. */
  const error = ref<string | null>(null)

  /** Tracks the lifecycle of the current Cloud Resource Manager request. */
  const status = ref<GoogleProjectStatus>('idle')

  /** Distinguishes stale asynchronous results after an account token changes. */
  let loadVersion = 0

  /** Indicates that the selector is currently loading projects for a connected account. */
  const isLoading = computed(() => status.value === 'loading')

  /** Clears the selected project and invalidates work associated with a previous account token. */
  function clearProjects () {
    loadVersion += 1
    error.value = null
    projects.value = []
    selectedProject.value = null
    status.value = 'idle'
  }

  /** Loads and selects the first alphabetically displayed project available to the account token. */
  async function loadProjects (accessToken: string) {
    const requestVersion = ++loadVersion

    error.value = null
    projects.value = []
    selectedProject.value = null
    status.value = 'loading'

    try {
      const availableProjects = await fetchGoogleCloudProjects(accessToken)

      if (requestVersion !== loadVersion) {
        return
      }

      projects.value = availableProjects
      selectedProject.value = availableProjects[0] ?? null
      status.value = 'ready'
    } catch (loadError) {
      if (requestVersion !== loadVersion) {
        return
      }

      error.value = loadError instanceof Error ? loadError.message : 'Unable to retrieve Google Cloud projects.'
      status.value = 'error'
    }
  }

  /** Changes the project used by the workspace to a project from the active account's list. */
  function selectProject (project: GoogleCloudProject) {
    selectedProject.value = project
  }

  return {
    clearProjects,
    error,
    isLoading,
    loadProjects,
    projects,
    selectedProject,
    selectProject,
    status,
  }
})
