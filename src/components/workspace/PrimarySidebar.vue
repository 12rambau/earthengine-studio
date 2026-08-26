<template>
  <workspace-sheet
    class="workspace-pane primary-sidebar"
    :is-detached="isDetached"
    :is-fullscreen="isFullscreen"
    title="Primary sidebar"
    @close="emit('close')"
    @open-in-new-window="emit('open-in-new-window')"
    @toggle-fullscreen="emit('toggle-fullscreen')"
  />
</template>

<script lang="ts" setup>
  import WorkspaceSheet from './WorkspaceSheet.vue'

  defineProps<{
    isDetached?: boolean
    isFullscreen: boolean
  }>()

  const emit = defineEmits<{
    'close': []
    'open-in-new-window': []
    'toggle-fullscreen': []
  }>()
</script>
