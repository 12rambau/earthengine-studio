import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it } from 'vitest'
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
})
