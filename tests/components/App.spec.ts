import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { createVuetify } from 'vuetify'
import App from '@/App.vue'

describe('App', () => {
  it('composes the header and workspace viewport', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createVuetify(), createPinia()],
      },
    })

    expect(wrapper.get('header').exists()).toBe(true)
    expect(wrapper.get('[aria-label="Workspace viewport"]').exists()).toBe(true)

    wrapper.unmount()
  })

  it('toggles layout regions with the VS Code keyboard shortcuts', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createVuetify(), createPinia()],
      },
    })

    window.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ctrlKey: true, key: 'b' }))
    await nextTick()
    expect(wrapper.find('[aria-label="Primary sidebar"]').exists()).toBe(false)

    window.dispatchEvent(new KeyboardEvent('keydown', {
      altKey: true,
      bubbles: true,
      ctrlKey: true,
      key: 'b',
    }))
    await nextTick()
    expect(wrapper.find('[aria-label="Secondary sidebar"]').exists()).toBe(false)

    window.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ctrlKey: true, key: 'j' }))
    await nextTick()
    expect(wrapper.find('[aria-label="Bottom panel"]').exists()).toBe(false)

    wrapper.unmount()
  })
})
