import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createVuetify } from 'vuetify'
import WorkspaceSheet from '@/components/workspace/WorkspaceSheet.vue'

describe('WorkspaceSheet', () => {
  it('emits actions from its header controls', async () => {
    const wrapper = mount(WorkspaceSheet, {
      global: {
        plugins: [createVuetify()],
      },
      props: {
        isDetached: false,
        isFullscreen: false,
        title: 'Editor',
      },
    })

    await wrapper.get('button[aria-label="Fullscreen Editor"]').trigger('click')
    await wrapper.get('button[aria-label="Open Editor in new window"]').trigger('click')
    await wrapper.get('button[aria-label="Hide Editor"]').trigger('click')

    expect(wrapper.emitted('toggle-fullscreen')).toHaveLength(1)
    expect(wrapper.emitted('open-in-new-window')).toHaveLength(1)
    expect(wrapper.emitted('close')).toHaveLength(1)

    await wrapper.setProps({ isClosable: false })

    expect(wrapper.find('button[aria-label="Hide Editor"]').exists()).toBe(false)

    await wrapper.setProps({ isDetached: true })

    expect(wrapper.find('button[aria-label="Fullscreen Editor"]').exists()).toBe(false)
    expect(wrapper.find('button[aria-label="Open Editor in new window"]').exists()).toBe(false)
    expect(wrapper.find('button[aria-label="Attach Editor to workspace"]').exists()).toBe(false)

    wrapper.unmount()
  })
})
