<template>
  <v-dialog
    v-model="isOpen"
    max-width="760"
    scrollable
  >
    <v-card
      v-if="target"
      aria-label="Dataset preview"
      :loading="isLoading ? 'primary' : false"
    >
      <v-toolbar
        density="compact"
        :title="datasetTitle"
      >
        <template #prepend>
          <v-icon
            :color="presentation.color"
            :icon="presentation.icon"
          />
        </template>

        <template #append>
          <v-btn
            aria-label="Close dataset preview"
            icon="mdi-close"
            title="Close dataset preview"
            variant="text"
            @click="isOpen = false"
          />
        </template>
      </v-toolbar>

      <v-card-text
        v-if="hasLoadError"
        class="text-error"
      >
        Unable to load the public dataset details.
      </v-card-text>

      <template v-else>
        <v-card-text>
          <v-row density="compact">
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
            </v-col>
          </v-row>

          <v-chip-group
            v-if="tags.length > 0"
            aria-label="Dataset tags"
          >
            <v-chip
              v-for="tag in tags"
              :key="tag"
              label
              size="small"
            >{{ tag }}</v-chip>
          </v-chip-group>

          <v-text-field
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

          <v-btn
            class="mt-2"
            :href="target.catalogHref"
            prepend-icon="mdi-open-in-new"
            rel="noopener noreferrer"
            target="_blank"
            text="Open catalog page"
            variant="text"
          />
        </v-card-text>

        <v-tabs
          v-model="activeTab"
          density="compact"
        >
          <v-tab
            text="Description"
            value="description"
          />

          <v-tab
            v-if="bands.length > 0"
            text="Bands"
            value="bands"
          />
        </v-tabs>

        <v-tabs-window v-model="activeTab">
          <v-tabs-window-item value="description">
            <v-card-text>{{ description || 'No description is available for this dataset.' }}</v-card-text>
          </v-tabs-window-item>

          <v-tabs-window-item
            v-if="bands.length > 0"
            value="bands"
          >
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
          </v-tabs-window-item>
        </v-tabs-window>
      </template>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
  /** Displays public STAC or community metadata selected from the primary catalog tree. */
  import { computed, ref, watch } from 'vue'
  import {
    type CatalogPreviewTarget,
    fetchCatalogCollection,
    getCatalogAssetPresentation,
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

  /** Reuses the shared catalog mapping so preview and tree asset types remain visually consistent. */
  const presentation = computed(() => getCatalogAssetPresentation(assetType.value))

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
