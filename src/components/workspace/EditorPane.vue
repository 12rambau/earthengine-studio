<template>
  <workspace-sheet
    class="editor-pane"
    :is-closable="false"
    :is-detached="isDetached"
    :is-fullscreen="isFullscreen"
    title="Editor"
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
    'open-in-new-window': []
    'toggle-fullscreen': []
  }>()
</script>
