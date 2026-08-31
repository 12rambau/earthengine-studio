<template>
  <workspace-sheet
    class="primary"
    :is-fullscreen="isFullscreen"
    title="Primary sidebar"
    @close="emit('close')"
    @toggle-fullscreen="emit('toggle-fullscreen')"
  >
    <template #header>
      <v-tabs
        v-model="activeTab"
        aria-label="Primary sidebar tabs"
        class="my-1"
        density="compact"
        height="24"
        hide-slider
      >
        <v-tab
          class="primary-sidebar-tab"
          :class="{ 'primary-sidebar-tab--inactive': activeTab !== 'catalog' }"
          density="compact"
          min-width="0"
          rounded="sm"
          size="x-small"
          slim
          text="Catalog"
          value="catalog"
          :variant="activeTab === 'catalog' ? 'tonal' : 'text'"
        />

        <v-tab
          class="ms-1 primary-sidebar-tab"
          :class="{ 'primary-sidebar-tab--inactive': activeTab !== 'documentation' }"
          density="compact"
          min-width="0"
          rounded="sm"
          size="x-small"
          slim
          text="Docs"
          value="documentation"
          :variant="activeTab === 'documentation' ? 'tonal' : 'text'"
        />

        <v-tab
          class="ms-1 primary-sidebar-tab"
          :class="{ 'primary-sidebar-tab--inactive': activeTab !== 'assets' }"
          density="compact"
          min-width="0"
          rounded="sm"
          size="x-small"
          slim
          text="Assets"
          value="assets"
          :variant="activeTab === 'assets' ? 'tonal' : 'text'"
        />

        <v-tab
          class="ms-1 primary-sidebar-tab"
          :class="{ 'primary-sidebar-tab--inactive': activeTab !== 'scripts' }"
          density="compact"
          min-width="0"
          rounded="sm"
          size="x-small"
          slim
          text="Scripts"
          value="scripts"
          :variant="activeTab === 'scripts' ? 'tonal' : 'text'"
        />
      </v-tabs>
    </template>

    <v-tabs-window v-model="activeTab">
      <v-tabs-window-item value="catalog">
        <catalog-tree
          :active="activeTab === 'catalog'"
          @preview="openCatalogPreview"
        />
      </v-tabs-window-item>

      <v-tabs-window-item value="documentation">
        <documentation-tree :active="activeTab === 'documentation'" />
      </v-tabs-window-item>

      <v-tabs-window-item value="assets">
        <assets-tree
          :active="activeTab === 'assets'"
          @preview="openAssetPreview"
        />
      </v-tabs-window-item>

      <v-tabs-window-item value="scripts">
        <scripts-tree />
      </v-tabs-window-item>
    </v-tabs-window>

    <catalog-preview-dialog
      v-model="isCatalogPreviewOpen"
      :target="catalogPreviewTarget"
    />

    <image-preview-dialog
      v-model="isImagePreviewOpen"
      :asset-id="assetPreviewId"
    />

    <image-collection-preview-dialog
      v-model="isImageCollectionPreviewOpen"
      :asset-id="assetPreviewId"
      @preview-image="openImagePreview"
    />

    <feature-collection-preview-dialog
      v-model="isFeatureCollectionPreviewOpen"
      :asset-id="assetPreviewId"
    />
  </workspace-sheet>
</template>

