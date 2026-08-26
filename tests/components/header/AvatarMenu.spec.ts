import { mount } from '@vue/test-utils'
import Cookies from 'js-cookie'
import { createPinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createVuetify } from 'vuetify'
import AvatarMenu from '@/components/header/AvatarMenu.vue'
import { themePreferenceKey } from '@/stores/userPreferences'

function mountAvatarMenu () {
  const vuetify = createVuetify({
    theme: {
      defaultTheme: 'light',
    },
  })
  const changeTheme = vi.spyOn(vuetify.theme, 'change')
  const wrapper = mount(AvatarMenu, {
    attachTo: document.body,
    global: {
      plugins: [vuetify, createPinia()],
    },
  })

  return { changeTheme, wrapper }
}

describe('AvatarMenu', () => {
  it('renders an accessible user menu activator', () => {
    const { wrapper } = mountAvatarMenu()

    expect(wrapper.get('button[aria-label="Open user menu"]').exists()).toBe(true)

    wrapper.unmount()
  })

  it('applies the saved theme preference on mount', () => {
    Cookies.set(themePreferenceKey, 'dark', { path: '/' })
    const { changeTheme, wrapper } = mountAvatarMenu()

    expect(changeTheme).toHaveBeenCalledWith('dark')

    wrapper.unmount()
  })

  it('offers layout customization in the user menu', async () => {
    const { wrapper } = mountAvatarMenu()

    await wrapper.get('button[aria-label="Open user menu"]').trigger('click')
    await nextTick()

    expect(document.body.querySelector('[aria-label="Customize layout"]')).not.toBeNull()

    wrapper.unmount()
  })
})
