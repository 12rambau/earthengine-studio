import type { CatalogPreviewTarget, StacCollection } from '@/components/workspace-viewport/primary-sidebar/catalog'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import CatalogPreviewDialog from '@/components/workspace-viewport/primary-sidebar/CatalogPreviewDialog.vue'

/** Controls the public catalog boundary so each dialog state can be rendered deterministically. */
const catalogMocks = vi.hoisted(() => ({
  fetchCatalogCollection: vi.fn(),
  getCatalogAssetPresentation: vi.fn(),
}))

vi.mock('@/components/workspace-viewport/primary-sidebar/catalog', () => catalogMocks)

/** Displays component slots and passed metadata without requiring Vuetify rendering in this focused test. */
const SlotStub = defineComponent({
  template: '<div><slot /></div>',
})

/** Renders list-item metadata as text so preview values can be asserted without Vuetify internals. */
const VListItem = defineComponent({
  props: {
    subtitle: String,
    title: String,
  },
  template: '<div>{{ title }}: {{ subtitle }}</div>',
})

/** Renders the snippet field's current value and action slot in the dialog test. */
const VTextField = defineComponent({
  props: {
    modelValue: String,
  },
  template: '<div>{{ modelValue }}<slot name="append-inner" /></div>',
})

/** Renders the externally linked catalog button as a normal anchor for assertion. */
const VBtn = defineComponent({
  props: {
    href: String,
    text: String,
  },
  template: '<a :href="href">{{ text }}<slot /></a>',
})

/** Renders the toolbar title so the loaded collection title remains observable in this focused test. */
const VToolbar = defineComponent({
  props: {
    title: String,
  },
  template: '<div>{{ title }}<slot name="prepend" /><slot name="append" /></div>',
})

/** Mounts the preview with lightweight structural stubs so the metadata surface remains testable. */
function mountPreview (target: CatalogPreviewTarget) {
  return mount(CatalogPreviewDialog, {
    props: {
      modelValue: true,
      target,
    },
    global: {
      stubs: {
        VBtn,
        VCard: SlotStub,
        VCardText: SlotStub,
        VChip: SlotStub,
        VChipGroup: SlotStub,
        VCol: SlotStub,
        VDialog: SlotStub,
        VIcon: true,
        VImg: true,
        VList: SlotStub,
        VListItem,
        VRow: SlotStub,
        VTab: true,
        VTable: SlotStub,
        VTabs: SlotStub,
        VTabsWindow: SlotStub,
        VTabsWindowItem: SlotStub,
        VTextField,
        VToolbar,
      },
    },
  })
}

/** Provides one stable official dataset tree target for the dialog's STAC states. */
const stacTarget: CatalogPreviewTarget = {
  assetName: 'TEST/DATASET',
  catalogHref: 'https://datasets.test/TEST_DATASET',
  source: 'stac',
  stacHref: 'https://catalog.test/dataset.json',
  tags: ['Google'],
  title: 'Dataset',
  type: 'image_collection',
}

/** Provides complete official collection metadata representative of the public STAC response. */
const collection: StacCollection = {
  'gee:type': 'image_collection',
  'description': 'An official dataset description.',
  'extent': {
    temporal: {
      interval: [['2000-01-01', null]],
    },
  },
  'keywords': ['climate', 'global'],
  'links': [{ href: 'https://images.test/preview.png', rel: 'preview' }],
  'providers': [{ name: 'Google' }],
  'summaries': {
    'eo:bands': [{ 'description': 'Visible red', 'gee:wavelength': '600-700nm', 'gsd': 30, 'name': 'red' }],
  },
  'title': 'Full dataset title',
}

describe('CatalogPreviewDialog', () => {
  beforeEach(() => {
    catalogMocks.fetchCatalogCollection.mockReset()
    catalogMocks.getCatalogAssetPresentation.mockReturnValue({ icon: 'mdi-image-multiple' })
  })

  it('loads and renders the public STAC metadata for an official dataset', async () => {
    catalogMocks.fetchCatalogCollection.mockResolvedValue(collection)

    const wrapper = mountPreview(stacTarget)

    await flushPromises()

    expect(catalogMocks.fetchCatalogCollection).toHaveBeenCalledWith(stacTarget.stacHref)
    expect(wrapper.text()).toContain('Full dataset title')
    expect(wrapper.text()).toContain('TEST/DATASET')
    expect(wrapper.text()).toContain('2000-01-01 - Ongoing')
    expect(wrapper.text()).toContain('ee.ImageCollection("TEST/DATASET")')
    expect(wrapper.text()).toContain('An official dataset description.')
    expect(wrapper.text()).toContain('Visible red')
    expect(wrapper.get('a[href="https://datasets.test/TEST_DATASET"]').text()).toContain('Open catalog page')
  })

  it('makes a failed official metadata request visible', async () => {
    catalogMocks.fetchCatalogCollection.mockRejectedValue(new Error('Unavailable'))

    const wrapper = mountPreview(stacTarget)

    await flushPromises()

    expect(wrapper.text()).toContain('Unable to load the public dataset details.')
  })

  it('renders a community dataset from its manifest without requesting STAC metadata', async () => {
    const wrapper = mountPreview({
      assetName: 'projects/community/assets/dataset',
      catalogHref: 'https://community.test/dataset',
      description: 'A community dataset description.',
      previewHref: 'https://images.test/community.png',
      provider: 'Community provider',
      source: 'community',
      tags: ['Climate', 'precipitation'],
      title: 'Community dataset',
      type: 'image',
    })

    await flushPromises()

    expect(catalogMocks.fetchCatalogCollection).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Community provider')
    expect(wrapper.text()).toContain('A community dataset description.')
    expect(wrapper.text()).toContain('ee.Image("projects/community/assets/dataset")')
  })
})
