import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BottomPanel from '@/components/workspace/BottomPanel.vue'
import EditorPane from '@/components/workspace/EditorPane.vue'
import PrimarySidebar from '@/components/workspace/PrimarySidebar.vue'
import SecondarySidebar from '@/components/workspace/SecondarySidebar.vue'

describe('workspace shells', () => {
  it('renders every workspace region as an empty shell', () => {
    const shells = [
      { component: PrimarySidebar, label: 'Primary sidebar' },
      { component: SecondarySidebar, label: 'Secondary sidebar' },
      { component: EditorPane, label: 'Editor' },
      { component: BottomPanel, label: 'Bottom panel' },
    ]

    for (const { component, label } of shells) {
      const wrapper = mount(component)
      const region = wrapper.get(`[aria-label="${label}"]`)

      expect(region.element.childElementCount).toBe(0)
      expect(region.classes()).toContain('workspace-shell')

      wrapper.unmount()
    }
  })
})
