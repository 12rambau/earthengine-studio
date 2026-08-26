import { mount } from '@vue/test-utils'
import Cookies from 'js-cookie'
import { createPinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createVuetify } from 'vuetify'
import App from '@/App.vue'
import { themePreferenceKey } from '@/stores/userPreferences'

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

  it('applies the saved theme preference for every application instance', () => {
    const vuetify = createVuetify({
      theme: {
        defaultTheme: 'light',
      },
    })
    const changeTheme = vi.spyOn(vuetify.theme, 'change')

    Cookies.set(themePreferenceKey, 'dark', { path: '/' })

    const wrapper = mount(App, {
      global: {
        plugins: [vuetify, createPinia()],
      },
    })

    expect(changeTheme).toHaveBeenCalledWith('dark')

    wrapper.unmount()
    Cookies.remove(themePreferenceKey, { path: '/' })
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
