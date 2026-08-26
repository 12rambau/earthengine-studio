<template>
  <workspace-sheet
    class="workspace-pane secondary-sidebar"
    :is-detached="isDetached"
    :is-fullscreen="isFullscreen"
    title="Secondary sidebar"
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
