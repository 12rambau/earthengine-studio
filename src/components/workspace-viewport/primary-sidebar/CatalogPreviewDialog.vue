<template>
  <v-dialog
    v-model="isOpen"
    content-class="catalog-preview-dialog"
    location="top"
    location-strategy="connected"
    max-width="min(80vw, 1200px)"
    origin="overlap"
    scrollable
    target=".catalog-search-field .v-field"
    transition="dialog-scale-transition"
    viewport-margin="0"
    width="100%"
  >
    <v-card
      v-if="target"
      aria-label="Dataset preview"
      :loading="isLoading ? 'primary' : false"
    >
      <v-sheet
        class="d-flex align-center justify-center"
        color="primary"
        height="24"
      >
        <span style="color: rgb(var(--v-theme-on-primary))">{{ datasetTitle }}</span>
      </v-sheet>

      <v-card-text
        v-if="hasLoadError"
        class="text-error"
      >
        Unable to load the public dataset details.
      </v-card-text>

      <template v-else>
        <v-card-text>
          <v-row
            align="end"
            density="compact"
          >
            <v-col
              v-if="previewHref"
              cols="12"
              md="4"
            >
              <v-img
                alt="Dataset preview"
                aspect-ratio="1.33"
                cover
                :src="previewHref"
              />
            </v-col>

            <v-col
              cols="12"
              :md="previewHref ? '8' : '12'"
            >
              <v-list density="compact">
                <v-list-item title="Catalog page">
                  <template #subtitle>
                    <a
                      :href="target.catalogHref"
                      rel="noopener noreferrer"
                      target="_blank"
                    >{{ target.catalogHref }}</a>
                  </template>
                </v-list-item>

                <v-list-item
                  :subtitle="target.assetName"
                  title="Earth Engine asset"
                />

                <v-list-item
                  :subtitle="assetType"
                  title="Type"
                />

                <v-list-item
                  :subtitle="availability"
                  title="Dataset availability"
                />

                <v-list-item
                  :subtitle="providerNames"
                  title="Provider"
                />
              </v-list>

              <v-chip-group
                v-if="tags.length > 0"
                aria-label="Dataset tags"
                class="px-4"
              >
                <v-chip
                  v-for="tag in tags"
                  :key="tag"
                  label
                  size="x-small"
                >{{ tag }}</v-chip>
              </v-chip-group>

              <v-text-field
                class="catalog-snippet-field px-4 mt-3"
                density="compact"
                hide-details
                label="Earth Engine"
                :model-value="snippet"
                readonly
                variant="outlined"
              >
                <template #append-inner>
                  <v-btn
                    aria-label="Copy Earth Engine snippet"
                    icon="mdi-content-copy"
                    size="x-small"
                    title="Copy Earth Engine snippet"
                    variant="text"
                    @click="copySnippet"
                  />
                </template>
              </v-text-field>
            </v-col>
          </v-row>
        </v-card-text>

        <v-tabs
          v-model="activeTab"
          aria-label="Dataset preview tabs"
          class="my-1 px-4"
          density="compact"
          height="24"
          hide-slider
        >
          <v-tab
            class="catalog-preview-tab"
            :class="{ 'catalog-preview-tab--inactive': activeTab !== 'description' }"
            density="compact"
            min-width="0"
            rounded="sm"
            size="medium"
            slim
            text="Description"
            value="description"
            :variant="activeTab === 'description' ? 'tonal' : 'text'"
          />

          <v-tab
            v-if="bands.length > 0"
            class="ms-1 catalog-preview-tab"
            :class="{ 'catalog-preview-tab--inactive': activeTab !== 'bands' }"
            density="compact"
            min-width="0"
            rounded="sm"
            size="medium"
            slim
            text="Bands"
            value="bands"
            :variant="activeTab === 'bands' ? 'tonal' : 'text'"
          />
        </v-tabs>

        <v-tabs-window v-model="activeTab">
          <v-tabs-window-item value="description">
            <v-card-text>
              <div
                v-if="descriptionHtml"
                class="asset-description"
                v-html="descriptionHtml"
              />

              <span v-else>No description is available for this dataset.</span>
            </v-card-text>
          </v-tabs-window-item>

          <v-tabs-window-item
            v-if="bands.length > 0"
            value="bands"
          >
            <v-card-text>
              <v-table density="compact">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Wavelength</th>
                    <th>GSD</th>
                  </tr>
                </thead>

                <tbody>
                  <tr
                    v-for="band in bands"
                    :key="band.name"
                  >
                    <td>{{ band.name }}</td>
                    <td>{{ band.description ?? '' }}</td>
                    <td>{{ band['gee:wavelength'] ?? '' }}</td>
                    <td>{{ band.gsd ? `${band.gsd} m` : '' }}</td>
                  </tr>
                </tbody>
              </v-table>
            </v-card-text>
          </v-tabs-window-item>
        </v-tabs-window>
      </template>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
  /** Displays public STAC or community metadata selected from the primary catalog tree. */
  import { computed, ref, watch } from 'vue'
  import { renderAssetMarkdown } from './assetPreview'
  import {
    type CatalogPreviewTarget,
    fetchCatalogCollection,
    type StacBand,
    type StacCollection,
  } from './catalog'

  /** Receives the selected public dataset and the visibility state held by the primary sidebar. */
  const props = defineProps<{
    /** Indicates whether the selected dataset preview should be displayed. */
    modelValue: boolean

    /** Identifies the official or community dataset currently being previewed. */
    target: CatalogPreviewTarget | null
  }>()

  /** Synchronizes the dialog visibility with the owning primary sidebar. */
  const emit = defineEmits<{
    /** Updates the visibility state managed by the primary sidebar. */
    'update:modelValue': [value: boolean]
  }>()

  /** Relays the controlled dialog model without taking ownership away from the primary sidebar. */
  const isOpen = computed({
    get: () => props.modelValue,
    set: value => {
      // eslint-disable-next-line vue/custom-event-name-casing -- Vue reserves this camel-case event for v-model.
      emit('update:modelValue', value)
    },
  })

  /** Holds richer metadata after an official STAC collection request resolves. */
  const collection = ref<StacCollection | null>(null)

  /** Indicates that an official public collection is being loaded. */
  const isLoading = ref(false)

  /** Keeps a collection request failure visible to the person browsing the catalog. */
  const hasLoadError = ref(false)

  /** Prevents an earlier collection response from replacing a subsequently selected dataset. */
  const collectionRequestVersion = ref(0)

  /** Returns the preview to its descriptive content whenever a different dataset is selected. */
  const activeTab = ref('description')

  /** Prefers the title in the loaded official collection over the compact tree label. */
  const datasetTitle = computed(() => collection.value?.title ?? props.target?.title ?? '')

  /** Resolves the collection's canonical asset type for labels, snippets, and semantic iconography. */
  const assetType = computed(() => collection.value?.['gee:type'] ?? props.target?.type ?? 'unknown')

  /** Selects the official preview image when present and otherwise keeps the community thumbnail. */
  const previewHref = computed(() => {
    return collection.value?.links?.find(link => link.rel === 'preview')?.href ?? props.target?.previewHref
  })

  /** Prefers official STAC keywords and otherwise shows the locally available community tags. */
  const tags = computed(() => collection.value?.keywords ?? props.target?.tags ?? [])

  /** Lists official STAC providers with a community manifest provider as a fallback. */
  const providerNames = computed(() => {
    return collection.value?.providers?.map(provider => provider.name).join(', ') ?? props.target?.provider ?? 'Not specified'
  })

  /** Formats the public temporal interval in the same availability form as the extension preview. */
  const availability = computed(() => {
    const [startDate, endDate] = collection.value?.extent?.temporal?.interval?.[0] ?? []

    return `${startDate ?? 'Not available'} - ${endDate ?? 'Ongoing'}`
  })

  /** Exposes each STAC band summary for the optional bands tab. */
  const bands = computed<StacBand[]>(() => collection.value?.summaries?.['eo:bands'] ?? [])

  /** Uses an official collection description while preserving any community description supplied by its manifest. */
  const description = computed(() => collection.value?.description ?? props.target?.description ?? '')

  /** Converts the public collection description Markdown into browser-safe HTML for the Description tab. */
  const descriptionHtml = computed(() => renderAssetMarkdown(description.value))

  /** Builds the Earth Engine expression appropriate for the selected collection asset type. */
  const snippet = computed(() => {
    const assetName = props.target?.assetName ?? ''
    const normalizedType = assetType.value.toLowerCase().replaceAll('_', '')

    switch (normalizedType) {
      case 'imagecollection': {
        return `ee.ImageCollection("${assetName}")`
      }
      case 'image': {
        return `ee.Image("${assetName}")`
      }
      case 'featurecollection':
      case 'table': {
        return `ee.FeatureCollection("${assetName}")`
      }
      default: {
        return `"${assetName}"`
      }
    }
  })

  /** Copies the generated Earth Engine expression when the browser exposes the Clipboard API. */
  async function copySnippet () {
    await navigator.clipboard?.writeText(snippet.value)
  }

  /** Loads only official public STAC collections, retaining community previews entirely from their manifest data. */
  watch(() => props.target, async target => {
    const requestVersion = ++collectionRequestVersion.value

    collection.value = null
    hasLoadError.value = false
    activeTab.value = 'description'

    if (!target || target.source === 'community') {
      return
    }

    isLoading.value = true

    try {
      const loadedCollection = await fetchCatalogCollection(target.stacHref)

      if (requestVersion === collectionRequestVersion.value) {
        collection.value = loadedCollection
      }
    } catch {
      if (requestVersion === collectionRequestVersion.value) {
        hasLoadError.value = true
      }
    } finally {
      if (requestVersion === collectionRequestVersion.value) {
        isLoading.value = false
      }
    }
  }, { immediate: true })
</script>

<style scoped>
  .catalog-preview-tab.v-tab--selected {
    color: rgb(var(--v-theme-primary));
  }

  .catalog-preview-tab--inactive {
    color: color-mix(in srgb, rgb(var(--v-theme-on-background)) calc(var(--v-medium-emphasis-opacity) * 100%), transparent);
  }

  /* Matches the compact metadata list's font size and keeps the snippet field visually lightweight. */
  .catalog-snippet-field :deep(.v-field__input) {
    font-size: 10px;
    min-height: 24px;
    padding-block: 4px;
  }

  .catalog-snippet-field :deep(.v-label) {
    font-size: 10px;
  }

  .catalog-snippet-field :deep(.v-field__append-inner) {
    padding-block-start: 0;
  }

  /* Keeps the connected strategy's vertical placement but recenters the dialog horizontally. */
  :global(.catalog-preview-dialog) {
    left: 50% !important;
    transform: translateX(-50%) !important;
  }
</style>
