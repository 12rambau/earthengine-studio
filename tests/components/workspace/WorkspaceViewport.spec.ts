import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import WorkspaceViewport from '@/components/workspace/WorkspaceViewport.vue'

describe('WorkspaceViewport', () => {
  it('renders the four workspace regions', () => {
    const wrapper = mount(WorkspaceViewport)

    const regions = [
      wrapper.get('[aria-label="Primary sidebar"]'),
      wrapper.get('[aria-label="Secondary sidebar"]'),
      wrapper.get('[aria-label="Editor"]'),
      wrapper.get('[aria-label="Bottom panel"]'),
    ]

    expect(regions).toHaveLength(4)
    expect(regions.every(region => region.element.childElementCount === 0)).toBe(true)

    wrapper.unmount()
  })
})
