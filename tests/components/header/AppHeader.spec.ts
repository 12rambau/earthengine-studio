import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { createVuetify } from 'vuetify'
import { VApp } from 'vuetify/components'
import AppHeader from '@/components/header/AppHeader.vue'

describe('AppHeader', () => {
  it('renders the application logo and name', () => {
    const wrapper = mount({
      components: { AppHeader, VApp },
      template: '<VApp><AppHeader /></VApp>',
    }, {
      global: {
        plugins: [createVuetify(), createPinia()],
      },
    })
    const logo = wrapper.get('img[alt="Earth Engine Studio logo"]')

    expect(logo.attributes('src')).toContain('/src/assets/logo.png')
    expect(logo.attributes('height')).toBe('32')
    expect(logo.attributes('width')).toBe('32')
    expect(wrapper.text()).toContain('Earth Engine Studio')

    wrapper.unmount()
  })
})
