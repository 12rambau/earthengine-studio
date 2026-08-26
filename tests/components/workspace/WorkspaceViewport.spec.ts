import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createVuetify } from 'vuetify'
import WorkspaceViewport from '@/components/workspace/WorkspaceViewport.vue'
import { useUserPreferencesStore } from '@/stores/userPreferences'

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
    expect(wrapper.element.style.getPropertyValue('--workspace-grid-columns')).toBe('minmax(0, 1fr) minmax(0, 1fr)')

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
})
