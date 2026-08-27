import type { LayoutPreferences } from '@/stores/userPreferences'

/** Identifies a named area in the workspace grid. */
export type WorkspaceArea = 'editor' | 'panel' | 'primary' | 'secondary'

/** Narrows workspace areas to the two resizable sidebars. */
export type WorkspaceSidebar = Exclude<WorkspaceArea, 'editor' | 'panel'>

/** Selects the breakpoint-specific layout constraints for the workspace grid. */
export type WorkspaceGridSize = 'compact' | 'desktop'

/** Describes the CSS Grid template values for a workspace arrangement. */
export interface WorkspaceGridLayout {
  /** Names the area assigned to each grid cell. */
  areas: string

  /** Defines the width constraint for each visible column. */
  columns: string

  /** Defines the height constraint for each visible row. */
  rows: string
}

/**
 * Produces the CSS Grid tracks that reflect the user's visible panels, positions, and dimensions.
 */
export function getWorkspaceGridLayout (
  layoutPreferences: LayoutPreferences,
  gridSize: WorkspaceGridSize,
): WorkspaceGridLayout {
  const isPrimaryOnLeft = layoutPreferences.primarySidebarPosition === 'left'
  const leftSidebar: WorkspaceSidebar = isPrimaryOnLeft ? 'primary' : 'secondary'
  const rightSidebar: WorkspaceSidebar = isPrimaryOnLeft ? 'secondary' : 'primary'
  const gridColumns = ([leftSidebar, 'editor', rightSidebar] as const).filter(sidebar => {
    return sidebar === 'editor' || layoutPreferences[`${sidebar}SidebarVisible`]
  })

  const gridRows = [`'${gridColumns.join(' ')}'`]

  if (layoutPreferences.panelVisible) {
    /** Identifies areas that stay outside the bottom panel for each alignment choice. */
    const retainedAreas: WorkspaceArea[] = {
      center: [leftSidebar, rightSidebar],
      justify: [],
      left: [rightSidebar],
      right: [leftSidebar],
    }[layoutPreferences.panelAlignment]
    const panelRow = gridColumns.map((area): WorkspaceArea => {
      return retainedAreas.includes(area) ? area : 'panel'
    })

    gridRows.push(`'${panelRow.join(' ')}'`)
  }

  return {
    areas: gridRows.join(' '),
    columns: gridColumns.map(gridArea => {
      if (gridArea === 'editor') {
        return 'minmax(0, 1fr)'
      }

      const preferredWidth = gridArea === 'primary'
        ? layoutPreferences.primarySidebarWidth
        : layoutPreferences.secondarySidebarWidth

      return `minmax(${gridSize === 'compact' ? 80 : 160}px, ${preferredWidth}px)`
    }).join(' '),
    rows: layoutPreferences.panelVisible
      ? `minmax(0, 1fr) minmax(156px, ${layoutPreferences.panelHeight}px)`
      : 'minmax(0, 1fr)',
  }
}
