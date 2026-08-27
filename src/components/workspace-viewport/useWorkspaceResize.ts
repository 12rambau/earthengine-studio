import type { WorkspaceArea, WorkspaceSidebar } from './workspaceLayout'
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

/** Distinguishes a drag handle that resizes one axis from one that resizes both axes. */
type WorkspaceResizeOrientation = 'corner' | 'horizontal' | 'vertical'

/** Identifies workspace areas whose dimensions can be changed by a resize handle. */
type WorkspaceResizableArea = Exclude<WorkspaceArea, 'editor'>

/** Narrows layout preferences to numeric values controlled by workspace resize handles. */
type WorkspaceSizePreference = 'panelHeight' | 'primarySidebarWidth' | 'secondarySidebarWidth'

/** Describes the visible bounds of a workspace area in viewport coordinates. */
interface WorkspaceRectangle {
  bottom: number
  left: number
  right: number
  top: number
}

/** Binds a positioned drag target to the workspace dimensions it can change. */
interface WorkspaceResizeHandle {
  area: WorkspaceResizableArea
  height: number
  horizontalHandleId?: string
  id: string
  label: string
  left: number
  maximum?: number
  minimum?: number
  orientation: WorkspaceResizeOrientation
  resizesPanel: boolean
  sidebar?: WorkspaceSidebar
  sidebarDirection?: -1 | 1
  top: number
  verticalHandleId?: string
  width: number
}

/** Captures the pointer and preference values from the start of an active resize interaction. */
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

/** Pairs a workspace area with its measured bounds for handle placement. */
interface WorkspaceAreaGeometry {
  area: WorkspaceArea
  rectangle: WorkspaceRectangle
}

/** Provides the reactive layout state and resize availability required by the composable. */
interface UseWorkspaceResizeOptions {
  isResizeEnabled: ComputedRef<boolean>
  layout: Ref<LayoutPreferences>
}

/** Lists resizable areas in the order used to persist dimension previews. */
const workspaceResizableAreas = ['panel', 'primary', 'secondary'] as const satisfies readonly WorkspaceResizableArea[]

/** Maps each resizable area to the numeric layout preference that stores its dimension. */
const workspaceSizePreferenceKeys = {
  panel: 'panelHeight',
  primary: 'primarySidebarWidth',
  secondary: 'secondarySidebarWidth',
} as const satisfies Record<WorkspaceResizableArea, WorkspaceSizePreference>

/** Maps each resizable area to the bounds that constrain its dimension. */
const workspaceSizeRanges = {
  panel: workspacePanelHeightRange,
  primary: workspaceSidebarWidthRange,
  secondary: workspaceSidebarWidthRange,
} satisfies Record<WorkspaceResizableArea, { maximum: number, minimum: number }>

/** Maps each resizable axis to the keyboard directions that increase or decrease its size. */
const keyboardResizeDirections: Record<Exclude<WorkspaceResizeOrientation, 'corner'>, Partial<Record<string, -1 | 1>>> = {
  horizontal: { ArrowDown: -1, ArrowUp: 1 },
  vertical: { ArrowLeft: -1, ArrowRight: 1 },
}

/**
 * Coordinates pointer and keyboard resizing while projecting persisted preferences into grid styles.
 */
