<template>
  <workspace-sheet
    class="primary"
    :is-fullscreen="isFullscreen"
    title="Primary sidebar"
    @close="emit('close')"
    @toggle-fullscreen="emit('toggle-fullscreen')"
  />
</template>

<script lang="ts" setup>
  /** Adapts the shared workspace sheet to represent the closable primary sidebar. */
  import WorkspaceSheet from './WorkspaceSheet.vue'

  /** Declares the presentation state owned by the workspace viewport. */
  defineProps<{
    /** Indicates that the primary sidebar currently occupies the fullscreen workspace view. */
    isFullscreen: boolean
  }>()

  /** Forwards primary sidebar actions to the workspace viewport. */
  const emit = defineEmits<{
    /** Requests that the workspace hide the primary sidebar. */
    'close': []

    /** Requests that the workspace toggle the primary sidebar fullscreen state. */
    'toggle-fullscreen': []
  }>()
</script>
