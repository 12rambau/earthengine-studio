import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import PrimarySidebar from '@/components/workspace-viewport/PrimarySidebar.vue'

/** Emits one selected public dataset so the primary-sidebar preview flow can be verified. */
const CatalogTree = defineComponent({
  name: 'CatalogTree',
  emits: ['preview'],
  template: '<button @click="$emit(\'preview\', { assetName: \'TEST/DATASET\', catalogHref: \'https://datasets.test/TEST_DATASET\', source: \'stac\', stacHref: \'https://catalog.test/dataset.json\', tags: [], title: \'Dataset\', type: \'image\' })">Preview dataset</button>',
})

/** Shows the props received by the preview child without rendering dialog implementation details. */
const CatalogPreviewDialog = defineComponent({
  name: 'CatalogPreviewDialog',
  props: {
    modelValue: Boolean,
    target: Object,
  },
  template: '<div v-if="modelValue" data-preview-dialog>{{ target?.title }}</div>',
})

/** Preserves the primary-sidebar slots while avoiding workspace layout behavior in this integration test. */
const WorkspaceSheet = defineComponent({
  name: 'WorkspaceSheet',
  template: '<section><slot name="header" /><slot /></section>',
})

describe('PrimarySidebar', () => {
  it('opens the dataset preview dialog when the catalog tree selects a dataset', async () => {
    const wrapper = mount(PrimarySidebar, {
      props: { isFullscreen: false },
      global: {
        stubs: {
          CatalogPreviewDialog,
          CatalogTree,
          DocumentationTree: true,
          VTab: true,
          VTabs: { template: '<div><slot /></div>' },
          VTabsWindow: { template: '<div><slot /></div>' },
          VTabsWindowItem: { template: '<div><slot /></div>' },
          WorkspaceSheet,
        },
      },
    })

    await wrapper.get('button').trigger('click')

    expect(wrapper.get('[data-preview-dialog]').text()).toBe('Dataset')
  })
})
