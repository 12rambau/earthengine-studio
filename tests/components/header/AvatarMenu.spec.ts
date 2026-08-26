import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { createVuetify } from 'vuetify'
import AvatarMenu from '@/components/header/AvatarMenu.vue'

function mountAvatarMenu () {
  const vuetify = createVuetify({
    theme: {
      defaultTheme: 'light',
    },
  })
  const wrapper = mount(AvatarMenu, {
    attachTo: document.body,
    global: {
      plugins: [vuetify, createPinia()],
    },
  })

  return { wrapper }
}

describe('AvatarMenu', () => {
  it('renders an accessible user menu activator', () => {
    const { wrapper } = mountAvatarMenu()

    expect(wrapper.get('button[aria-label="Open user menu"]').exists()).toBe(true)

    wrapper.unmount()
  })

  it('offers layout customization in the user menu', async () => {
    const { wrapper } = mountAvatarMenu()

    await wrapper.get('button[aria-label="Open user menu"]').trigger('click')
    await nextTick()

    expect(document.body.querySelector('[aria-label="Customize layout"]')).not.toBeNull()

    wrapper.unmount()
  })

  it('opens a dialog listing the available keyboard shortcuts', async () => {
    const { wrapper } = mountAvatarMenu()

    await wrapper.get('button[aria-label="Open user menu"]').trigger('click')
    await nextTick()
    document.body.querySelector<HTMLElement>('[aria-label="Open keyboard shortcuts"]')?.click()
    await nextTick()

    const dialog = document.body.querySelector('[aria-label="Keyboard shortcuts dialog"]')

    expect(dialog?.textContent).toContain('Toggle primary sidebar')
    expect(dialog?.textContent).toContain('Toggle secondary sidebar')
    expect(dialog?.textContent).toContain('Toggle panel')
    expect(dialog?.textContent).toContain('Ctrl')
    expect(dialog?.textContent).toContain('Alt')

    wrapper.unmount()
  })
})
