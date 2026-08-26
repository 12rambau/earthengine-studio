import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { createVuetify } from 'vuetify'
import LayoutCustomizationMenu from '@/components/header/LayoutCustomizationMenu.vue'
import { useUserPreferencesStore } from '@/stores/userPreferences'

describe('LayoutCustomizationMenu', () => {
  it('updates layout preferences from its controls', async () => {
    const pinia = createPinia()
    const wrapper = mount(LayoutCustomizationMenu, {
      attachTo: document.body,
      global: {
        plugins: [createVuetify(), pinia],
      },
    })
    const userPreferencesStore = useUserPreferencesStore(pinia)

    await wrapper.get('[aria-label="Customize layout"]').trigger('click')
    await nextTick()

    document.body.querySelector<HTMLElement>('[aria-label="Toggle primary sidebar"]')?.click()
    document.body.querySelector<HTMLElement>('[aria-label="Set primary sidebar position to right"]')?.click()
    document.body.querySelector<HTMLElement>('[aria-label="Set panel alignment to center"]')?.click()
    await nextTick()

    expect(userPreferencesStore.layout.primarySidebarVisible).toBe(false)
    expect(userPreferencesStore.layout.primarySidebarPosition).toBe('right')
    expect(userPreferencesStore.layout.panelAlignment).toBe('center')

    wrapper.unmount()
  })
})
