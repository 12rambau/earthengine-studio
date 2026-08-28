<template>
  <workspace-sheet
    class="panel"
    :is-fullscreen="isFullscreen"
    title="Bottom panel"
    @close="emit('close')"
    @toggle-fullscreen="emit('toggle-fullscreen')"
  >
    <template #header>
      <v-tabs
        v-model="activeTaskFilter"
        aria-label="Earth Engine task tabs"
        class="my-1"
        density="compact"
        height="24"
        hide-slider
      >
        <v-tab
          class="bottom-panel-tab"
          :class="{ 'bottom-panel-tab--inactive': activeTaskFilter !== 'import' }"
          density="compact"
          min-width="0"
          rounded="sm"
          size="x-small"
          slim
          text="Import"
          value="import"
          :variant="activeTaskFilter === 'import' ? 'tonal' : 'text'"
        />

        <v-tab
          class="ms-1 bottom-panel-tab"
          :class="{ 'bottom-panel-tab--inactive': activeTaskFilter !== 'export' }"
          density="compact"
          min-width="0"
          rounded="sm"
          size="x-small"
          slim
          text="Export"
          value="export"
          :variant="activeTaskFilter === 'export' ? 'tonal' : 'text'"
        />
      </v-tabs>

      <v-btn
        aria-label="Refresh Earth Engine tasks"
        class="ms-1 text-medium-emphasis"
        density="compact"
        :disabled="!accessToken || !selectedProject"
        icon="mdi-refresh"
        :loading="isLoading"
        size="small"
        title="Refresh Earth Engine tasks"
        variant="text"
        @click="loadTasks"
      />
    </template>

    <div
      v-if="!accessToken"
      class="ma-2 text-medium-emphasis"
    >
      Connect a Google account to view Earth Engine tasks.
    </div>

    <div
      v-else-if="!selectedProject"
      class="ma-2 text-medium-emphasis"
    >
      Select a Google Cloud project to view Earth Engine tasks.
    </div>

    <task-list
      v-else
      :cancelling-task-names="[...cancellingTaskNames]"
      :error="loadError"
      :filter="activeTaskFilter"
      :is-loading="isLoading"
      :tasks="filteredTasks"
      @cancel="cancelTask"
    />
  </workspace-sheet>
</template>

