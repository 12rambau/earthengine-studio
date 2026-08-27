import { describe, expect, it } from 'vitest'
import { getWorkspaceGridLayout } from '@/components/workspace-viewport/workspaceLayout'
import { defaultLayoutPreferences } from '@/stores/userPreferences'

describe('getWorkspaceGridLayout', () => {
  it('places the panel under the physical left sidebar for left alignment', () => {
    const layout = getWorkspaceGridLayout({
      ...defaultLayoutPreferences,
      panelAlignment: 'left',
    }, 'desktop')

    expect(layout.areas).toBe('\'primary editor secondary\' \'panel panel secondary\'')
  })

  it('places the panel under the physical right sidebar for right alignment', () => {
    const layout = getWorkspaceGridLayout({
      ...defaultLayoutPreferences,
      panelAlignment: 'right',
    }, 'desktop')

    expect(layout.areas).toBe('\'primary editor secondary\' \'primary panel panel\'')
  })

  it('keeps both sidebars at the bottom for center alignment', () => {
    const layout = getWorkspaceGridLayout({
      ...defaultLayoutPreferences,
      panelAlignment: 'center',
    }, 'desktop')

    expect(layout.areas).toBe('\'primary editor secondary\' \'primary panel secondary\'')
  })

  it('stretches the panel across all regions for justify alignment', () => {
    const layout = getWorkspaceGridLayout({
      ...defaultLayoutPreferences,
      panelAlignment: 'justify',
    }, 'desktop')

    expect(layout.areas).toBe('\'primary editor secondary\' \'panel panel panel\'')
  })

  it('uses persisted viewport dimensions for sidebar columns and the bottom panel row', () => {
    const layout = getWorkspaceGridLayout({
      ...defaultLayoutPreferences,
      panelHeight: 320,
      primarySidebarWidth: 360,
      secondarySidebarWidth: 420,
    }, 'desktop')

    expect(layout.columns).toBe('minmax(160px, 360px) minmax(0, 1fr) minmax(160px, 420px)')
    expect(layout.rows).toBe('minmax(0, 1fr) minmax(156px, 320px)')
  })
})
