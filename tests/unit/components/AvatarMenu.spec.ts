import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import AvatarMenu from '@/components/app-header/AvatarMenu.vue'
import { useGoogleAuthStore } from '@/stores/googleAuth'

/** Simulates the wrapper's ready token client without loading Google Identity Services in unit tests. */
const googleSignIn = vi.hoisted(() => {
  const login = vi.fn()

  return {
    login,
    useTokenClient: vi.fn(() => ({
      isReady: { value: true },
      login,
    })),
  }
})

vi.mock('vue3-google-signin', () => ({ useTokenClient: googleSignIn.useTokenClient }))

/** Renders menu slots while exposing the activator's event bindings to the account-menu tests. */
const VMenu = defineComponent({
  name: 'VMenu',
  template: '<div><slot name="activator" :props="{}" /><slot /></div>',
})

/** Renders button labels and disabled state without requiring Vuetify overlay behavior. */
const VListItem = defineComponent({
  name: 'VListItem',
  props: {
    disabled: Boolean,
    subtitle: String,
    title: String,
  },
  template: '<button v-bind="$attrs" :disabled="disabled"><span>{{ title }}</span><span>{{ subtitle }}</span><slot /></button>',
})

/** Renders the avatar image source as a testable data attribute. */
const VAvatar = defineComponent({
  name: 'VAvatar',
  props: {
    image: String,
  },
  template: '<div class="avatar" :data-image="image"><slot /></div>',
})

/** Provides the minimal Vuetify component surface required by the account-menu tests. */
const vuetifyStubs = {
  KeyboardShortcutsDialog: true,
  LayoutPreferenceDialog: true,
  ThemeSelectorDialog: true,
  VAvatar,
  VBtn: { template: '<button v-bind="$attrs"><slot /></button>' },
  VDivider: true,
  VIcon: true,
  VList: { template: '<div><slot /></div>' },
  VListItem,
  VListSubheader: true,
  VMenu,
}

/** Mounts the account menu with a fresh Google OAuth session store. */
function mountAvatarMenu () {
  const pinia = createPinia()

  setActivePinia(pinia)

  return mount(AvatarMenu, {
    global: {
      plugins: [pinia],
      stubs: vuetifyStubs,
    },
  })
}

describe('AvatarMenu', () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('disables Google connection when the browser client identifier is absent', () => {
    const wrapper = mountAvatarMenu()

    expect(wrapper.get('[aria-label="Connect Google account"]').attributes('disabled')).toBeDefined()
  })

  it('displays the signed-in Google account name, email, and profile picture', () => {
    const pinia = createPinia()

    setActivePinia(pinia)

    const googleAuthStore = useGoogleAuthStore()

    googleAuthStore.profile = {
      email: 'ada@example.com',
      name: 'Ada Lovelace',
      picture: 'https://example.com/ada.png',
      subject: 'google-subject',
    }
    const wrapper = mount(AvatarMenu, {
      global: {
        plugins: [pinia],
        stubs: vuetifyStubs,
      },
    })

    expect(wrapper.get('[aria-label="Open account menu for Ada Lovelace"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Ada Lovelace')
    expect(wrapper.text()).toContain('ada@example.com')
    expect(wrapper.findAll('.avatar').some(avatar => avatar.attributes('data-image') === 'https://example.com/ada.png')).toBe(true)
    expect(wrapper.get('[aria-label="Sign out from Google account"]').exists()).toBe(true)
  })

  it('starts the Vue Google Sign-In token flow from the connection action', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'earthengine-studio.apps.googleusercontent.com')

    const wrapper = mountAvatarMenu()

    expect(googleSignIn.useTokenClient).toHaveBeenCalledTimes(1)

    await wrapper.get('[aria-label="Connect Google account"]').trigger('click')

    expect(googleSignIn.login).toHaveBeenCalledWith({ prompt: 'select_account' })
  })
})
