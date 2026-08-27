<template>
  <workspace-sheet
    class="workspace-pane primary-sidebar"
    :is-fullscreen="isFullscreen"
    title="Primary sidebar"
    @close="emit('close')"
    @toggle-fullscreen="emit('toggle-fullscreen')"
  />
</template>

<script lang="ts" setup>
  import WorkspaceSheet from './WorkspaceSheet.vue'

  defineProps<{
    isFullscreen: boolean
  }>()

  const emit = defineEmits<{
    'close': []
    'toggle-fullscreen': []
  }>()
</script>
