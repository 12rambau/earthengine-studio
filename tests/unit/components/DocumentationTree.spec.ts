import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DocumentationTree from '@/components/workspace-viewport/primary-sidebar/DocumentationTree.vue'

describe('DocumentationTree', () => {
  it('explains that authentication is required instead of displaying a perpetual loading state', () => {
    const wrapper = mount(DocumentationTree, {
      global: {
        stubs: {
          VCard: { template: '<section><slot /></section>' },
          VCardText: { template: '<div><slot /></div>' },
          VProgressCircular: true,
          VTreeview: true,
        },
      },
    })

    expect(wrapper.text()).toContain('Earth Engine authentication is required to load API docs.')
    expect(wrapper.html()).not.toContain('v-progress-circular')
  })
})