<script lang="ts" setup>
  /** Adapts the shared workspace sheet to present authenticated Earth Engine import and export operation lists. */
  import type { EarthEngineOperation, EarthEngineTaskFilter } from '@/services/earthEngineTasks'
  import { storeToRefs } from 'pinia'
  import { computed, onBeforeUnmount, ref, watch } from 'vue'
  import {
    cancelEarthEngineOperation,
    fetchEarthEngineOperations,
    isEarthEngineTaskActive,
    matchesEarthEngineTaskFilter,
  } from '@/services/earthEngineTasks'
  import { useGoogleAuthStore } from '@/stores/googleAuth'
  import { useGoogleProjectsStore } from '@/stores/googleProjects'
  import TaskList from './bottom-panel/TaskList.vue'
  /** Adapts the shared workspace sheet to represent the closable bottom panel. */
  import WorkspaceSheet from './WorkspaceSheet.vue'

  /** Declares the presentation state owned by the workspace viewport. */
  defineProps<{
    /** Indicates that the bottom panel currently occupies the fullscreen workspace view. */
    isFullscreen: boolean
  }>()

  /** Provides the OAuth session required by Earth Engine operation requests. */
  const { accessToken } = storeToRefs(useGoogleAuthStore())

  /** Provides the active project whose import and export operation history is displayed. */
  const { selectedProject } = storeToRefs(useGoogleProjectsStore())

  /** Identifies the import or export operation list currently displayed in the bottom panel. */
  const activeTaskFilter = ref<EarthEngineTaskFilter>('import')

  /** Limits each rendered task tab to the extension's compact default while the REST client scans more history. */
  const maximumVisibleTasks = 100

  /** Holds the bounded, paginated operation history for the currently selected project. */
  const operations = ref<EarthEngineOperation[]>([])

  /** Tracks whether a full task-list request is currently updating the visible operation lists. */
  const isLoading = ref(false)

  /** Exposes a recoverable task-list request failure without discarding the last successful list. */
  const loadError = ref<string | null>(null)

  /** Identifies task cancellations in progress so each corresponding row disables its action. */
  const cancellingTaskNames = ref(new Set<string>())

  /** Keeps only operations belonging to the tab currently selected by the user. */
  const filteredTasks = computed(() => {
    return operations.value
      .filter(operation => matchesEarthEngineTaskFilter(operation, activeTaskFilter.value))
      .slice(0, maximumVisibleTasks)
  })

  /** Invalidates outdated task-list and cancellation responses after the selected project or account changes. */
  let requestVersion = 0

  /** Schedules the extension-equivalent 15-second refresh only while active operations exist. */
  let refreshTimer: ReturnType<typeof setInterval> | undefined

  /** Stops automatic polling when the project changes, all tasks complete, or this panel unmounts. */
  function stopAutoRefresh () {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = undefined
    }
  }

  /** Starts or stops task polling according to whether any loaded operation remains active. */
  function updateAutoRefresh () {
    const hasActiveTasks = operations.value.some(operation => isEarthEngineTaskActive(operation))

    if (hasActiveTasks && !refreshTimer) {
      refreshTimer = setInterval(() => {
        void loadTasks()
      }, 15_000)
    } else if (!hasActiveTasks) {
      stopAutoRefresh()
    }
  }

  /** Retrieves the selected project's task history and retains only the latest successful result. */
  async function loadTasks () {
    const token = accessToken.value
    const project = selectedProject.value
    const currentRequestVersion = ++requestVersion

    if (!token || !project) {
      operations.value = []
      isLoading.value = false
      loadError.value = null
      stopAutoRefresh()
      return
    }

    isLoading.value = true
    loadError.value = null

    try {
      const tasks = await fetchEarthEngineOperations(token, project.id)

      if (currentRequestVersion === requestVersion) {
        operations.value = tasks
        updateAutoRefresh()
      }
    } catch (error) {
      if (currentRequestVersion === requestVersion) {
        loadError.value = error instanceof Error ? error.message : 'Unable to retrieve Earth Engine tasks.'
      }
    } finally {
      if (currentRequestVersion === requestVersion) {
        isLoading.value = false
      }
    }
  }

  /** Cancels an active task optimistically, then refreshes its server-reported state. */
  async function cancelTask (task: EarthEngineOperation) {
    const token = accessToken.value
    const currentRequestVersion = requestVersion

    if (!token || cancellingTaskNames.value.has(task.name)) {
      return
    }

    cancellingTaskNames.value = new Set(cancellingTaskNames.value).add(task.name)
    operations.value = operations.value.map(operation => {
      return operation.name === task.name
        ? { ...operation, metadata: { ...operation.metadata, state: 'CANCELLING' } }
        : operation
    })

    try {
      await cancelEarthEngineOperation(token, task.name)

      if (currentRequestVersion === requestVersion) {
        await loadTasks()
      }
    } catch (error) {
      if (currentRequestVersion === requestVersion) {
        loadError.value = error instanceof Error ? error.message : 'Unable to cancel this Earth Engine task.'
      }
    } finally {
      const remainingTaskNames = new Set(cancellingTaskNames.value)
      remainingTaskNames.delete(task.name)
      cancellingTaskNames.value = remainingTaskNames
    }
  }

  /** Resets operation state and retrieves fresh tasks when the browser OAuth session or project changes. */
  watch([accessToken, selectedProject], () => {
    requestVersion += 1
    cancellingTaskNames.value = new Set()
    loadError.value = null
    operations.value = []
    stopAutoRefresh()
    void loadTasks()
  }, { immediate: true })

  /** Releases the polling interval when this closable workspace panel is removed. */
  onBeforeUnmount(stopAutoRefresh)

  /** Forwards panel actions to the workspace viewport. */
  const emit = defineEmits<{
    /** Requests that the workspace hide the bottom panel. */
    'close': []

    /** Requests that the workspace toggle the bottom panel fullscreen state. */
    'toggle-fullscreen': []
  }>()
</script>

<style scoped>
  .bottom-panel-tab.v-tab--selected {
    color: rgb(var(--v-theme-primary));
  }

  .bottom-panel-tab--inactive {
    color: color-mix(in srgb, rgb(var(--v-theme-on-background)) calc(var(--v-medium-emphasis-opacity) * 100%), transparent);
  }
</style>
