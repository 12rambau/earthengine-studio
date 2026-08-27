<template>
  <workspace-sheet
    class="editor-pane"
    :is-closable="false"
    :is-fullscreen="isFullscreen"
    title="Editor"
    @toggle-fullscreen="emit('toggle-fullscreen')"
  />
</template>

<script lang="ts" setup>
  import WorkspaceSheet from './WorkspaceSheet.vue'

  defineProps<{
    isFullscreen: boolean
  }>()

  const emit = defineEmits<{
    'toggle-fullscreen': []
  }>()
</script>
