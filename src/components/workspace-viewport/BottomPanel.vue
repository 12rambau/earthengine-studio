<template>
  <workspace-sheet
    class="bottom-panel"
    :is-fullscreen="isFullscreen"
    title="Bottom panel"
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
