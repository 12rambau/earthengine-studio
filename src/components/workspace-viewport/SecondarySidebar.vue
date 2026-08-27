<template>
  <workspace-sheet
    class="secondary"
    :is-fullscreen="isFullscreen"
    title="Secondary sidebar"
    @close="emit('close')"
    @toggle-fullscreen="emit('toggle-fullscreen')"
  />
</template>

<script lang="ts" setup>
  /** Adapts the shared workspace sheet to represent the closable secondary sidebar. */
  import WorkspaceSheet from './WorkspaceSheet.vue'

  /** Declares the presentation state owned by the workspace viewport. */
  defineProps<{
    /** Indicates that the secondary sidebar currently occupies the fullscreen workspace view. */
    isFullscreen: boolean
  }>()

  /** Forwards secondary sidebar actions to the workspace viewport. */
  const emit = defineEmits<{
    /** Requests that the workspace hide the secondary sidebar. */
    'close': []

    /** Requests that the workspace toggle the secondary sidebar fullscreen state. */
    'toggle-fullscreen': []
  }>()
</script>
