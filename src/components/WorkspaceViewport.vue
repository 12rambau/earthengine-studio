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

    <div
      v-for="handle in resizeHandles"
      :key="handle.id"
      :aria-label="handle.label"
      :class="[
        'workspace-resize-handle',
        `workspace-resize-handle-${handle.orientation}`,
        { 'is-resizing': isResizeHandleActive(handle) },
      ]"
      :data-resize-handle="handle.id"
      :style="getResizeHandleStyle(handle)"
      @mousedown="startResize($event, handle)"
      @pointerdown="startResize($event, handle)"
    />
  </section>
</template>

<script lang="ts" setup>
  import type { WorkspacePanelId } from './workspace/workspacePanel'
  import { storeToRefs } from 'pinia'
  import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import {
    clampWorkspacePanelSize,
    type LayoutPreferences,
    useUserPreferencesStore,
    workspacePanelHeightRange,
    workspaceSidebarWidthRange,
  } from '@/stores/userPreferences'
  import BottomPanel from './workspace/BottomPanel.vue'
  import EditorPane from './workspace/EditorPane.vue'
  import PrimarySidebar from './workspace/PrimarySidebar.vue'
  import SecondarySidebar from './workspace/SecondarySidebar.vue'
  import { getWorkspaceGridLayout } from './workspace/workspaceLayout'

  type WorkspaceSidebarPanelId = 'primary-sidebar' | 'secondary-sidebar'
  type WorkspaceResizeOrientation = 'corner' | 'horizontal' | 'vertical'

  interface WorkspaceRectangle {
    bottom: number
    left: number
    right: number
    top: number
  }

  interface WorkspaceResizeHandle {
    height: number
    horizontalHandleId?: string
    id: string
    label: string
    left: number
    orientation: WorkspaceResizeOrientation
    resizesPanel: boolean
    sidebar?: WorkspaceSidebarPanelId
    sidebarDirection?: -1 | 1
    top: number
    verticalHandleId?: string
    width: number
  }

  interface ActiveWorkspaceResize {
    handle: WorkspaceResizeHandle
    initialPanelHeight: number
    initialPrimarySidebarWidth: number
    initialSecondarySidebarWidth: number
    startX: number
    startY: number
  }

  interface WorkspacePanelGeometry {
    panelId: WorkspacePanelId
    rectangle: WorkspaceRectangle
  }

  const workspacePanelSelectors: Record<WorkspacePanelId, string> = {
    'bottom-panel': '.bottom-panel',
    'editor': '.editor-pane',
    'primary-sidebar': '.primary-sidebar',
    'secondary-sidebar': '.secondary-sidebar',
  }
  const workspaceTopPanelIds: WorkspacePanelId[] = [
    'primary-sidebar',
    'editor',
    'secondary-sidebar',
  ]

  const props = defineProps<{
    popoutPanel?: WorkspacePanelId | null
  }>()

  const userPreferencesStore = useUserPreferencesStore()
  const { layout } = storeToRefs(userPreferencesStore)
  const detachedPanels = ref<WorkspacePanelId[]>([])
  const fullscreenPanel = ref<WorkspacePanelId | null>(props.popoutPanel ?? null)
  const hasNotifiedPanelAttachment = ref(false)
  const workspaceViewportElement = ref<HTMLElement | null>(null)
  const resizeHandles = ref<WorkspaceResizeHandle[]>([])
  const activeResize = ref<ActiveWorkspaceResize | null>(null)
  const resizePreview = ref<Partial<LayoutPreferences>>({})
  let workspaceResizeObserver: ResizeObserver | null = null

  const effectiveLayoutPreferences = computed(() => {
    return {
      ...layout.value,
      ...resizePreview.value,
      panelVisible: layout.value.panelVisible && !isPanelDetached('bottom-panel'),
      primarySidebarVisible: layout.value.primarySidebarVisible && !isPanelDetached('primary-sidebar'),
      secondarySidebarVisible: layout.value.secondarySidebarVisible && !isPanelDetached('secondary-sidebar'),
    }
  })

  const isResizeEnabled = computed(() => {
    return !props.popoutPanel && fullscreenPanel.value === null
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

  watch([workspaceGridStyle, isResizeEnabled], () => {
    void nextTick(refreshResizeHandles)
  }, { flush: 'post' })

  function toggleFullscreen (panelId: WorkspacePanelId) {
    fullscreenPanel.value = fullscreenPanel.value === panelId ? null : panelId
  }

  function isWorkspaceSidebarPanelId (panelId: WorkspacePanelId): panelId is WorkspaceSidebarPanelId {
    return panelId === 'primary-sidebar' || panelId === 'secondary-sidebar'
  }

  function getWorkspacePanelGeometry (panelId: WorkspacePanelId): WorkspacePanelGeometry | null {
    const panelElement = workspaceViewportElement.value?.querySelector<HTMLElement>(
      workspacePanelSelectors[panelId],
    )

    if (!panelElement) {
      return null
    }

    const { bottom, height, left, right, top, width } = panelElement.getBoundingClientRect()

    if (height === 0 || width === 0) {
      return null
    }

    return {
      panelId,
      rectangle: { bottom, left, right, top },
    }
  }

  function refreshResizeHandles () {
    const viewportElement = workspaceViewportElement.value

    if (!isResizeEnabled.value || !viewportElement) {
      resizeHandles.value = []
      return
    }

    const viewportRectangle = viewportElement.getBoundingClientRect()

    if (viewportRectangle.height === 0 || viewportRectangle.width === 0) {
      resizeHandles.value = []
      return
    }

    const topPanels: WorkspacePanelGeometry[] = []

    for (const panelId of workspaceTopPanelIds) {
      const panel = getWorkspacePanelGeometry(panelId)

      if (!panel) {
        continue
      }

      const insertionIndex = topPanels.findIndex(({ rectangle }) => {
        return rectangle.left > panel.rectangle.left
      })

      if (insertionIndex === -1) {
        topPanels.push(panel)
      } else {
        topPanels.splice(insertionIndex, 0, panel)
      }
    }
    const verticalHandles: WorkspaceResizeHandle[] = []

    for (let panelIndex = 0; panelIndex < topPanels.length - 1; panelIndex += 1) {
      const leftPanel = topPanels[panelIndex]
      const rightPanel = topPanels[panelIndex + 1]
      let sidebar: WorkspaceSidebarPanelId | null = null

      if (isWorkspaceSidebarPanelId(leftPanel.panelId)) {
        sidebar = leftPanel.panelId
      } else if (isWorkspaceSidebarPanelId(rightPanel.panelId)) {
        sidebar = rightPanel.panelId
      }

      if (!sidebar) {
        continue
      }

      const handleTop = Math.max(leftPanel.rectangle.top, rightPanel.rectangle.top)
      const handleBottom = Math.min(leftPanel.rectangle.bottom, rightPanel.rectangle.bottom)

      if (handleBottom <= handleTop) {
        continue
      }

      const handleCenter = (leftPanel.rectangle.right + rightPanel.rectangle.left) / 2

      verticalHandles.push({
        height: handleBottom - handleTop,
        id: `vertical-${sidebar}`,
        label: `Resize ${sidebar === 'primary-sidebar' ? 'primary sidebar' : 'secondary sidebar'}`,
        left: handleCenter - viewportRectangle.left - 4,
        orientation: 'vertical',
        resizesPanel: false,
        sidebar,
        sidebarDirection: leftPanel.panelId === sidebar ? 1 : -1,
        top: handleTop - viewportRectangle.top,
        width: 8,
      })
    }

    const bottomPanel = getWorkspacePanelGeometry('bottom-panel')
    let horizontalHandle: WorkspaceResizeHandle | null = null

    if (bottomPanel) {
      const adjacentTopPanels = topPanels.filter(({ rectangle }) => {
        const overlapsBottomPanel = rectangle.left < bottomPanel.rectangle.right
          && rectangle.right > bottomPanel.rectangle.left

        return overlapsBottomPanel && rectangle.bottom <= bottomPanel.rectangle.top
      })

      if (adjacentTopPanels.length > 0) {
        const horizontalLeft = Math.min(...adjacentTopPanels.map(({ rectangle }) => {
          return Math.max(rectangle.left, bottomPanel.rectangle.left)
        }))
        const horizontalRight = Math.max(...adjacentTopPanels.map(({ rectangle }) => {
          return Math.min(rectangle.right, bottomPanel.rectangle.right)
        }))
        const horizontalBottom = Math.max(...adjacentTopPanels.map(({ rectangle }) => rectangle.bottom))

        horizontalHandle = {
          height: 8,
          id: 'horizontal-bottom-panel',
          label: 'Resize bottom panel',
          left: horizontalLeft - viewportRectangle.left,
          orientation: 'horizontal',
          resizesPanel: true,
          top: ((horizontalBottom + bottomPanel.rectangle.top) / 2) - viewportRectangle.top - 4,
          width: horizontalRight - horizontalLeft,
        }
      }
    }

    const cornerHandles: WorkspaceResizeHandle[] = []

    if (horizontalHandle) {
      for (const verticalHandle of verticalHandles) {
        const verticalRight = verticalHandle.left + verticalHandle.width

        if (
          verticalRight < horizontalHandle.left
          || verticalHandle.left > horizontalHandle.left + horizontalHandle.width
        ) {
          continue
        }

        cornerHandles.push({
          ...verticalHandle,
          height: horizontalHandle.height,
          horizontalHandleId: horizontalHandle.id,
          id: `corner-${verticalHandle.sidebar}`,
          label: `${verticalHandle.label} and bottom panel`,
          orientation: 'corner',
          resizesPanel: true,
          top: horizontalHandle.top,
          verticalHandleId: verticalHandle.id,
          width: horizontalHandle.height,
        })
      }
    }

    resizeHandles.value = [
      ...verticalHandles,
      ...(horizontalHandle ? [horizontalHandle] : []),
      ...cornerHandles,
    ]
  }

  function getResizeHandleStyle (handle: WorkspaceResizeHandle) {
    return {
      height: `${handle.height}px`,
      left: `${handle.left}px`,
      top: `${handle.top}px`,
      width: `${handle.width}px`,
    }
  }

  function isResizeHandleActive (handle: WorkspaceResizeHandle) {
    const activeHandle = activeResize.value?.handle

    if (!activeHandle) {
      return false
    }

    const activeHandleIds = new Set([
      activeHandle.id,
      activeHandle.horizontalHandleId,
      activeHandle.verticalHandleId,
    ])
    const handleIds = [handle.id, handle.horizontalHandleId, handle.verticalHandleId]

    return handleIds.some(handleId => handleId && activeHandleIds.has(handleId))
  }

  function startResize (event: MouseEvent, handle: WorkspaceResizeHandle) {
    if (activeResize.value || event.button !== 0 || !isResizeEnabled.value) {
      return
    }

    event.preventDefault()
    activeResize.value = {
      handle,
      initialPanelHeight: layout.value.panelHeight,
      initialPrimarySidebarWidth: layout.value.primarySidebarWidth,
      initialSecondarySidebarWidth: layout.value.secondarySidebarWidth,
      startX: event.clientX,
      startY: event.clientY,
    }
    const pointerEvent = event as PointerEvent

    if (typeof pointerEvent.pointerId === 'number') {
      try {
        (event.currentTarget as HTMLElement).setPointerCapture?.(pointerEvent.pointerId)
      } catch {
        // Synthetic pointer events do not own a browser pointer to capture.
      }
    }

    window.addEventListener('mousemove', updateResize)
    window.addEventListener('pointermove', updateResize)
    window.addEventListener('mouseup', finishResize)
    window.addEventListener('pointerup', finishResize)
    window.addEventListener('pointercancel', cancelResize)
  }

  function updateResize (event: MouseEvent) {
    const resize = activeResize.value

    if (!resize) {
      return
    }

    const layoutUpdate: Partial<LayoutPreferences> = {}

    if (resize.handle.sidebar && resize.handle.sidebarDirection) {
      const initialSidebarWidth = resize.handle.sidebar === 'primary-sidebar'
        ? resize.initialPrimarySidebarWidth
        : resize.initialSecondarySidebarWidth
      const sidebarWidth = clampWorkspacePanelSize(
        initialSidebarWidth + ((event.clientX - resize.startX) * resize.handle.sidebarDirection),
        workspaceSidebarWidthRange,
      )

      if (resize.handle.sidebar === 'primary-sidebar') {
        layoutUpdate.primarySidebarWidth = sidebarWidth
      } else {
        layoutUpdate.secondarySidebarWidth = sidebarWidth
      }
    }

    if (resize.handle.resizesPanel) {
      layoutUpdate.panelHeight = clampWorkspacePanelSize(
        resize.initialPanelHeight - (event.clientY - resize.startY),
        workspacePanelHeightRange,
      )
    }

    resizePreview.value = layoutUpdate
  }

  function removeResizeListeners () {
    window.removeEventListener('mousemove', updateResize)
    window.removeEventListener('pointermove', updateResize)
    window.removeEventListener('mouseup', finishResize)
    window.removeEventListener('pointerup', finishResize)
    window.removeEventListener('pointercancel', cancelResize)
  }

  function finishResize () {
    const layoutUpdate = resizePreview.value

    if (layoutUpdate.primarySidebarWidth !== undefined) {
      userPreferencesStore.setPrimarySidebarWidth(layoutUpdate.primarySidebarWidth)
    }

    if (layoutUpdate.secondarySidebarWidth !== undefined) {
      userPreferencesStore.setSecondarySidebarWidth(layoutUpdate.secondarySidebarWidth)
    }

    if (layoutUpdate.panelHeight !== undefined) {
      userPreferencesStore.setPanelHeight(layoutUpdate.panelHeight)
    }

    cancelResize()
  }

  function cancelResize () {
    activeResize.value = null
    resizePreview.value = {}
    removeResizeListeners()
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
    window.addEventListener('resize', refreshResizeHandles)
    workspaceResizeObserver = new ResizeObserver(refreshResizeHandles)
    workspaceResizeObserver.observe(workspaceViewportElement.value!)
    void nextTick(refreshResizeHandles)
  })

  onBeforeUnmount(() => {
    cancelResize()
    window.removeEventListener('message', handlePanelAttachment)
    window.removeEventListener('pagehide', handlePopoutPageHide)
    window.removeEventListener('resize', refreshResizeHandles)
    workspaceResizeObserver?.disconnect()
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
  .workspace-resize-handle.is-resizing::after {
    opacity: 1;
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
