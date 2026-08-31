<template>
  <v-dialog
    v-model="isOpen"
    max-width="920"
    scrollable
  >
    <v-card
      aria-label="Image asset preview"
      :loading="isLoading ? 'primary' : false"
    >
      <v-toolbar
        density="compact"
        :title="title"
      >
        <template #prepend>
          <v-icon
            color="#fbc02d"
            icon="mdi-image"
          />
        </template>

        <template #append>
          <v-btn
            aria-label="Close image preview"
            icon="mdi-close"
            size="small"
            title="Close image preview"
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
        Loading image details.
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
                label="Image ID"
                :model-value="asset.name"
                readonly
                variant="outlined"
              >
                <template #append-inner>
                  <v-btn
                    aria-label="Copy image ID"
                    icon="mdi-content-copy"
                    size="x-small"
                    title="Copy image ID"
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
                  :subtitle="String(bands.length)"
                  title="Bands"
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

              <span v-else>No description is available for this image.</span>
            </v-card-text>
          </v-tabs-window-item>

          <v-tabs-window-item value="bands">
            <v-table
              fixed-header
              height="320"
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
                  <td colspan="6">No band information is available for this image.</td>
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
                  <td colspan="2">No user properties are available for this image.</td>
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
  /** Displays complete Earth Engine metadata for one IMAGE asset resolved from its canonical asset ID. */
  import type { EarthEngineAsset } from '@/services/earthEngineAssets'
  import { storeToRefs } from 'pinia'
  import { computed, ref, watch } from 'vue'
  import { fetchEarthEngineAsset } from '@/services/earthEngineAssets'
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

  /** Receives the canonical image asset ID and visibility state managed by the primary sidebar. */
  const props = defineProps<{
    /** Identifies the IMAGE asset retrieved and presented by this dialog. */
    assetId: string | null

    /** Determines whether the dialog is currently visible. */
    modelValue: boolean
  }>()

  /** Synchronizes the controlled dialog visibility with the primary sidebar. */
  const emit = defineEmits<{
    /** Updates visibility after a person closes the dialog. */
    'update:modelValue': [value: boolean]
  }>()

  /** Provides the current OAuth token required to resolve the requested asset on demand. */
  const { accessToken } = storeToRefs(useGoogleAuthStore())

  /** Relays dialog visibility without taking presentation ownership away from the parent sidebar. */
  const isOpen = computed({
    get: () => props.modelValue,
    set: value => {
      // eslint-disable-next-line vue/custom-event-name-casing -- Vue reserves this camel-case event for v-model.
      emit('update:modelValue', value)
    },
  })

  /** Holds complete image metadata after the selected asset ID resolves successfully. */
  const asset = ref<EarthEngineAsset | null>(null)

  /** Indicates that the dialog is resolving the selected image asset. */
  const isLoading = ref(false)

  /** Describes why the selected image could not be retrieved or did not match its requested preview type. */
  const loadError = ref<string | null>(null)

  /** Restores the descriptive tab whenever a different image asset is selected. */
  const activeTab = ref('description')

  /** Invalidates a late request when another image or session replaces the selected asset. */
  let requestVersion = 0

  /** Uses the title supplied by Earth Engine and otherwise falls back to the terminal asset path component. */
  const title = computed(() => asset.value?.title ?? asset.value?.name.split('/').pop() ?? 'Image preview')

  /** Exposes raster bands only after the full asset response has been validated. */
  const bands = computed(() => asset.value?.bands ?? [])

  /** Converts the image description Markdown into browser-safe HTML for the Description tab. */
  const descriptionHtml = computed(() => asset.value ? renderAssetDescription(asset.value) : '')

  /** Lists user-maintained image properties in a stable order for the Properties tab. */
  const properties = computed(() => asset.value ? getAssetPreviewProperties(asset.value) : [])

  /** Copies the fully resolved canonical image asset ID when Clipboard access is available. */
  async function copyAssetId () {
    await navigator.clipboard?.writeText(asset.value?.name ?? '')
  }

  /** Resolves a requested image independently whenever its asset ID, visibility, or signed-in session changes. */
  watch([isOpen, () => props.assetId, accessToken], async ([isDialogOpen, assetId, token]) => {
    const currentRequest = ++requestVersion

    asset.value = null
    loadError.value = null
    activeTab.value = 'description'

    if (!isDialogOpen) {
      return
    }

    if (!assetId) {
      loadError.value = 'No image asset ID was provided.'
      return
    }

    if (!token) {
      loadError.value = 'Connect a Google account to preview Earth Engine assets.'
      return
    }

    isLoading.value = true

    try {
      const loadedAsset = await fetchEarthEngineAsset(token, assetId)

      if (loadedAsset.type !== 'IMAGE') {
        throw new Error(`Expected an IMAGE asset but Earth Engine returned ${loadedAsset.type}.`)
      }

      if (currentRequest === requestVersion) {
        asset.value = loadedAsset
      }
    } catch (error) {
      if (currentRequest === requestVersion) {
        loadError.value = error instanceof Error ? error.message : 'Unable to retrieve image details.'
      }
    } finally {
      if (currentRequest === requestVersion) {
        isLoading.value = false
      }
    }
  }, { immediate: true })
</script>