export function useWorkspaceResize (options: UseWorkspaceResizeOptions) {
  /** Persists dimensions once a resize interaction completes. */
  const userPreferencesStore = useUserPreferencesStore()

  /** Maps each resizable area to the preference action that persists its dimension. */
  const setWorkspaceSize = {
    panel: userPreferencesStore.setPanelHeight,
    primary: userPreferencesStore.setPrimarySidebarWidth,
    secondary: userPreferencesStore.setSecondarySidebarWidth,
  } satisfies Record<WorkspaceResizableArea, (size: number) => void>

  /** References the viewport whose rendered geometry determines drag-handle placement. */
  const workspaceViewportElement = ref<HTMLElement | null>(null)

  /** Exposes the current drag targets to the workspace viewport template. */
  const resizeHandles = ref<WorkspaceResizeHandle[]>([])

  /** Tracks the pointer interaction currently updating the workspace dimensions. */
  const activeResize = ref<ActiveWorkspaceResize | null>(null)

  /** Holds temporary dimensions so dragging does not persist every pointer movement. */
  const resizePreview = ref<Partial<LayoutPreferences>>({})

  /** Recomputes handle geometry when the viewport dimensions change. */
  let workspaceResizeObserver: ResizeObserver | null = null

  /** Merges the persisted layout with dimensions previewed during an active drag. */
  const effectiveLayoutPreferences = computed(() => {
    return {
      ...options.layout.value,
      ...resizePreview.value,
    }
  })

  /** Exposes the current dimension for each resizable area, including an active drag preview. */
  const workspaceSizeValues = computed(() => {
    return {
      panel: effectiveLayoutPreferences.value.panelHeight,
      primary: effectiveLayoutPreferences.value.primarySidebarWidth,
      secondary: effectiveLayoutPreferences.value.secondarySidebarWidth,
    } satisfies Record<WorkspaceResizableArea, number>
  })

  /** Converts desktop and compact grid layouts into CSS custom properties for the viewport. */
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
      '--workspace-grid-rows': desktopGridLayout.rows,
      '--workspace-grid-rows-compact': compactGridLayout.rows,
    }
  })

  /** Repositions handles after a grid or fullscreen transition has rendered. */
  watch([workspaceGridStyle, options.isResizeEnabled], () => {
    void nextTick(refreshResizeHandles)
  }, { flush: 'post' })

  /** Measures a rendered workspace area or omits it when it is absent or has no visible size. */
  function getWorkspaceAreaGeometry (area: WorkspaceArea): WorkspaceAreaGeometry | null {
    const areaElement = workspaceViewportElement.value?.querySelector<HTMLElement>(`.${area}`)

    if (!areaElement) {
      return null
    }

    const { bottom, height, left, right, top, width } = areaElement.getBoundingClientRect()

    if (height === 0 || width === 0) {
      return null
    }

    return {
      area,
      rectangle: { bottom, left, right, top },
    }
  }

  /** Derives all visible vertical, horizontal, and corner drag handles from rendered area geometry. */
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

    /** Collects visible upper areas in the same left-to-right order as the workspace grid. */
    const topPanels = (options.layout.value.primarySidebarPosition === 'left'
      ? ['primary', 'editor', 'secondary'] as const
      : ['secondary', 'editor', 'primary'] as const)
      .map(area => getWorkspaceAreaGeometry(area))
      .filter(panel => panel !== null)
    const bottomPanel = getWorkspaceAreaGeometry('panel')

    /** Projects adjacent upper areas into the vertical boundaries users can resize. */
    const verticalHandles = topPanels.slice(1).flatMap<WorkspaceResizeHandle>((rightPanel, panelIndex) => {
      const leftPanel = topPanels[panelIndex]

      /** Identifies the resizable sidebar sharing this vertical boundary. */
      const sidebar = [leftPanel.area, rightPanel.area].find(area => {
        return area === 'primary' || area === 'secondary'
      })

      const handleTop = Math.max(leftPanel.rectangle.top, rightPanel.rectangle.top)
      const handleBottom = Math.min(leftPanel.rectangle.bottom, rightPanel.rectangle.bottom)

      if (!sidebar || handleBottom <= handleTop) {
        return []
      }

      const handleCenter = (leftPanel.rectangle.right + rightPanel.rectangle.left) / 2
      const isSidebarOnLeft = leftPanel.area === sidebar
      const sidebarDirection = isSidebarOnLeft ? 1 : -1
      const bottomPanelBoundary = bottomPanel?.rectangle[isSidebarOnLeft ? 'left' : 'right']
      const bottomPanelContinuesSidebar = bottomPanelBoundary !== undefined
        && bottomPanel!.rectangle.top >= handleBottom
        && bottomPanelBoundary >= leftPanel.rectangle.right
        && bottomPanelBoundary <= rightPanel.rectangle.left
      const extendedHandleBottom = bottomPanel && bottomPanelContinuesSidebar
        ? bottomPanel.rectangle.bottom
        : handleBottom
      const sizeRange = workspaceSizeRanges[sidebar]

      return [{
        area: sidebar,
        height: extendedHandleBottom - handleTop,
        id: `vertical-${sidebar}`,
        label: `Resize ${sidebar === 'primary' ? 'primary sidebar' : 'secondary sidebar'}`,
        left: handleCenter - viewportRectangle.left - 4,
        maximum: sizeRange.maximum,
        minimum: sizeRange.minimum,
        orientation: 'vertical',
        resizesPanel: false,
        sidebar,
        sidebarDirection,
        top: handleTop - viewportRectangle.top,
        width: 8,
      }]
    })

    /** Collects upper areas that overlap the horizontal boundary of the bottom panel. */
    const adjacentTopPanels = bottomPanel
      ? topPanels.filter(({ rectangle }) => {
          return rectangle.left < bottomPanel.rectangle.right
            && rectangle.right > bottomPanel.rectangle.left
            && rectangle.bottom <= bottomPanel.rectangle.top
        })
      : []

    /** Defines the shared boundary between the bottom panel and its upper neighbors. */
    const horizontalBounds = bottomPanel && adjacentTopPanels.length > 0
      ? {
          bottom: Math.max(...adjacentTopPanels.map(({ rectangle }) => rectangle.bottom)),
          left: Math.min(...adjacentTopPanels.map(({ rectangle }) => {
            return Math.max(rectangle.left, bottomPanel.rectangle.left)
          })),
          right: Math.max(...adjacentTopPanels.map(({ rectangle }) => {
            return Math.min(rectangle.right, bottomPanel.rectangle.right)
          })),
        }
      : null

    const horizontalHandle: WorkspaceResizeHandle | null = bottomPanel && horizontalBounds
      ? {
          area: 'panel',
          height: 8,
          id: 'horizontal-panel',
          label: 'Resize bottom panel',
          left: horizontalBounds.left - viewportRectangle.left,
          maximum: workspaceSizeRanges.panel.maximum,
          minimum: workspaceSizeRanges.panel.minimum,
          orientation: 'horizontal',
          resizesPanel: true,
          top: ((horizontalBounds.bottom + bottomPanel.rectangle.top) / 2) - viewportRectangle.top - 4,
          width: horizontalBounds.right - horizontalBounds.left,
        }
      : null

    /** Projects vertical boundaries crossing the horizontal panel boundary into corner handles. */
    const cornerHandles: WorkspaceResizeHandle[] = horizontalHandle
      ? verticalHandles
          .filter(({ left, width }) => {
            return left + width >= horizontalHandle.left
              && left <= horizontalHandle.left + horizontalHandle.width
          })
          .map(verticalHandle => ({
            ...verticalHandle,
            height: horizontalHandle.height,
            horizontalHandleId: horizontalHandle.id,
            id: `corner-${verticalHandle.sidebar}`,
            label: `${verticalHandle.label} and bottom panel`,
            maximum: undefined,
            minimum: undefined,
            orientation: 'corner',
            resizesPanel: true,
            top: horizontalHandle.top,
            verticalHandleId: verticalHandle.id,
            width: horizontalHandle.height,
          }))
      : []

    resizeHandles.value = [
      ...verticalHandles,
      ...(horizontalHandle ? [horizontalHandle] : []),
      ...cornerHandles,
    ]
  }

  /** Identifies every handle participating in the same active single-axis or corner resize. */
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

  /** Applies a constrained dimension change from an accessible resize-handle keyboard command. */
  function resizeWithKeyboard (event: KeyboardEvent, handle: WorkspaceResizeHandle) {
    if (handle.orientation === 'corner') {
      return
    }

    const area = handle.sidebar ?? 'panel'
    const sizeRange = workspaceSizeRanges[area]
    const currentSize = effectiveLayoutPreferences.value[workspaceSizePreferenceKeys[area]]
    const boundarySize = event.key === 'Home'
      ? sizeRange.minimum
      : (event.key === 'End' ? sizeRange.maximum : undefined)
    const direction = keyboardResizeDirections[handle.orientation][event.key]
    const nextSize = boundarySize ?? (direction === undefined
      ? undefined
      : clampWorkspacePanelSize(
          currentSize + (direction * (event.shiftKey ? 48 : 16) * (handle.sidebarDirection ?? 1)),
          sizeRange,
        ))

    if (nextSize === undefined) {
      return
    }

    event.preventDefault()

    setWorkspaceSize[handle.sidebar ?? 'panel'](nextSize)
  }

  /** Starts an exclusive primary-pointer resize and records the dimensions used as its baseline. */
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

  /** Updates the in-memory dimension preview for the pointer that owns the active resize. */
  function updateResize (event: PointerEvent) {
    const resize = activeResize.value

    if (!resize || resize.pointerId !== event.pointerId) {
      return
    }

    const layoutUpdate: Partial<LayoutPreferences> = {}

    if (resize.handle.sidebar && resize.handle.sidebarDirection) {
      const initialSidebarWidth = resize.handle.sidebar === 'primary'
        ? resize.initialPrimarySidebarWidth
        : resize.initialSecondarySidebarWidth
      const sidebarWidth = clampWorkspacePanelSize(
        initialSidebarWidth + ((event.clientX - resize.startX) * resize.handle.sidebarDirection),
        workspaceSidebarWidthRange,
      )

      layoutUpdate[workspaceSizePreferenceKeys[resize.handle.sidebar]] = sidebarWidth
    }

    if (resize.handle.resizesPanel) {
      layoutUpdate.panelHeight = clampWorkspacePanelSize(
        resize.initialPanelHeight - (event.clientY - resize.startY),
        workspacePanelHeightRange,
      )
    }

    resizePreview.value = layoutUpdate
  }

  /** Removes global pointer listeners installed for an active resize interaction. */
  function removeResizeListeners () {
    window.removeEventListener('pointermove', updateResize)
    window.removeEventListener('pointerup', finishResize)
    window.removeEventListener('pointercancel', cancelResize)
  }

  /** Persists the latest preview when the pointer that owns the active resize is released. */
  function finishResize (event: PointerEvent) {
    const resize = activeResize.value

    if (!resize || resize.pointerId !== event.pointerId) {
      return
    }

    const layoutUpdate = resizePreview.value

    for (const area of workspaceResizableAreas) {
      const size = layoutUpdate[workspaceSizePreferenceKeys[area]]

      if (size !== undefined) {
        setWorkspaceSize[area](size)
      }
    }

    cancelResize()
  }

  /** Releases an active pointer, discards preview state, and removes resize listeners. */
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

  /** Begins observing viewport geometry after its template ref is mounted. */
  onMounted(() => {
    window.addEventListener('resize', refreshResizeHandles)
    workspaceResizeObserver = new ResizeObserver(refreshResizeHandles)
    workspaceResizeObserver.observe(workspaceViewportElement.value!)
    void nextTick(refreshResizeHandles)
  })

  /** Stops resize work and observation before the workspace viewport is removed. */
  onBeforeUnmount(() => {
    cancelResize()
    window.removeEventListener('resize', refreshResizeHandles)
    workspaceResizeObserver?.disconnect()
  })

  return {
    activeResize,
    isResizeHandleActive,
    resizeHandles,
    resizeWithKeyboard,
    startResize,
    workspaceGridStyle,
    workspaceSizeValues,
    workspaceViewportElement,
  }
}
