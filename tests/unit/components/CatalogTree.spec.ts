import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import CatalogTree from '@/components/workspace-viewport/primary-sidebar/CatalogTree.vue'

/** Provides controllable responses for the public catalog data boundary. */
const catalogMocks = vi.hoisted(() => ({
  buildCommunityThemes: vi.fn(),
  fetchCatalogAssetType: vi.fn(),
  fetchCatalogEntries: vi.fn(),
  fetchCommunityDatasets: vi.fn(),
  fetchPublisherHrefs: vi.fn(),
  getCatalogAssetPresentation: vi.fn(),
  getDatasetCatalogUrl: vi.fn(),
}))

vi.mock('@/components/workspace-viewport/primary-sidebar/catalog', () => ({
  catalogUrl: 'https://catalog.test/root.json',
  ...catalogMocks,
}))

/** Renders the tree boundary while preserving the props asserted by this component test. */
const VTreeview = defineComponent({
  name: 'VTreeview',
  emits: ['click:select'],
  props: {
    items: { default: () => [], type: Array },
    loadChildren: Function,
  },
  template: '<div><button @click="$emit(\'click:select\', { id: items[0]?.children?.[0]?.children?.[0] })"></button><slot name="append" :item="items[0]?.children?.[0]?.children?.[0]" /></div>',
})

/** Mounts the catalog tree with minimal visual-component stubs for its asynchronous loading behavior. */
function mountCatalogTree (active: boolean) {
  return mount(CatalogTree, {
    props: { active },
    global: {
      stubs: {
        VCard: { template: '<section><slot /></section>' },
        VBtn: {
          props: ['href', 'rel', 'target'],
          template: '<a :href="href" :rel="rel" :target="target"></a>',
        },
        VTreeview,
      },
    },
  })
}

describe('CatalogTree', () => {
  beforeEach(() => {
    catalogMocks.buildCommunityThemes.mockReturnValue([
      {
        datasets: [
          {
            docs: 'https://community.test/dataset',
            id: 'community-dataset',
            thematic_group: 'Climate',
            title: 'Community dataset',
            type: 'image_collection',
          },
        ],
        title: 'Climate',
      },
    ])
    catalogMocks.fetchCatalogEntries.mockImplementation((url: string) => {
      if (url === 'https://catalog.test/root.json') {
        return Promise.resolve([
          { href: 'https://catalog.test/google.json', title: 'Google data' },
          { href: 'https://catalog.test/publisher.json', title: 'Publisher data' },
        ])
      }

      return Promise.resolve([
        { href: `${url}/dataset.json`, title: 'TEST_DATASET' },
      ])
    })
    catalogMocks.fetchCommunityDatasets.mockResolvedValue([])
    catalogMocks.fetchCatalogAssetType.mockImplementation((url: string) => {
      return Promise.resolve(url.includes('google') ? 'image' : 'image_collection')
    })
    catalogMocks.fetchPublisherHrefs.mockResolvedValue(new Set(['https://catalog.test/publisher.json']))
    catalogMocks.getCatalogAssetPresentation.mockImplementation((type: string) => {
      return type === 'image'
        ? { color: '#fbc02d', icon: 'mdi-image' }
        : { color: '#7e57c2', icon: 'mdi-image-multiple' }
    })
    catalogMocks.getDatasetCatalogUrl.mockImplementation((id: string) => `https://datasets.test/${id}`)
  })

  it('loads every branch once when its tab first becomes active', async () => {
    const wrapper = mountCatalogTree(false)

    expect(catalogMocks.fetchCatalogEntries).not.toHaveBeenCalled()

    await wrapper.setProps({ active: true })
    await flushPromises()

    const tree = wrapper.getComponent(VTreeview)

    expect(catalogMocks.fetchCatalogEntries).toHaveBeenCalledTimes(3)
    expect(catalogMocks.fetchCatalogAssetType).toHaveBeenCalledTimes(2)
    expect(catalogMocks.fetchCommunityDatasets).toHaveBeenCalledTimes(1)
    expect(tree.props('loadChildren')).toBeUndefined()
    expect(tree.props('items')).toMatchObject([
      {
        children: [
          {
            children: [{ icon: 'mdi-image', iconColor: '#fbc02d', title: 'DATASET' }],
            title: 'Google data',
          },
        ],
        title: 'Google',
      },
      {
        children: [
          {
            children: [{ icon: 'mdi-image-multiple', iconColor: '#7e57c2', title: 'DATASET' }],
            title: 'Publisher data',
          },
        ],
        title: 'Publishers',
      },
      {
        children: [
          {
            children: [{ icon: 'mdi-image-multiple', iconColor: '#7e57c2', title: 'Community dataset' }],
            title: 'Climate',
          },
        ],
        title: 'Community',
      },
    ])
    expect(wrapper.get('a').attributes('href')).toBe('https://datasets.test/TEST/DATASET')
    expect(wrapper.get('a').attributes('target')).toBe('_blank')

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('preview')).toEqual([[
      expect.objectContaining({
        assetName: 'TEST/DATASET',
        source: 'stac',
        stacHref: 'https://catalog.test/google.json/dataset.json',
      }),
    ]])

    await wrapper.setProps({ active: false })
    await wrapper.setProps({ active: true })
    await flushPromises()

    expect(catalogMocks.fetchCatalogEntries).toHaveBeenCalledTimes(3)
    expect(catalogMocks.fetchCatalogAssetType).toHaveBeenCalledTimes(2)
    expect(catalogMocks.fetchCommunityDatasets).toHaveBeenCalledTimes(1)
  })
})
