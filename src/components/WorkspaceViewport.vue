<template>
  <section
    ref="workspaceViewportElement"
    aria-label="Workspace viewport"
    class="workspace-viewport"
    :class="{
      'is-resizing': activeResize !== null,
      'workspace-viewport-fullscreen': fullscreenPanel !== null,
    }"
    :style="workspaceGridStyle"
  >
    <primary-sidebar
      v-if="layout.primarySidebarVisible"
      :is-fullscreen="fullscreenPanel === 'primary-sidebar'"
      @close="hidePanel('primary-sidebar')"
      @toggle-fullscreen="toggleFullscreen('primary-sidebar')"
    />

    <secondary-sidebar
      v-if="layout.secondarySidebarVisible"
      :is-fullscreen="fullscreenPanel === 'secondary-sidebar'"
      @close="hidePanel('secondary-sidebar')"
      @toggle-fullscreen="toggleFullscreen('secondary-sidebar')"
    />

    <editor-pane
      :is-fullscreen="fullscreenPanel === 'editor'"
      @toggle-fullscreen="toggleFullscreen('editor')"
    />

    <bottom-panel
      v-if="layout.panelVisible"
      :is-fullscreen="fullscreenPanel === 'bottom-panel'"
      @close="hidePanel('bottom-panel')"
      @toggle-fullscreen="toggleFullscreen('bottom-panel')"
    />

    <div
      v-for="handle in resizeHandles"
      :key="handle.id"
      :aria-hidden="isKeyboardResizeHandle(handle) ? undefined : 'true'"
      :aria-label="isKeyboardResizeHandle(handle) ? handle.label : undefined"
      :aria-orientation="getResizeHandleOrientation(handle)"
      :aria-valuemax="getResizeHandleMaximum(handle)"
      :aria-valuemin="getResizeHandleMinimum(handle)"
      :aria-valuenow="getResizeHandleValue(handle)"
      :class="[
        'workspace-resize-handle',
        `workspace-resize-handle-${handle.orientation}`,
        { 'is-resizing': isResizeHandleActive(handle) },
      ]"
      :data-resize-handle="handle.id"
      :role="isKeyboardResizeHandle(handle) ? 'separator' : undefined"
      :style="getResizeHandleStyle(handle)"
      :tabindex="isKeyboardResizeHandle(handle) ? 0 : -1"
      @keydown="resizeWithKeyboard($event, handle)"
      @pointerdown="startResize($event, handle)"
    />
  </section>
</template>

<script lang="ts" setup>
  import type { WorkspacePanelId } from './workspace-viewport/workspacePanel'
  import { storeToRefs } from 'pinia'
  import { computed, ref } from 'vue'
  import { useUserPreferencesStore } from '@/stores/userPreferences'
  import BottomPanel from './workspace-viewport/BottomPanel.vue'
  import EditorPane from './workspace-viewport/EditorPane.vue'
  import PrimarySidebar from './workspace-viewport/PrimarySidebar.vue'
  import SecondarySidebar from './workspace-viewport/SecondarySidebar.vue'
  import { useWorkspaceResize } from './workspace-viewport/useWorkspaceResize'

  const userPreferencesStore = useUserPreferencesStore()
  const { layout } = storeToRefs(userPreferencesStore)
  const fullscreenPanel = ref<WorkspacePanelId | null>(null)

  const isResizeEnabled = computed(() => {
    return fullscreenPanel.value === null
  })

  const {
    activeResize,
    getResizeHandleMaximum,
    getResizeHandleMinimum,
    getResizeHandleOrientation,
    getResizeHandleStyle,
    getResizeHandleValue,
    isKeyboardResizeHandle,
    isResizeHandleActive,
    resizeHandles,
    resizeWithKeyboard,
    startResize,
    workspaceGridStyle,
    workspaceViewportElement,
  } = useWorkspaceResize({
    isResizeEnabled,
    layout,
  })

  function toggleFullscreen (panelId: WorkspacePanelId) {
    fullscreenPanel.value = fullscreenPanel.value === panelId ? null : panelId
  }

  function hidePanel (panelId: WorkspacePanelId) {
    if (panelId === 'editor') {
      return
    }

    if (fullscreenPanel.value === panelId) {
      fullscreenPanel.value = null
    }

    if (panelId === 'primary-sidebar') {
      userPreferencesStore.setPrimarySidebarVisibility(false)
      return
    }

    if (panelId === 'secondary-sidebar') {
      userPreferencesStore.setSecondarySidebarVisibility(false)
      return
    }

    if (panelId === 'bottom-panel') {
      userPreferencesStore.setPanelVisibility(false)
    }
  }

</script>

<style scoped>
  .workspace-viewport {
    background: rgb(var(--v-theme-workspace-background));
    block-size: 100%;
    box-sizing: border-box;
    display: grid;
    column-gap: 8px;
    grid-template-areas: var(--workspace-grid-areas);
    grid-template-columns: var(--workspace-grid-columns);
    grid-template-rows: var(--workspace-grid-rows);
    min-block-size: 0;
    overflow: hidden;
    padding: 0 8px 8px;
    position: relative;
    row-gap: var(--workspace-grid-row-gap);
  }

  .workspace-viewport.is-resizing {
    user-select: none;
  }

  .workspace-resize-handle {
    position: absolute;
    touch-action: none;
    z-index: 1;
  }

  .workspace-resize-handle::before,
  .workspace-resize-handle::after {
    background: rgb(var(--v-theme-primary));
    content: '';
    opacity: 0;
    pointer-events: none;
    position: absolute;
  }

  .workspace-resize-handle-vertical {
    cursor: col-resize;
  }

  .workspace-resize-handle-horizontal {
    cursor: row-resize;
  }

  .workspace-resize-handle-corner {
    cursor: crosshair;
    z-index: 2;
  }

  .workspace-resize-handle-vertical::before,
  .workspace-resize-handle-corner::before {
    inset-block: 0;
    inset-inline: 3px;
  }

  .workspace-resize-handle-horizontal::before,
  .workspace-resize-handle-corner::after {
    inset-block: 3px;
    inset-inline: 0;
  }

  .workspace-resize-handle.is-resizing::before,
  .workspace-resize-handle.is-resizing::after,
  .workspace-resize-handle:focus-visible::before,
  .workspace-resize-handle:focus-visible::after {
    opacity: 1;
  }

  .primary-sidebar {
    grid-area: primary;
  }

  .secondary-sidebar {
    grid-area: secondary;
  }

  .editor-pane {
    grid-area: editor;
  }

  .bottom-panel {
    grid-area: panel;
  }

  .workspace-viewport-fullscreen {
    column-gap: 0;
    grid-template-areas: 'fullscreen';
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr);
    padding: 0;
    row-gap: 0;
  }

  .workspace-viewport-fullscreen :deep(.workspace-sheet) {
    display: none;
  }

  .workspace-viewport-fullscreen :deep(.workspace-sheet.is-fullscreen) {
    display: grid;
    grid-area: fullscreen;
  }

  @media (max-width: 840px) {
    .workspace-resize-handle {
      display: none;
    }

    .workspace-viewport {
      grid-template-areas: var(--workspace-grid-areas-compact);
      grid-template-columns: var(--workspace-grid-columns-compact);
      grid-template-rows: var(--workspace-grid-rows-compact);
    }

    .workspace-viewport-fullscreen {
      grid-template-areas: 'fullscreen';
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: minmax(0, 1fr);
    }
  }
</style>
