<template>
  <v-progress-linear
    v-if="isLoading"
    color="primary"
    indeterminate
  />

  <v-list
    v-if="tasks.length > 0"
    :aria-label="`${taskLabel} tasks`"
    bg-color="transparent"
    class="task-list"
    lines="one"
  >
    <v-list-item
      v-for="task in tasks"
      :key="task.name"
      class="task-list-item"
    >
      <template #prepend>
        <v-icon
          :class="{ 'task-icon--active': isEarthEngineTaskActive(task) }"
          :color="getTaskStateColor(task)"
          :icon="getTaskIcon(task)"
          size="small"
        />
      </template>

      <template #title>
        <v-tooltip
          content-class="task-id-tooltip"
          location="top"
          :open-delay="200"
          :text="task.name"
        >
          <template #activator="{ props: tooltipProps }">
            <span
              v-bind="tooltipProps"
              class="task-list-title"
            >
              {{ getEarthEngineTaskDescription(task) }}
            </span>
          </template>
        </v-tooltip>
      </template>

      <template #append>
        <span class="task-list-state">{{ getEarthEngineTaskState(task) }}</span>

        <span class="task-list-elapsed">{{ getEarthEngineTaskElapsedTime(task) }}</span>

        <v-btn
          v-if="isEarthEngineTaskCancellable(task)"
          :aria-label="`Cancel ${getEarthEngineTaskDescription(task)}`"
          class="task-list-cancel"
          color="error"
          density="compact"
          :disabled="cancellingTaskNames.includes(task.name)"
          icon="mdi-cancel"
          :loading="cancellingTaskNames.includes(task.name)"
          size="x-small"
          :title="`Cancel ${getEarthEngineTaskDescription(task)}`"
          variant="text"
          @click.stop="emit('cancel', task)"
        />
      </template>
    </v-list-item>
  </v-list>

  <div
    v-else-if="error"
    class="ma-2 text-error"
  >
    {{ error }}
  </div>

  <div
    v-else-if="isLoading"
    class="ma-2 text-medium-emphasis"
  >
    Loading {{ taskLabel.toLocaleLowerCase() }} tasks.
  </div>

  <div
    v-else
    class="ma-2 text-medium-emphasis"
  >
    No {{ taskLabel.toLocaleLowerCase() }} tasks.
  </div>
</template>

<script lang="ts" setup>
  /** Renders one compact, actionable list of Earth Engine import or export operations. */
  import type { EarthEngineOperation, EarthEngineTaskFilter } from '@/services/earthEngineTasks'
  import { computed } from 'vue'
  import {
    getEarthEngineTaskDescription,
    getEarthEngineTaskElapsedTime,
    getEarthEngineTaskKind,
    getEarthEngineTaskState,
    isEarthEngineTaskActive,
    isEarthEngineTaskCancellable,
  } from '@/services/earthEngineTasks'

  /** Receives the task subset and request state represented by this bottom-panel tab. */
  const props = defineProps<{
    /** Identifies operation type used for empty and loading state labels. */
    filter: EarthEngineTaskFilter

    /** Contains task names whose cancellation request is currently in flight. */
    cancellingTaskNames: string[]

    /** Exposes the latest failed task-list request without hiding already loaded tasks. */
    error: string | null

    /** Indicates that a task-list request is in progress. */
    isLoading: boolean

    /** Supplies the already filtered operations shown in this tab. */
    tasks: EarthEngineOperation[]
  }>()

  /** Requests cancellation of a pending or running operation from the owning bottom panel. */
  const emit = defineEmits<{
    /** Supplies the selected active operation for cancellation. */
    cancel: [task: EarthEngineOperation]
  }>()

  /** Uses the tab's task filter to label visible, empty, and loading list states. */
  const taskLabel = computed(() => props.filter === 'import' ? 'Import' : 'Export')

  /** Maps each Earth Engine task kind to the same semantic icon family as the extension task panel. */
  function getTaskIcon (task: EarthEngineOperation) {
    switch (getEarthEngineTaskKind(task)) {
      case 'classifier-export': {
        return 'mdi-chart-tree'
      }
      case 'image-export': {
        return 'mdi-image'
      }
      case 'map-export': {
        return 'mdi-map-outline'
      }
      case 'table-export': {
        return 'mdi-table'
      }
      case 'video-export': {
        return 'mdi-video-box'
      }
      case 'import': {
        return 'mdi-database-import-outline'
      }
      case 'export': {
        return 'mdi-earth-export'
      }
      default: {
        return 'mdi-earth'
      }
    }
  }

  /** Maps the server-reported lifecycle state to the task-panel status color. */
  function getTaskStateColor (task: EarthEngineOperation) {
    switch (getEarthEngineTaskState(task)) {
      case 'PENDING': {
        return '#cca700'
      }
      case 'RUNNING': {
        return '#2196f3'
      }
      case 'SUCCEEDED': {
        return '#43a047'
      }
      case 'FAILED': {
        return '#e53935'
      }
      default: {
        return 'medium-emphasis'
      }
    }
  }
</script>

<style scoped>
  .task-list {
    padding-block: 0;
  }

  .task-list-item {
    min-inline-size: 0;
  }

  .task-list-title {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .task-list-state {
    color: rgb(var(--v-theme-on-surface) / var(--v-medium-emphasis-opacity));
    font-size: 10px;
    inline-size: 72px;
    text-align: end;
  }

  .task-list-elapsed {
    color: rgb(var(--v-theme-on-surface) / var(--v-medium-emphasis-opacity));
    font-family: 'Roboto Mono', monospace;
    font-size: 10px;
    inline-size: 32px;
    text-align: end;
  }

  @keyframes task-icon-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .task-icon--active {
    animation: task-icon-spin 800ms linear infinite;
  }

  :global(.task-id-tooltip) {
    font-family: 'Roboto Mono', monospace;
    font-size: 10px;
    line-height: 14px;
    padding: 0 4px;
  }
</style>
