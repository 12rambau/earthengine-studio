import type { LayoutPreferences } from '@/stores/userPreferences'

type WorkspaceGridArea = 'editor' | 'panel' | 'primary' | 'secondary'
type WorkspaceSidebar = 'primary' | 'secondary'

export type WorkspaceGridSize = 'compact' | 'desktop'

export interface WorkspaceGridLayout {
  areas: string
  columns: string
  rowGap: string
  rows: string
}

function getSidebarWidth (sidebar: WorkspaceSidebar, gridSize: WorkspaceGridSize) {
  if (gridSize === 'compact') {
    return 'minmax(80px, 25%)'
  }

  return sidebar === 'primary' ? 'minmax(192px, 19vw)' : 'minmax(224px, 23vw)'
}

function isSidebarVisible (sidebar: WorkspaceSidebar, layoutPreferences: LayoutPreferences) {
  return sidebar === 'primary'
    ? layoutPreferences.primarySidebarVisible
    : layoutPreferences.secondarySidebarVisible
}

function formatGridRow (gridAreas: WorkspaceGridArea[]) {
  return `'${gridAreas.join(' ')}'`
}

function getWorkspaceGridLayoutWithoutEditor (
  layoutPreferences: LayoutPreferences,
  gridSize: WorkspaceGridSize,
): WorkspaceGridLayout {
  const leftSidebar: WorkspaceSidebar = layoutPreferences.primarySidebarPosition === 'left'
    ? 'primary'
    : 'secondary'
  const rightSidebar: WorkspaceSidebar = leftSidebar === 'primary' ? 'secondary' : 'primary'
  const visibleSidebars = [leftSidebar, rightSidebar].filter(sidebar => {
    return isSidebarVisible(sidebar, layoutPreferences)
  })

  if (visibleSidebars.length === 0) {
    return {
      areas: '\'editor\'',
      columns: 'minmax(0, 1fr)',
      rowGap: '0',
      rows: 'minmax(0, 1fr)',
    }
  }

  const gridRows = [formatGridRow(visibleSidebars)]

  if (layoutPreferences.panelVisible) {
    gridRows.push(formatGridRow(visibleSidebars.map(() => 'panel')))
  }

  return {
    areas: gridRows.join(' '),
    columns: visibleSidebars.map(() => 'minmax(0, 1fr)').join(' '),
    rowGap: layoutPreferences.panelVisible ? '8px' : '0',
    rows: layoutPreferences.panelVisible
      ? (gridSize === 'compact' ? 'minmax(0, 1fr) minmax(156px, 34%)' : 'minmax(0, 1fr) 220px')
      : 'minmax(0, 1fr)',
  }
}

export function getWorkspaceGridLayout (
  layoutPreferences: LayoutPreferences,
  gridSize: WorkspaceGridSize,
  isEditorVisible = true,
): WorkspaceGridLayout {
  if (!isEditorVisible) {
    return getWorkspaceGridLayoutWithoutEditor(layoutPreferences, gridSize)
  }

  const leftSidebar: WorkspaceSidebar = layoutPreferences.primarySidebarPosition === 'left'
    ? 'primary'
    : 'secondary'
  const rightSidebar: WorkspaceSidebar = leftSidebar === 'primary' ? 'secondary' : 'primary'
  const gridColumns: Array<WorkspaceSidebar | 'editor'> = []

  if (isSidebarVisible(leftSidebar, layoutPreferences)) {
    gridColumns.push(leftSidebar)
  }

  gridColumns.push('editor')

  if (isSidebarVisible(rightSidebar, layoutPreferences)) {
    gridColumns.push(rightSidebar)
  }

  const topRow = gridColumns
  const gridRows = [formatGridRow(topRow)]

  if (layoutPreferences.panelVisible) {
    const panelRow = gridColumns.map((gridArea): WorkspaceGridArea => {
      if (layoutPreferences.panelAlignment === 'justify') {
        return 'panel'
      }

      if (layoutPreferences.panelAlignment === 'left') {
        return gridArea === rightSidebar ? rightSidebar : 'panel'
      }

      if (layoutPreferences.panelAlignment === 'right') {
        return gridArea === leftSidebar ? leftSidebar : 'panel'
      }

      return gridArea === 'editor' ? 'panel' : gridArea
    })

    gridRows.push(formatGridRow(panelRow))
  }

  return {
    areas: gridRows.join(' '),
    columns: gridColumns.map(gridArea => {
      return gridArea === 'editor' ? 'minmax(0, 1fr)' : getSidebarWidth(gridArea, gridSize)
    }).join(' '),
    rowGap: layoutPreferences.panelVisible ? '8px' : '0',
    rows: layoutPreferences.panelVisible
      ? (gridSize === 'compact' ? 'minmax(0, 1fr) minmax(156px, 34%)' : 'minmax(0, 1fr) 220px')
      : 'minmax(0, 1fr)',
  }
}
