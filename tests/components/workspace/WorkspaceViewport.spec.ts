import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createVuetify } from 'vuetify'
import WorkspaceViewport from '@/components/workspace/WorkspaceViewport.vue'
import { useUserPreferencesStore } from '@/stores/userPreferences'

function createRectangle (left: number, top: number, width: number, height: number) {
  return {
    bottom: top + height,
    height,
    left,
    right: left + width,
    toJSON: () => ({}),
    top,
    width,
    x: left,
    y: top,
  } as DOMRect
}

function mockWorkspaceGeometry (workspaceViewport: HTMLElement) {
  const geometry: Array<[Element, DOMRect]> = [
    [workspaceViewport, createRectangle(0, 0, 1200, 800)],
    [workspaceViewport.querySelector('.primary-sidebar')!, createRectangle(8, 8, 280, 608)],
    [workspaceViewport.querySelector('.editor-pane')!, createRectangle(296, 8, 560, 608)],
    [workspaceViewport.querySelector('.secondary-sidebar')!, createRectangle(864, 8, 328, 608)],
    [workspaceViewport.querySelector('.bottom-panel')!, createRectangle(8, 624, 1184, 168)],
  ]
  const geometryMocks = geometry.map(([element, rectangle]) => {
    return vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(rectangle)
  })

  return {
    mockRestore () {
      for (const geometryMock of geometryMocks) {
        geometryMock.mockRestore()
      }
    },
  }
}

