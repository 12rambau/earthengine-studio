<template>
  <workspace-sheet
    class="panel"
    :is-fullscreen="isFullscreen"
    title="Bottom panel"
    @close="emit('close')"
    @toggle-fullscreen="emit('toggle-fullscreen')"
  />
</template>

<script lang="ts" setup>
  /** Adapts the shared workspace sheet to represent the closable bottom panel. */
  import WorkspaceSheet from './WorkspaceSheet.vue'

  /** Declares the presentation state owned by the workspace viewport. */
  defineProps<{
    /** Indicates that the bottom panel currently occupies the fullscreen workspace view. */
    isFullscreen: boolean
  }>()

  /** Forwards panel actions to the workspace viewport. */
  const emit = defineEmits<{
    /** Requests that the workspace hide the bottom panel. */
    'close': []

    /** Requests that the workspace toggle the bottom panel fullscreen state. */
    'toggle-fullscreen': []
  }>()
</script>
