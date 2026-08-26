import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createVuetify } from 'vuetify'
import BottomPanel from '@/components/workspace/BottomPanel.vue'
import EditorPane from '@/components/workspace/EditorPane.vue'
import PrimarySidebar from '@/components/workspace/PrimarySidebar.vue'
import SecondarySidebar from '@/components/workspace/SecondarySidebar.vue'

describe('workspace sheets', () => {
  it('renders every workspace region with the shared sheet controls', async () => {
    const shells = [
      { closable: true, component: PrimarySidebar, label: 'Primary sidebar' },
      { closable: true, component: SecondarySidebar, label: 'Secondary sidebar' },
      { closable: false, component: EditorPane, label: 'Editor' },
      { closable: true, component: BottomPanel, label: 'Bottom panel' },
    ]

    for (const { closable, component, label } of shells) {
      const wrapper = mount(component, {
        global: {
          plugins: [createVuetify()],
        },
        props: {
          isFullscreen: false,
        },
      })
      const region = wrapper.get(`[aria-label="${label}"]`)

      expect(region.get('h2').text()).toBe(label)
      expect(region.get(`button[aria-label="Fullscreen ${label}"]`).exists()).toBe(true)
      expect(region.get(`button[aria-label="Open ${label} in new window"]`).exists()).toBe(true)
      expect(region.find(`button[aria-label="Hide ${label}"]`).exists()).toBe(closable)

      if (closable) {
        await region.get(`button[aria-label="Hide ${label}"]`).trigger('click')

        expect(wrapper.emitted('close')).toHaveLength(1)
      }

      wrapper.unmount()
    }
  })
})