<script lang="ts" setup>
  import type { CatalogPreviewTarget } from './primary-sidebar/catalog'
  /** Adapts the shared workspace sheet to represent the closable primary sidebar. */
  import { computed, ref } from 'vue'
  import AssetsTree from './primary-sidebar/AssetsTree.vue'
  import CatalogPreviewDialog from './primary-sidebar/CatalogPreviewDialog.vue'
  import CatalogTree from './primary-sidebar/CatalogTree.vue'
  import DocumentationTree from './primary-sidebar/DocumentationTree.vue'
  import FeatureCollectionPreviewDialog from './primary-sidebar/FeatureCollectionPreviewDialog.vue'
  import ImageCollectionPreviewDialog from './primary-sidebar/ImageCollectionPreviewDialog.vue'
  import ImagePreviewDialog from './primary-sidebar/ImagePreviewDialog.vue'
  import ScriptsTree from './primary-sidebar/ScriptsTree.vue'
  import WorkspaceSheet from './WorkspaceSheet.vue'

  /** Declares the presentation state owned by the workspace viewport. */
  defineProps<{
    /** Indicates that the primary sidebar currently occupies the fullscreen workspace view. */
    isFullscreen: boolean
  }>()

  /** Identifies the primary-sidebar tab currently displayed in the content area, beginning with the public catalog. */
  const activeTab = ref('catalog')

  /** Holds the dataset whose public metadata is currently displayed by the primary-sidebar dialog. */
  const catalogPreviewTarget = ref<CatalogPreviewTarget | null>(null)

  /** Determines whether the selected dataset's preview dialog is visible. */
  const isCatalogPreviewOpen = ref(false)

  /** Holds the canonical asset ID selected from the authenticated asset tree. */
  const assetPreviewId = ref<string | null>(null)

  /** Holds the Earth Engine type used to route the selected asset to its specialized dialog. */
  const assetPreviewType = ref<string | null>(null)

  /** Determines whether any authenticated asset preview is visible. */
  const isAssetPreviewOpen = ref(false)

  /** Controls the dedicated image dialog only while the selected asset is an IMAGE. */
  const isImagePreviewOpen = computed({
    get: () => isAssetPreviewOpen.value && assetPreviewType.value === 'IMAGE',
    set: value => {
      if (!value) {
        isAssetPreviewOpen.value = false
      }
    },
  })

  /** Controls the collection dialog only while the selected asset is an IMAGE_COLLECTION. */
  const isImageCollectionPreviewOpen = computed({
    get: () => isAssetPreviewOpen.value && assetPreviewType.value === 'IMAGE_COLLECTION',
    set: value => {
      if (!value) {
        isAssetPreviewOpen.value = false
      }
    },
  })

  /** Controls the vector dialog for the Earth Engine TABLE representation of a FeatureCollection. */
  const isFeatureCollectionPreviewOpen = computed({
    get: () => isAssetPreviewOpen.value && ['TABLE', 'FEATURE_COLLECTION'].includes(assetPreviewType.value ?? ''),
    set: value => {
      if (!value) {
        isAssetPreviewOpen.value = false
      }
    },
  })

  /** Selects a public catalog dataset and makes its detailed preview visible. */
  function openCatalogPreview (target: CatalogPreviewTarget) {
    catalogPreviewTarget.value = target
    isCatalogPreviewOpen.value = true
  }

  /** Routes a selected asset ID to its type-specific preview dialog when Earth Engine supports one. */
  function openAssetPreview (assetId: string, assetType: string) {
    if (!['IMAGE', 'IMAGE_COLLECTION', 'TABLE', 'FEATURE_COLLECTION'].includes(assetType)) {
      return
    }

    assetPreviewId.value = assetId
    assetPreviewType.value = assetType
    isAssetPreviewOpen.value = true
  }

  /** Opens the image dialog for a child asset selected from an image collection preview. */
  function openImagePreview (assetId: string) {
    openAssetPreview(assetId, 'IMAGE')
  }

  /** Forwards primary sidebar actions to the workspace viewport. */
  const emit = defineEmits<{
    /** Requests that the workspace hide the primary sidebar. */
    'close': []

    /** Requests that the workspace toggle the primary sidebar fullscreen state. */
    'toggle-fullscreen': []
  }>()
</script>

<style scoped>
  .primary-sidebar-tab.v-tab--selected {
    color: rgb(var(--v-theme-primary));
  }

  .primary-sidebar-tab--inactive {
    color: color-mix(in srgb, rgb(var(--v-theme-on-background)) calc(var(--v-medium-emphasis-opacity) * 100%), transparent);
  }
</style>
