import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { createVuetify } from 'vuetify'
import AvatarMenu from '@/components/header/AvatarMenu.vue'
import { themePreferenceKey } from '@/components/header/theme'

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
      plugins: [vuetify],
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
    localStorage.setItem(themePreferenceKey, 'dark')
    const { changeTheme, wrapper } = mountAvatarMenu()

    expect(changeTheme).toHaveBeenCalledWith('dark')

    wrapper.unmount()
  })
})
