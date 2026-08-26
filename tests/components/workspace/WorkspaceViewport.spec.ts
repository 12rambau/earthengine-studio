import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import WorkspaceViewport from '@/components/workspace/WorkspaceViewport.vue'
import { useUserPreferencesStore } from '@/stores/userPreferences'

describe('WorkspaceViewport', () => {
  it('renders the four workspace regions', () => {
    const pinia = createPinia()
    const wrapper = mount(WorkspaceViewport, {
      global: {
        plugins: [pinia],
      },
    })

    const regions = [
      wrapper.get('[aria-label="Primary sidebar"]'),
      wrapper.get('[aria-label="Secondary sidebar"]'),
      wrapper.get('[aria-label="Editor"]'),
      wrapper.get('[aria-label="Bottom panel"]'),
    ]

    expect(regions).toHaveLength(4)
    expect(regions.every(region => region.element.childElementCount === 0)).toBe(true)

    wrapper.unmount()
  })

  it('updates visible regions and sidebar placement from layout preferences', async () => {
    const pinia = createPinia()
    const wrapper = mount(WorkspaceViewport, {
      global: {
        plugins: [pinia],
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
})
