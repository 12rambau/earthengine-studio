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
      :is-fullscreen="fullscreenPanel === 'primary'"
      @close="hidePanel('primary')"
      @toggle-fullscreen="toggleFullscreen('primary')"
    />

    <secondary-sidebar
      v-if="layout.secondarySidebarVisible"
      :is-fullscreen="fullscreenPanel === 'secondary'"
      @close="hidePanel('secondary')"
      @toggle-fullscreen="toggleFullscreen('secondary')"
    />

    <editor-pane
      :is-fullscreen="fullscreenPanel === 'editor'"
      @toggle-fullscreen="toggleFullscreen('editor')"
    />

    <bottom-panel
      v-if="layout.panelVisible"
      :is-fullscreen="fullscreenPanel === 'panel'"
      @close="hidePanel('panel')"
      @toggle-fullscreen="toggleFullscreen('panel')"
    />

    <div
      v-for="handle in resizeHandles"
      :key="handle.id"
      :aria-hidden="handle.orientation === 'corner' ? 'true' : undefined"
      :aria-label="handle.orientation === 'corner' ? undefined : handle.label"
      :aria-orientation="handle.orientation === 'corner' ? undefined : handle.orientation"
      :aria-valuemax="handle.maximum"
      :aria-valuemin="handle.minimum"
      :aria-valuenow="handle.orientation === 'corner' ? undefined : workspaceSizeValues[handle.area]"
      :class="[
        'workspace-resize-handle',
        `workspace-resize-handle-${handle.orientation}`,
        { 'is-resizing': isResizeHandleActive(handle) },
      ]"
      :data-resize-handle="handle.id"
      :role="handle.orientation === 'corner' ? undefined : 'separator'"
      :style="{
        height: `${handle.height}px`,
        left: `${handle.left}px`,
        top: `${handle.top}px`,
        width: `${handle.width}px`,
      }"
      :tabindex="handle.orientation === 'corner' ? -1 : 0"
      @keydown="resizeWithKeyboard($event, handle)"
      @pointerdown="startResize($event, handle)"
    />
  </section>
</template>

<script lang="ts" setup>
  /** Coordinates the workspace areas, fullscreen state, and user-driven resizing. */
  import type { WorkspaceArea } from './workspace-viewport/workspaceLayout'
  import { storeToRefs } from 'pinia'
  import { computed, ref } from 'vue'
  import { useUserPreferencesStore } from '@/stores/userPreferences'
  import BottomPanel from './workspace-viewport/BottomPanel.vue'
  import EditorPane from './workspace-viewport/EditorPane.vue'
  import PrimarySidebar from './workspace-viewport/PrimarySidebar.vue'
  import SecondarySidebar from './workspace-viewport/SecondarySidebar.vue'
  import { useWorkspaceResize } from './workspace-viewport/useWorkspaceResize'

  /** Restricts closing actions to workspace areas that may be hidden. */
  type CloseableWorkspaceArea = Exclude<WorkspaceArea, 'editor'>

  /** Persists the user's workspace layout and dimensions. */
  const userPreferencesStore = useUserPreferencesStore()

  /** Keeps the rendered workspace synchronized with persisted layout preferences. */
  const { layout } = storeToRefs(userPreferencesStore)

  /** Identifies the area temporarily expanded to occupy the workspace. */
  const fullscreenPanel = ref<WorkspaceArea | null>(null)

  /** Maps each closable area to the preference action that controls its visibility. */
  const setAreaVisibility = {
    panel: userPreferencesStore.setPanelVisibility,
    primary: userPreferencesStore.setPrimarySidebarVisibility,
    secondary: userPreferencesStore.setSecondarySidebarVisibility,
  } satisfies Record<CloseableWorkspaceArea, (isVisible: boolean) => void>

  /** Prevents resize handles from remaining interactive while an area is fullscreen. */
  const isResizeEnabled = computed(() => {
    return fullscreenPanel.value === null
  })

  /** Supplies the grid bindings and input handlers for workspace resizing. */
  const {
    activeResize,
    isResizeHandleActive,
    resizeHandles,
    resizeWithKeyboard,
    startResize,
    workspaceGridStyle,
    workspaceSizeValues,
    workspaceViewportElement,
  } = useWorkspaceResize({
    isResizeEnabled,
    layout,
  })

  /** Expands an area or restores the regular grid when that area is already expanded. */
  function toggleFullscreen (area: WorkspaceArea) {
    fullscreenPanel.value = fullscreenPanel.value === area ? null : area
  }

  /** Hides a closable area and restores the grid if that area was fullscreen. */
  function hidePanel (area: CloseableWorkspaceArea) {
    fullscreenPanel.value = fullscreenPanel.value === area ? null : fullscreenPanel.value
    setAreaVisibility[area](false)
  }

</script>

<style lang="scss" scoped>
  @use 'vuetify/settings' as vuetify;

  .workspace-viewport {
    background: rgb(var(--v-theme-workspace-background));
    block-size: 100%;
    display: grid;
    gap: vuetify.$spacer;
    grid-template-areas: var(--workspace-grid-areas);
    grid-template-columns: var(--workspace-grid-columns);
    grid-template-rows: var(--workspace-grid-rows);
    padding: 0 vuetify.$spacer * 2 vuetify.$spacer * 2;
    position: relative;
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
    cursor: ew-resize;
  }

  .workspace-resize-handle-horizontal {
    cursor: ns-resize;
  }

  .workspace-resize-handle-corner {
    cursor: move;
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

  .primary {
    grid-area: primary;
  }

  .secondary {
    grid-area: secondary;
  }

  .editor {
    grid-area: editor;
  }

  .panel {
    grid-area: panel;
  }

  .workspace-viewport-fullscreen {
    gap: 0;
    grid-template-areas: 'fullscreen';
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr);
    padding: 0;
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
  }
</style>
