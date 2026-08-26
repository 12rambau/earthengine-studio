<template>
  <section
    :aria-label="title"
    class="workspace-sheet"
    :class="{ 'is-fullscreen': isFullscreen }"
  >
    <header class="workspace-sheet-header">
      <h2>{{ title }}</h2>

      <div class="workspace-sheet-actions">
        <v-btn
          v-if="!isDetached"
          :aria-label="isFullscreen ? `Restore ${title}` : `Fullscreen ${title}`"
          density="compact"
          :icon="isFullscreen ? 'mdi-arrow-collapse-all' : 'mdi-arrow-expand-all'"
          :title="isFullscreen ? `Restore ${title}` : `Fullscreen ${title}`"
          variant="text"
          @click="emit('toggle-fullscreen')"
        />

        <v-btn
          v-if="!isDetached"
          :aria-label="`Open ${title} in new window`"
          density="compact"
          icon="mdi-open-in-new"
          :title="`Open ${title} in new window`"
          variant="text"
          @click="emit('open-in-new-window')"
        />

        <v-btn
          v-if="isClosable !== false && !isDetached"
          :aria-label="`Hide ${title}`"
          density="compact"
          icon="mdi-close"
          :title="`Hide ${title}`"
          variant="text"
          @click="emit('close')"
        />
      </div>
    </header>

    <div class="workspace-sheet-content">
      <slot />
    </div>
  </section>
</template>

<script lang="ts" setup>
  withDefaults(defineProps<{
    isDetached?: boolean
    isClosable?: boolean
    isFullscreen: boolean
    title: string
  }>(), {
    isClosable: true,
  })

  const emit = defineEmits<{
    'close': []
    'open-in-new-window': []
    'toggle-fullscreen': []
  }>()
</script>

<style scoped>
  .workspace-sheet {
    background: rgb(var(--v-theme-surface));
    border: 1px solid rgba(var(--v-theme-on-surface), 0.14);
    border-radius: 8px;
    display: grid;
    grid-template-rows: 40px minmax(0, 1fr);
    min-block-size: 0;
    min-inline-size: 0;
    overflow: hidden;
  }

  .workspace-sheet-header {
    align-items: center;
    border-block-end: 1px solid rgba(var(--v-theme-on-surface), 0.14);
    display: flex;
    justify-content: space-between;
    min-inline-size: 0;
    padding-inline-start: 12px;
  }

  h2 {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .workspace-sheet-actions {
    align-items: center;
    display: flex;
    flex: none;
    gap: 2px;
    padding-inline-end: 4px;
  }

  .workspace-sheet-content {
    min-block-size: 0;
    overflow: auto;
  }
</style>
