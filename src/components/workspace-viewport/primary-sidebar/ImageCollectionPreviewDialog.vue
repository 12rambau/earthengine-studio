<template>
  <v-dialog
    v-model="isOpen"
    max-width="1000"
    scrollable
  >
    <v-card
      aria-label="Image collection asset preview"
      :loading="isLoading ? 'primary' : false"
    >
      <v-toolbar
        density="compact"
        :title="title"
      >
        <template #prepend>
          <v-icon
            color="#7e57c2"
            icon="mdi-image-multiple"
          />
        </template>

        <template #append>
          <v-btn
            aria-label="Close image collection preview"
            icon="mdi-close"
            size="small"
            title="Close image collection preview"
            variant="text"
            @click="isOpen = false"
          />
        </template>
      </v-toolbar>

      <v-card-text
        v-if="loadError"
        class="text-error"
      >
        {{ loadError }}
      </v-card-text>

      <v-card-text
        v-else-if="!asset"
        class="text-medium-emphasis"
      >
        Loading image collection details.
      </v-card-text>

      <template v-else>
        <v-card-text>
          <v-row density="compact">
            <v-col
              cols="12"
              md="6"
            >
              <v-text-field
                density="compact"
                hide-details
                label="ImageCollection ID"
                :model-value="asset.name"
                readonly
                variant="outlined"
              >
                <template #append-inner>
                  <v-btn
                    aria-label="Copy image collection ID"
                    icon="mdi-content-copy"
                    size="x-small"
                    title="Copy image collection ID"
                    variant="text"
                    @click="copyAssetId"
                  />
                </template>
              </v-text-field>
            </v-col>

            <v-col
              cols="12"
              md="6"
            >
              <v-list lines="two">
                <v-list-item
                  :subtitle="`${formatAssetTime(asset.startTime)} - ${formatAssetTime(asset.endTime)}`"
                  title="Date range"
                />

                <v-list-item
                  :subtitle="formatAssetSize(asset.sizeBytes)"
                  title="File size"
                />

                <v-list-item
                  :subtitle="imageSampleLabel"
                  title="Images shown"
                />

                <v-list-item
                  :subtitle="formatAssetTime(asset.updateTime)"
                  title="Last modified"
                />
              </v-list>
            </v-col>
          </v-row>
        </v-card-text>

        <v-tabs v-model="activeTab">
          <v-tab
            text="Description"
            value="description"
          />

          <v-tab
            text="Images"
            value="images"
          />

          <v-tab
            text="Bands"
            value="bands"
          />

          <v-tab
            text="Properties"
            value="properties"
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

              <span v-else>No description is available for this image collection.</span>
            </v-card-text>
          </v-tabs-window-item>

          <v-tabs-window-item value="images">
            <v-alert
              v-if="imagesLoadError"
              class="ma-4"
              density="compact"
              type="warning"
              variant="tonal"
            >
              {{ imagesLoadError }}
            </v-alert>

            <v-table
              v-else
              fixed-header
              height="320"
            >
              <thead>
                <tr>
                  <th>Image ID</th>
                  <th>Last modified</th>
                  <th>File size</th>
                  <th>Start date</th>
                  <th>End date</th>
                  <th>Preview</th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="image in images"
                  :key="image.name"
                >
                  <td>{{ image.name.split('/').pop() }}</td>
                  <td>{{ formatAssetTime(image.updateTime) }}</td>
                  <td>{{ formatAssetSize(image.sizeBytes) }}</td>
                  <td>{{ formatAssetTime(image.startTime) }}</td>
                  <td>{{ formatAssetTime(image.endTime) }}</td>

                  <td>
                    <v-btn
                      :aria-label="`Preview ${image.name}`"
                      icon="mdi-open-in-new"
                      size="x-small"
                      :title="`Preview ${image.name}`"
                      variant="text"
                      @click="emit('preview-image', image.name)"
                    />
                  </td>
                </tr>

                <tr v-if="images.length === 0">
                  <td colspan="6">No images are available in the first {{ imagePageSize }} collection entries.</td>
                </tr>
              </tbody>
            </v-table>

            <v-card-text
              v-if="hasMoreImages"
              class="text-medium-emphasis"
            >
              Only the first {{ imagePageSize }} images are shown.
            </v-card-text>
          </v-tabs-window-item>

          <v-tabs-window-item value="bands">
            <v-card-text class="text-medium-emphasis">
              Band metadata comes from the first image in this collection.
            </v-card-text>

            <v-table
              fixed-header
              height="280"
            >
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Dimensions</th>
                  <th>CRS</th>
                  <th>Nominal scale</th>
                  <th>Range</th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="band in bands"
                  :key="band.id"
                >
                  <td>{{ band.id }}</td>
                  <td>{{ band.dataType?.precision ?? 'Not available' }}</td>
                  <td>{{ getBandDimensions(band) }}</td>
                  <td>{{ band.grid?.crsCode ?? 'Not available' }}</td>
                  <td>{{ getBandScale(band) }}</td>
                  <td>{{ getBandRange(band) }}</td>
                </tr>

                <tr v-if="bands.length === 0">
                  <td colspan="6">No band information is available for this collection.</td>
                </tr>
              </tbody>
            </v-table>
          </v-tabs-window-item>

          <v-tabs-window-item value="properties">
            <v-table
              fixed-header
              height="320"
            >
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Value</th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="property in properties"
                  :key="property.name"
                >
                  <td>{{ property.name }}</td>
                  <td>{{ property.value }}</td>
                </tr>

                <tr v-if="properties.length === 0">
                  <td colspan="2">No user properties are available for this image collection.</td>
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
  /** Displays complete Earth Engine metadata and a bounded image sample for one IMAGE_COLLECTION asset. */
  import type { EarthEngineAsset, EarthEngineAssetBand } from '@/services/earthEngineAssets'
  import { storeToRefs } from 'pinia'
  import { computed, ref, watch } from 'vue'
  import {
    fetchEarthEngineAsset,
    fetchEarthEngineAssetPage,
  } from '@/services/earthEngineAssets'
  import { useGoogleAuthStore } from '@/stores/googleAuth'
  import {
    formatAssetSize,
    formatAssetTime,
    getAssetPreviewProperties,
    getBandDimensions,
    getBandRange,
    getBandScale,
    renderAssetDescription,
  } from './assetPreview'

  /** Limits the image sample so a large collection remains responsive to inspect. */
  const imagePageSize = 100

  /** Receives the canonical collection asset ID and visibility state managed by the primary sidebar. */
  const props = defineProps<{
    /** Identifies the IMAGE_COLLECTION asset retrieved and presented by this dialog. */
    assetId: string | null

    /** Determines whether the dialog is currently visible. */
    modelValue: boolean
  }>()

  /** Synchronizes visibility and lets a listed child image open its own specialized dialog. */
  const emit = defineEmits<{
    /** Updates visibility after a person closes the dialog. */
    'update:modelValue': [value: boolean]

    /** Requests the parent sidebar to preview a selected child IMAGE asset. */
    'preview-image': [assetId: string]
  }>()

  /** Provides the current OAuth token required to resolve collection metadata and its child images. */
  const { accessToken } = storeToRefs(useGoogleAuthStore())

  /** Relays dialog visibility without taking presentation ownership away from the parent sidebar. */
  const isOpen = computed({
    get: () => props.modelValue,
    set: value => {
      // eslint-disable-next-line vue/custom-event-name-casing -- Vue reserves this camel-case event for v-model.
      emit('update:modelValue', value)
    },
  })

  /** Holds complete image-collection metadata after the requested asset ID resolves successfully. */
  const asset = ref<EarthEngineAsset | null>(null)

  /** Retains a bounded direct-child image sample for the Images tab. */
  const images = ref<EarthEngineAsset[]>([])

  /** Holds band metadata from the first sampled image, matching the extension preview's band source. */
  const bands = ref<EarthEngineAssetBand[]>([])

  /** Indicates that Earth Engine reported child images beyond the sample displayed in the dialog. */
  const hasMoreImages = ref(false)

  /** Keeps a child-image fetch failure local so complete collection metadata remains available. */
  const imagesLoadError = ref<string | null>(null)

  /** Indicates that the collection dialog is resolving its asset and dependent sample data. */
  const isLoading = ref(false)

  /** Describes why the selected collection could not be retrieved or did not match its requested preview type. */
  const loadError = ref<string | null>(null)

  /** Restores the descriptive tab whenever a different collection asset is selected. */
  const activeTab = ref('description')

  /** Invalidates late collection and child-image responses after the selected asset or session changes. */
  let requestVersion = 0

  /** Uses the collection title supplied by Earth Engine and otherwise falls back to its terminal path component. */
  const title = computed(() => asset.value?.title ?? asset.value?.name.split('/').pop() ?? 'Image collection preview')

  /** Clarifies whether the Images tab represents the complete first page or a truncated sample. */
  const imageSampleLabel = computed(() => `${images.value.length}${hasMoreImages.value ? '+' : ''}`)

  /** Converts the collection description Markdown into browser-safe HTML for the Description tab. */
  const descriptionHtml = computed(() => asset.value ? renderAssetDescription(asset.value) : '')

  /** Lists user-maintained collection properties in a stable order for the Properties tab. */
  const properties = computed(() => asset.value ? getAssetPreviewProperties(asset.value) : [])

  /** Copies the fully resolved canonical image-collection asset ID when Clipboard access is available. */
  async function copyAssetId () {
    await navigator.clipboard?.writeText(asset.value?.name ?? '')
  }

  /** Resolves a collection, its first image page, and first-image bands whenever its selection changes. */
  watch([isOpen, () => props.assetId, accessToken], async ([isDialogOpen, assetId, token]) => {
    const currentRequest = ++requestVersion

    asset.value = null
    images.value = []
    bands.value = []
    hasMoreImages.value = false
    imagesLoadError.value = null
    loadError.value = null
    activeTab.value = 'description'

    if (!isDialogOpen) {
      return
    }

    if (!assetId) {
      loadError.value = 'No image collection asset ID was provided.'
      return
    }

    if (!token) {
      loadError.value = 'Connect a Google account to preview Earth Engine assets.'
      return
    }

    isLoading.value = true

    try {
      const loadedAsset = await fetchEarthEngineAsset(token, assetId)

      if (loadedAsset.type !== 'IMAGE_COLLECTION') {
        throw new Error(`Expected an IMAGE_COLLECTION asset but Earth Engine returned ${loadedAsset.type}.`)
      }

      if (currentRequest !== requestVersion) {
        return
      }

      asset.value = loadedAsset

      try {
        const page = await fetchEarthEngineAssetPage(token, assetId, imagePageSize)

        if (currentRequest !== requestVersion) {
          return
        }

        images.value = page.assets.filter(image => image.type === 'IMAGE')
        hasMoreImages.value = Boolean(page.nextPageToken)
        const firstImage = images.value[0]

        if (firstImage) {
          const firstImageDetails = await fetchEarthEngineAsset(token, firstImage.name)

          if (currentRequest === requestVersion && firstImageDetails.type === 'IMAGE') {
            bands.value = firstImageDetails.bands ?? []
          }
        }
      } catch (error) {
        if (currentRequest === requestVersion) {
          imagesLoadError.value = error instanceof Error ? error.message : 'Unable to retrieve images from this collection.'
        }
      }
    } catch (error) {
      if (currentRequest === requestVersion) {
        loadError.value = error instanceof Error ? error.message : 'Unable to retrieve image collection details.'
      }
    } finally {
      if (currentRequest === requestVersion) {
        isLoading.value = false
      }
    }
  }, { immediate: true })
</script>
