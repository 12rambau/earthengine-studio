<template>
  <workspace-sheet
    class="workspace-pane secondary-sidebar"
    :is-fullscreen="isFullscreen"
    title="Secondary sidebar"
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
