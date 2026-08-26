<template>
  <section
    aria-label="Workspace viewport"
    class="workspace-viewport"
    :class="{ 'workspace-viewport-fullscreen': fullscreenPanel !== null }"
    :style="workspaceGridStyle"
  >
    <primary-sidebar
      v-if="layout.primarySidebarVisible && !isPanelDetached('primary-sidebar')"
      :is-detached="props.popoutPanel === 'primary-sidebar'"
      :is-fullscreen="fullscreenPanel === 'primary-sidebar'"
      @close="hidePanel('primary-sidebar')"
      @open-in-new-window="openPanelInNewWindow('primary-sidebar')"
      @toggle-fullscreen="toggleFullscreen('primary-sidebar')"
    />

    <secondary-sidebar
      v-if="layout.secondarySidebarVisible && !isPanelDetached('secondary-sidebar')"
      :is-detached="props.popoutPanel === 'secondary-sidebar'"
      :is-fullscreen="fullscreenPanel === 'secondary-sidebar'"
      @close="hidePanel('secondary-sidebar')"
      @open-in-new-window="openPanelInNewWindow('secondary-sidebar')"
      @toggle-fullscreen="toggleFullscreen('secondary-sidebar')"
    />

    <editor-pane
      v-if="!isPanelDetached('editor')"
      :is-detached="props.popoutPanel === 'editor'"
      :is-fullscreen="fullscreenPanel === 'editor'"
      @open-in-new-window="openPanelInNewWindow('editor')"
      @toggle-fullscreen="toggleFullscreen('editor')"
    />

    <bottom-panel
      v-if="layout.panelVisible && !isPanelDetached('bottom-panel')"
      :is-detached="props.popoutPanel === 'bottom-panel'"
      :is-fullscreen="fullscreenPanel === 'bottom-panel'"
      @close="hidePanel('bottom-panel')"
      @open-in-new-window="openPanelInNewWindow('bottom-panel')"
      @toggle-fullscreen="toggleFullscreen('bottom-panel')"
    />
  </section>
</template>

<script lang="ts" setup>
  import type { WorkspacePanelId } from './workspacePanel'
  import { storeToRefs } from 'pinia'
  import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
  import { useUserPreferencesStore } from '@/stores/userPreferences'
  import BottomPanel from './BottomPanel.vue'
  import EditorPane from './EditorPane.vue'
  import PrimarySidebar from './PrimarySidebar.vue'
  import SecondarySidebar from './SecondarySidebar.vue'
  import { getWorkspaceGridLayout } from './workspaceLayout'

  const props = defineProps<{
    popoutPanel?: WorkspacePanelId | null
  }>()

  const userPreferencesStore = useUserPreferencesStore()
  const { layout } = storeToRefs(userPreferencesStore)
  const detachedPanels = ref<WorkspacePanelId[]>([])
  const fullscreenPanel = ref<WorkspacePanelId | null>(props.popoutPanel ?? null)
  const hasNotifiedPanelAttachment = ref(false)

  const effectiveLayoutPreferences = computed(() => {
    return {
      ...layout.value,
      panelVisible: layout.value.panelVisible && !isPanelDetached('bottom-panel'),
      primarySidebarVisible: layout.value.primarySidebarVisible && !isPanelDetached('primary-sidebar'),
      secondarySidebarVisible: layout.value.secondarySidebarVisible && !isPanelDetached('secondary-sidebar'),
    }
  })

  const workspaceGridStyle = computed(() => {
    const isEditorVisible = !isPanelDetached('editor')
    const desktopGridLayout = getWorkspaceGridLayout(
      effectiveLayoutPreferences.value,
      'desktop',
      isEditorVisible,
    )
    const compactGridLayout = getWorkspaceGridLayout(
      effectiveLayoutPreferences.value,
      'compact',
      isEditorVisible,
    )

    return {
      '--workspace-grid-areas': desktopGridLayout.areas,
      '--workspace-grid-areas-compact': compactGridLayout.areas,
      '--workspace-grid-columns': desktopGridLayout.columns,
      '--workspace-grid-columns-compact': compactGridLayout.columns,
      '--workspace-grid-row-gap': desktopGridLayout.rowGap,
      '--workspace-grid-rows': desktopGridLayout.rows,
      '--workspace-grid-rows-compact': compactGridLayout.rows,
    }
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

  function openPanelInNewWindow (panelId: WorkspacePanelId) {
    const panelUrl = new URL(window.location.href)

    panelUrl.searchParams.set('panel', panelId)
    const panelWindow = window.open(panelUrl.toString(), '_blank', 'popup,width=960,height=720')

    if (!panelWindow) {
      return
    }

    detachedPanels.value = [...detachedPanels.value, panelId]

    if (fullscreenPanel.value === panelId) {
      fullscreenPanel.value = null
    }
  }

  function notifyPanelAttachment (panelId: WorkspacePanelId) {
    if (!window.opener || hasNotifiedPanelAttachment.value) {
      return
    }

    hasNotifiedPanelAttachment.value = true
    window.opener.postMessage({ panelId, type: 'workspace-panel-attached' }, window.location.origin)
  }

  function handlePopoutPageHide () {
    if (props.popoutPanel) {
      notifyPanelAttachment(props.popoutPanel)
    }
  }

  function isPanelDetached (panelId: WorkspacePanelId) {
    return detachedPanels.value.includes(panelId)
  }

  function handlePanelAttachment (event: MessageEvent) {
    if (event.origin !== window.location.origin || !event.data || typeof event.data !== 'object') {
      return
    }

    const message = event.data as { panelId?: unknown, type?: unknown }

    if (message.type !== 'workspace-panel-attached' || typeof message.panelId !== 'string') {
      return
    }

    detachedPanels.value = detachedPanels.value.filter(panelId => panelId !== message.panelId)
  }

  onMounted(() => {
    window.addEventListener('message', handlePanelAttachment)
    window.addEventListener('pagehide', handlePopoutPageHide)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('message', handlePanelAttachment)
    window.removeEventListener('pagehide', handlePopoutPageHide)
  })
</script>

<style scoped>
  .workspace-viewport {
    --workspace-border: rgba(var(--v-theme-on-surface), 0.14);

    background: rgb(var(--v-theme-background));
    block-size: 100%;
    box-sizing: border-box;
    display: grid;
    column-gap: 8px;
    grid-template-areas: var(--workspace-grid-areas);
    grid-template-columns: var(--workspace-grid-columns);
    grid-template-rows: var(--workspace-grid-rows);
    min-block-size: 0;
    overflow: hidden;
    padding: 8px;
    row-gap: var(--workspace-grid-row-gap);
  }

  .primary-sidebar {
    grid-area: primary;
  }

  .secondary-sidebar {
    grid-area: secondary;
  }

  .editor-pane {
    background: rgb(var(--v-theme-background));
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