describe('WorkspaceViewport', () => {
  it('renders the four workspace regions', () => {
    const pinia = createPinia()
    const wrapper = mount(WorkspaceViewport, {
      global: {
        plugins: [createVuetify(), pinia],
      },
    })

    const regions = [
      wrapper.get('[aria-label="Primary sidebar"]'),
      wrapper.get('[aria-label="Secondary sidebar"]'),
      wrapper.get('[aria-label="Editor"]'),
      wrapper.get('[aria-label="Bottom panel"]'),
    ]

    expect(regions).toHaveLength(4)
    expect(regions.every(region => region.get('h2').exists())).toBe(true)
    expect(wrapper.find('button[aria-label="Hide Editor"]').exists()).toBe(false)

    wrapper.unmount()
  })

  it('updates visible regions and sidebar placement from layout preferences', async () => {
    const pinia = createPinia()
    const wrapper = mount(WorkspaceViewport, {
      global: {
        plugins: [createVuetify(), pinia],
      },
    })
    const userPreferencesStore = useUserPreferencesStore(pinia)

    userPreferencesStore.setPrimarySidebarPosition('right')
    userPreferencesStore.setPrimarySidebarVisibility(false)
    userPreferencesStore.setPanelVisibility(false)
    await nextTick()

    expect(wrapper.element.style.getPropertyValue('--workspace-grid-areas')).toBe('\'secondary editor\'')
    expect(wrapper.find('[aria-label="Primary sidebar"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Bottom panel"]').exists()).toBe(false)
    expect(wrapper.get('[aria-label="Secondary sidebar"]').exists()).toBe(true)

    wrapper.unmount()
  })

  it('maximizes a sheet and opens a dedicated popout URL', async () => {
    const pinia = createPinia()
    const openWindow = vi.spyOn(window, 'open').mockImplementation(() => window)
    const wrapper = mount(WorkspaceViewport, {
      global: {
        plugins: [createVuetify(), pinia],
      },
    })

    await wrapper.get('button[aria-label="Fullscreen Editor"]').trigger('click')
    await nextTick()

    expect(wrapper.classes()).toContain('workspace-viewport-fullscreen')
    expect(wrapper.get('[aria-label="Editor"]').classes()).toContain('is-fullscreen')

    await wrapper.get('button[aria-label="Open Editor in new window"]').trigger('click')
    await nextTick()

    expect(openWindow).toHaveBeenCalledWith(
      expect.stringContaining('panel=editor'),
      '_blank',
      'popup,width=960,height=720',
    )
    expect(wrapper.find('[aria-label="Editor"]').exists()).toBe(false)
    expect(wrapper.element.style.getPropertyValue('--workspace-grid-areas')).toBe('\'primary secondary\' \'panel panel\'')
    expect(wrapper.element.style.getPropertyValue('--workspace-grid-columns')).toBe('minmax(160px, 280px) minmax(0, 1fr)')

    window.dispatchEvent(new MessageEvent('message', {
      data: { panelId: 'editor', type: 'workspace-panel-attached' },
      origin: window.location.origin,
    }))
    await nextTick()

    expect(wrapper.get('[aria-label="Editor"]').exists()).toBe(true)

    wrapper.unmount()
  })

  it('reattaches a panel when its popout window closes', () => {
    const pinia = createPinia()
    const opener = { postMessage: vi.fn() }
    const openerDescriptor = Object.getOwnPropertyDescriptor(window, 'opener')

    Object.defineProperty(window, 'opener', {
      configurable: true,
      value: opener,
    })

    const wrapper = mount(WorkspaceViewport, {
      global: {
        plugins: [createVuetify(), pinia],
      },
      props: {
        popoutPanel: 'editor',
      },
    })

    window.dispatchEvent(new PageTransitionEvent('pagehide'))

    expect(opener.postMessage).toHaveBeenCalledWith(
      { panelId: 'editor', type: 'workspace-panel-attached' },
      window.location.origin,
    )

    wrapper.unmount()
    Object.defineProperty(window, 'opener', openerDescriptor ?? { value: null })
  })

  it('hides a closable sheet and redistributes its space', async () => {
    const pinia = createPinia()
    const wrapper = mount(WorkspaceViewport, {
      global: {
        plugins: [createVuetify(), pinia],
      },
    })
    const userPreferencesStore = useUserPreferencesStore(pinia)

    await wrapper.get('button[aria-label="Hide Primary sidebar"]').trigger('click')
    await nextTick()

    expect(userPreferencesStore.layout.primarySidebarVisible).toBe(false)
    expect(wrapper.find('[aria-label="Primary sidebar"]').exists()).toBe(false)
    expect(wrapper.element.style.getPropertyValue('--workspace-grid-areas')).toBe('\'editor secondary\' \'panel panel\'')

    wrapper.unmount()
  })

  it('resizes both associated tracks from a gutter intersection and persists the dimensions', async () => {
    const pinia = createPinia()
    const wrapper = mount(WorkspaceViewport, {
      global: {
        plugins: [createVuetify(), pinia],
      },
    })
    const userPreferencesStore = useUserPreferencesStore(pinia)
    const geometryMock = mockWorkspaceGeometry(
      wrapper.get('[aria-label="Workspace viewport"]').element as HTMLElement,
    )

    window.dispatchEvent(new Event('resize'))
    await nextTick()

    const cornerHandle = wrapper.get('[data-resize-handle="corner-primary-sidebar"]')

    expect(cornerHandle.classes()).toContain('workspace-resize-handle-corner')

    cornerHandle.element.dispatchEvent(new MouseEvent('mousedown', {
      bubbles: true,
      button: 0,
      clientX: 292,
      clientY: 620,
    }))
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 352, clientY: 580 }))
    await nextTick()

    expect(wrapper.get('[data-resize-handle="vertical-primary-sidebar"]').classes()).toContain('is-resizing')
    expect(wrapper.get('[data-resize-handle="horizontal-bottom-panel"]').classes()).toContain('is-resizing')
    expect(wrapper.element.style.getPropertyValue('--workspace-grid-columns')).toContain('minmax(160px, 340px)')
    expect(wrapper.element.style.getPropertyValue('--workspace-grid-rows')).toBe('minmax(0, 1fr) minmax(156px, 260px)')

    window.dispatchEvent(new MouseEvent('mouseup'))
    await nextTick()

    expect(userPreferencesStore.layout.primarySidebarWidth).toBe(340)
    expect(userPreferencesStore.layout.panelHeight).toBe(260)

    wrapper.unmount()
    geometryMock.mockRestore()
  })
})
