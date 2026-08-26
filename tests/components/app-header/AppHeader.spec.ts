import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { VApp } from 'vuetify/components'
import AppHeader from '@/components/AppHeader.vue'
import vuetify from '@/plugins/vuetify'

describe('AppHeader', () => {
  it('renders the application logo and name', () => {
    const wrapper = mount({
      components: { AppHeader, VApp },
      template: '<VApp><AppHeader /></VApp>',
    }, {
      global: {
        plugins: [vuetify, createPinia()],
      },
    })
    const logo = wrapper.get('img[alt="Earth Engine Studio logo"]')
    const appBar = wrapper.get('.v-app-bar')
    const appBarComponent = wrapper.getComponent({ name: 'VAppBar' })

    expect(appBar.classes()).toContain('v-toolbar--density-compact')
    expect(appBarComponent.props('height')).toBe('48')
    expect(appBar.get('.v-toolbar__content').attributes('style')).toContain('height: 32px')
    expect(logo.attributes('src')).toContain('/src/assets/logo.png')
    expect(logo.attributes('height')).toBe('24')
    expect(logo.attributes('width')).toBe('24')
    expect(appBar.get('.v-toolbar-title > div > span').classes()).toContain('d-flex')
    expect(appBar.get('.v-toolbar-title > div > span').classes()).toContain('align-center')
    expect(appBar.get('.v-toolbar-title').classes()).not.toContain('text-body-small')
    expect(appBar.get('.v-toolbar-title img').element).toBe(logo.element)
    expect(appBar.find('.v-toolbar__content > img').exists()).toBe(false)
    expect(wrapper.text()).toContain('Earth Engine Studio')

    wrapper.unmount()
  })
})
