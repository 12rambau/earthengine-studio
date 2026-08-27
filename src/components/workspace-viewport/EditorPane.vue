<template>
  <workspace-sheet
    class="editor"
    :is-closable="false"
    :is-fullscreen="isFullscreen"
    title="Editor"
    @toggle-fullscreen="emit('toggle-fullscreen')"
  />
</template>

<script lang="ts" setup>
  /** Adapts the shared workspace sheet to represent the persistent editor area. */
  import WorkspaceSheet from './WorkspaceSheet.vue'

  /** Declares the presentation state owned by the workspace viewport. */
  defineProps<{
    /** Indicates that the editor currently occupies the fullscreen workspace view. */
    isFullscreen: boolean
  }>()

  /** Forwards editor fullscreen requests to the workspace viewport. */
  const emit = defineEmits<{
    /** Requests that the workspace toggle the editor fullscreen state. */
    'toggle-fullscreen': []
  }>()
</script>
