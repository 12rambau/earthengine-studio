import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import CatalogSearch from '@/components/app-header/CatalogSearch.vue'

/** Provides controllable catalog responses for header-search behavior tests. */
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

/** Renders a writable input while retaining the activator contract required by the menu. */
const VTextField = defineComponent({
  name: 'VTextField',
  props: { modelValue: String },
  emits: ['update:modelValue'],
  setup (_, { expose }) {
    const input = ref<HTMLInputElement>()

    function focus () {
      input.value?.focus()
    }

    expose({ focus })

    return { input }
  },
  template: '<input ref="input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)">',
})

/** Renders list item metadata and visual type markers for focused assertions. */
const VListItem = defineComponent({
  name: 'VListItem',
  props: ['href', 'rel', 'subtitle', 'target', 'title'],
  template: '<a :href="href" :rel="rel" :target="target"><slot name="prepend" /><span>{{ title }}</span><small>{{ subtitle }}</small></a>',
})

/** Mounts header search with compact visual stubs while preserving list item contents. */
function mountCatalogSearch () {
  return mount(CatalogSearch, {
    attachTo: document.body,
    global: {
      stubs: {
        VCard: { template: '<section><slot /></section>' },
        VChip: true,
        VDivider: true,
        VIcon: { props: ['color', 'icon'], template: '<i :data-color="color" :data-icon="icon" />' },
        VList: { template: '<ul><slot /></ul>' },
        VListItem,
        VListSubheader: { template: '<li><slot /></li>' },
        VMenu: { template: '<div><slot name="activator" :props="{}" /><slot /></div>' },
        VProgressLinear: true,
        VTextField,
      },
    },
  })
}

describe('CatalogSearch', () => {
  beforeEach(() => {
    catalogMocks.buildCommunityThemes.mockImplementation((datasets: unknown[]) => [{
      datasets,
      title: 'Climate',
    }])
    catalogMocks.fetchCatalogEntries.mockImplementation((url: string) => {
      if (url === 'https://catalog.test/root.json') {
        return Promise.resolve([
          { href: 'https://catalog.test/google.json', title: 'Official source' },
          { href: 'https://catalog.test/publisher.json', title: 'Publisher source' },
        ])
      }

      return Promise.resolve([{ href: `${url}/dataset.json`, title: 'TEST_DATASET' }])
    })
    catalogMocks.fetchCatalogAssetType.mockImplementation((url: string) => {
      return Promise.resolve(url.includes('google') ? 'image' : 'image_collection')
    })
    catalogMocks.fetchCommunityDatasets.mockResolvedValue([
      {
        docs: 'https://community.test/dataset',
        id: 'community-dataset',
        thematic_group: 'Climate',
        title: 'Community dataset',
        type: 'feature_collection',
      },
    ])
    catalogMocks.fetchPublisherHrefs.mockResolvedValue(new Set(['https://catalog.test/publisher.json']))
    catalogMocks.getCatalogAssetPresentation.mockImplementation((type: string) => ({
      color: `color-${type}`,
      icon: `icon-${type}`,
    }))
    catalogMocks.getDatasetCatalogUrl.mockImplementation((id: string) => `https://datasets.test/${id}`)
  })

  it('searches names, asset names, and tags while grouping results by catalog category', async () => {
    const wrapper = mountCatalogSearch()
    const field = wrapper.get('input')

    expect(catalogMocks.fetchCatalogEntries).not.toHaveBeenCalled()

    await field.setValue('test')
    await flushPromises()

    expect(wrapper.text()).toContain('Results: 2')
    expect(wrapper.text()).toContain('Google: 1')
    expect(wrapper.text()).toContain('Publishers: 1')
    expect(wrapper.text()).toContain('Community: 0')
    expect(wrapper.text()).toContain('Google')
    expect(wrapper.text()).toContain('Publishers')
    expect(wrapper.text()).toContain('TEST_DATASET')
    expect(wrapper.findAll('small').map(element => element.text())).toEqual(['TEST_DATASET', 'TEST_DATASET'])
    expect(wrapper.findAll('i').map(element => element.attributes('data-icon'))).toEqual([
      'icon-image',
      'icon-image_collection',
    ])

    await field.setValue('climate')

    expect(wrapper.text()).toContain('Results: 1')
    expect(wrapper.text()).toContain('Google: 0')
    expect(wrapper.text()).toContain('Publishers: 0')
    expect(wrapper.text()).toContain('Community: 1')
    expect(wrapper.text()).toContain('Community')
    expect(wrapper.text()).toContain('Community dataset')
    expect(wrapper.get('small').text()).toBe('community-dataset')
    expect(wrapper.get('i').attributes()).toMatchObject({
      'data-color': 'color-feature_collection',
      'data-icon': 'icon-feature_collection',
    })

    wrapper.unmount()
  })

  it('focuses the search field when Ctrl+K is pressed', () => {
    const wrapper = mountCatalogSearch()
    const shortcut = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      key: 'k',
    })

    window.dispatchEvent(shortcut)

    expect(shortcut.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(wrapper.get('input').element)

    wrapper.unmount()
  })
})
