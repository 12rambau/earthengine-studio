import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import KeyboardShortcutsDialog from '@/components/app-header/avatar-menu/KeyboardShortcutsDialog.vue'
import LayoutPreferenceDialog from '@/components/app-header/avatar-menu/LayoutPreferenceDialog.vue'
import ThemeSelectorDialog from '@/components/app-header/avatar-menu/ThemeSelectorDialog.vue'

/** Preserves the overlay props and slots needed to assert each dialog's shared positioning contract. */
const VDialog = defineComponent({
  name: 'VDialog',
  props: [
    'location',
    'locationStrategy',
    'maxWidth',
    'origin',
    'target',
    'viewportMargin',
    'width',
  ],
  template: '<div><slot name="activator" :props="{}" /><slot /></div>',
})

/** Exposes the card rounding used by each menu dialog. */
const VCard = defineComponent({
  name: 'VCard',
  props: ['rounded'],
  template: '<div><slot /></div>',
})

/** Exposes the header sheet height used by each menu dialog. */
const VSheet = defineComponent({
  name: 'VSheet',
  props: ['height'],
  template: '<div><slot /></div>',
})

/** Provides the lightweight Vuetify component surface needed by the preference dialog tests. */
const vuetifyStubs = {
  VCard,
  VChip: true,
  VDialog,
  VDivider: true,
  VIcon: true,
  VList: { template: '<div><slot /></div>' },
  VListItem: { template: '<div><slot /></div>' },
  VListSubheader: true,
  VSheet,
}

/** Identifies all account-menu dialogs that share the header search anchoring contract. */
const dialogs = [
  { component: ThemeSelectorDialog, name: 'appearance' },
  { component: LayoutPreferenceDialog, name: 'layout' },
  { component: KeyboardShortcutsDialog, name: 'keyboard shortcuts' },
]

describe('Avatar menu dialogs', () => {
  for (const dialogDefinition of dialogs) {
    it(`anchors ${dialogDefinition.name} over the catalog search field`, () => {
      const wrapper = mount(dialogDefinition.component, {
        global: {
          plugins: [createPinia()],
          stubs: vuetifyStubs,
        },
      })
      const dialog = wrapper.getComponent(VDialog)

      expect(dialog.props()).toMatchObject({
        location: 'top',
        locationStrategy: 'connected',
        maxWidth: 'calc(100vw - 112px)',
        origin: 'overlap',
        target: '.catalog-search-field .v-field',
        viewportMargin: '0',
        width: '480',
      })
      expect(wrapper.getComponent(VCard).props('rounded')).toBe('md')
      expect(wrapper.getComponent(VSheet).props('height')).toBe('24')
    })
  }
})
