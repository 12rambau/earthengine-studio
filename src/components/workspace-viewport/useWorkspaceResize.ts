import type { WorkspacePanelId } from './workspacePanel'
import type { ComputedRef, Ref } from 'vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  clampWorkspacePanelSize,
  type LayoutPreferences,
  useUserPreferencesStore,
  workspacePanelHeightRange,
  workspaceSidebarWidthRange,
} from '@/stores/userPreferences'
import { getWorkspaceGridLayout } from './workspaceLayout'

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
  pointerId: number
  startX: number
  startY: number
  target: HTMLElement
}

interface WorkspacePanelGeometry {
  panelId: WorkspacePanelId
  rectangle: WorkspaceRectangle
}

interface UseWorkspaceResizeOptions {
  isResizeEnabled: ComputedRef<boolean>
  layout: Ref<LayoutPreferences>
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

export function useWorkspaceResize (options: UseWorkspaceResizeOptions) {
  const userPreferencesStore = useUserPreferencesStore()
  const workspaceViewportElement = ref<HTMLElement | null>(null)
  const resizeHandles = ref<WorkspaceResizeHandle[]>([])
  const activeResize = ref<ActiveWorkspaceResize | null>(null)
  const resizePreview = ref<Partial<LayoutPreferences>>({})
  let workspaceResizeObserver: ResizeObserver | null = null

  const effectiveLayoutPreferences = computed(() => {
    return {
      ...options.layout.value,
      ...resizePreview.value,
    }
  })

  const workspaceGridStyle = computed(() => {
    const desktopGridLayout = getWorkspaceGridLayout(
      effectiveLayoutPreferences.value,
      'desktop',
    )
    const compactGridLayout = getWorkspaceGridLayout(
      effectiveLayoutPreferences.value,
      'compact',
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

  watch([workspaceGridStyle, options.isResizeEnabled], () => {
    void nextTick(refreshResizeHandles)
  }, { flush: 'post' })

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

    if (!options.isResizeEnabled.value || !viewportElement) {
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

  function isKeyboardResizeHandle (handle: WorkspaceResizeHandle) {
    return handle.orientation !== 'corner'
  }

  function getResizeHandleOrientation (handle: WorkspaceResizeHandle) {
    if (!isKeyboardResizeHandle(handle)) {
      return undefined
    }

    return handle.orientation === 'horizontal' ? 'horizontal' : 'vertical'
  }

  function getResizeHandleMinimum (handle: WorkspaceResizeHandle) {
    if (!isKeyboardResizeHandle(handle)) {
      return undefined
    }

    return handle.sidebar ? workspaceSidebarWidthRange.minimum : workspacePanelHeightRange.minimum
  }

  function getResizeHandleMaximum (handle: WorkspaceResizeHandle) {
    if (!isKeyboardResizeHandle(handle)) {
      return undefined
    }

    return handle.sidebar ? workspaceSidebarWidthRange.maximum : workspacePanelHeightRange.maximum
  }

  function getResizeHandleValue (handle: WorkspaceResizeHandle) {
    if (!isKeyboardResizeHandle(handle)) {
      return undefined
    }

    if (handle.sidebar === 'primary-sidebar') {
      return effectiveLayoutPreferences.value.primarySidebarWidth
    }

    if (handle.sidebar === 'secondary-sidebar') {
      return effectiveLayoutPreferences.value.secondarySidebarWidth
    }

    return effectiveLayoutPreferences.value.panelHeight
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

  function resizeWithKeyboard (event: KeyboardEvent, handle: WorkspaceResizeHandle) {
    if (!isKeyboardResizeHandle(handle)) {
      return
    }

    const currentSize = getResizeHandleValue(handle)
    const minimumSize = getResizeHandleMinimum(handle)
    const maximumSize = getResizeHandleMaximum(handle)

    if (currentSize === undefined) {
      return
    }

    if (minimumSize === undefined) {
      return
    }

    if (maximumSize === undefined) {
      return
    }

    let nextSize: number | undefined

    if (event.key === 'Home') {
      nextSize = minimumSize
    } else if (event.key === 'End') {
      nextSize = maximumSize
    } else {
      const step = event.shiftKey ? 48 : 16
      let direction: -1 | 1

      if (handle.orientation === 'vertical') {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) {
          return
        }

        direction = event.key === 'ArrowLeft' ? -1 : 1
      } else {
        if (!['ArrowUp', 'ArrowDown'].includes(event.key)) {
          return
        }

        direction = event.key === 'ArrowUp' ? 1 : -1
      }

      const sidebarDirection = handle.sidebarDirection ?? 1
      nextSize = clampWorkspacePanelSize(
        currentSize + (direction * step * (handle.sidebar ? sidebarDirection : 1)),
        handle.sidebar ? workspaceSidebarWidthRange : workspacePanelHeightRange,
      )
    }

    event.preventDefault()

    if (handle.sidebar === 'primary-sidebar') {
      userPreferencesStore.setPrimarySidebarWidth(nextSize)
    } else if (handle.sidebar === 'secondary-sidebar') {
      userPreferencesStore.setSecondarySidebarWidth(nextSize)
    } else {
      userPreferencesStore.setPanelHeight(nextSize)
    }
  }

  function startResize (event: PointerEvent, handle: WorkspaceResizeHandle) {
    if (activeResize.value || event.button !== 0 || !event.isPrimary || !options.isResizeEnabled.value) {
      return
    }

    event.preventDefault()
    const target = event.currentTarget as HTMLElement

    activeResize.value = {
      handle,
      initialPanelHeight: options.layout.value.panelHeight,
      initialPrimarySidebarWidth: options.layout.value.primarySidebarWidth,
      initialSecondarySidebarWidth: options.layout.value.secondarySidebarWidth,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      target,
    }

    try {
      target.setPointerCapture(event.pointerId)
    } catch {
      // Synthetic pointer events do not own a browser pointer to capture.
    }

    window.addEventListener('pointermove', updateResize)
    window.addEventListener('pointerup', finishResize)
    window.addEventListener('pointercancel', cancelResize)
  }

  function updateResize (event: PointerEvent) {
    const resize = activeResize.value

    if (!resize || resize.pointerId !== event.pointerId) {
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
    window.removeEventListener('pointermove', updateResize)
    window.removeEventListener('pointerup', finishResize)
    window.removeEventListener('pointercancel', cancelResize)
  }

  function finishResize (event: PointerEvent) {
    const resize = activeResize.value

    if (!resize || resize.pointerId !== event.pointerId) {
      return
    }

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

  function cancelResize (event?: PointerEvent) {
    const resize = activeResize.value

    if (event && resize && resize.pointerId !== event.pointerId) {
      return
    }

    if (resize?.target.hasPointerCapture?.(resize.pointerId)) {
      resize.target.releasePointerCapture?.(resize.pointerId)
    }

    activeResize.value = null
    resizePreview.value = {}
    removeResizeListeners()
  }

  onMounted(() => {
    window.addEventListener('resize', refreshResizeHandles)
    workspaceResizeObserver = new ResizeObserver(refreshResizeHandles)
    workspaceResizeObserver.observe(workspaceViewportElement.value!)
    void nextTick(refreshResizeHandles)
  })

  onBeforeUnmount(() => {
    cancelResize()
    window.removeEventListener('resize', refreshResizeHandles)
    workspaceResizeObserver?.disconnect()
  })

  return {
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
  }
}
