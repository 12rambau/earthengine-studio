<template>
  <v-dialog
    v-model="isOpen"
    max-width="1000"
    scrollable
  >
    <v-card
      aria-label="Feature collection asset preview"
      :loading="isLoading ? 'primary' : false"
    >
      <v-toolbar
        density="compact"
        :title="title"
      >
        <template #prepend>
          <v-icon
            color="#43a047"
            icon="mdi-table"
          />
        </template>

        <template #append>
          <v-btn
            aria-label="Close feature collection preview"
            icon="mdi-close"
            size="small"
            title="Close feature collection preview"
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
        Loading feature collection details.
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
                label="FeatureCollection ID"
                :model-value="asset.name"
                readonly
                variant="outlined"
              >
                <template #append-inner>
                  <v-btn
                    aria-label="Copy feature collection ID"
                    icon="mdi-content-copy"
                    size="x-small"
                    title="Copy feature collection ID"
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
                  :subtitle="formatAssetCount(asset.featureCount)"
                  title="Features"
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
            text="Features"
            value="features"
          />

          <v-tab
            text="Columns"
            value="columns"
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

              <span v-else>No description is available for this feature collection.</span>
            </v-card-text>
          </v-tabs-window-item>

          <v-tabs-window-item value="features">
            <v-alert
              v-if="featuresLoadError"
              class="ma-4"
              density="compact"
              type="warning"
              variant="tonal"
            >
              {{ featuresLoadError }}
            </v-alert>

            <v-table
              v-else
              fixed-header
              height="320"
            >
              <thead>
                <tr>
                  <th>Feature</th>

                  <th
                    v-for="column in columns"
                    :key="column.name"
                  >
                    {{ column.name }} ({{ column.type }})
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="(feature, index) in features"
                  :key="index"
                >
                  <td>{{ index + 1 }}</td>

                  <td
                    v-for="column in columns"
                    :key="column.name"
                  >
                    {{ formatAssetValue(feature.properties?.[column.name]) }}
                  </td>
                </tr>

                <tr v-if="features.length === 0">
                  <td :colspan="Math.max(columns.length + 1, 1)">No feature data is available in the first {{ featurePageSize }} entries.</td>
                </tr>
              </tbody>
            </v-table>

            <v-card-text class="text-medium-emphasis">
              Showing the first {{ featurePageSize }} features.
            </v-card-text>
          </v-tabs-window-item>

          <v-tabs-window-item value="columns">
            <v-table
              fixed-header
              height="320"
            >
              <thead>
                <tr>
                  <th>Column</th>
                  <th>Inferred type</th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="column in columns"
                  :key="column.name"
                >
                  <td>{{ column.name }}</td>
                  <td>{{ column.type }}</td>
                </tr>

                <tr v-if="columns.length === 0">
                  <td colspan="2">No columns could be inferred from the sampled features.</td>
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
                  <td colspan="2">No user properties are available for this feature collection.</td>
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
  /** Displays complete Earth Engine metadata and a bounded row sample for one TABLE FeatureCollection asset. */
  import type { EarthEngineAsset, EarthEngineAssetFeature } from '@/services/earthEngineAssets'
  import { storeToRefs } from 'pinia'
  import { computed, ref, watch } from 'vue'
  import {
    fetchEarthEngineAsset,
    fetchEarthEngineAssetFeatures,
  } from '@/services/earthEngineAssets'
  import { useGoogleAuthStore } from '@/stores/googleAuth'
  import {
    formatAssetCount,
    formatAssetSize,
    formatAssetTime,
    formatAssetValue,
    getAssetPreviewProperties,
    getFeatureCollectionColumns,
    renderAssetDescription,
  } from './assetPreview'

  /** Limits the row sample so FeatureCollection inspection remains responsive. */
  const featurePageSize = 20

  /** Receives the canonical table asset ID and visibility state managed by the primary sidebar. */
  const props = defineProps<{
    /** Identifies the TABLE asset retrieved and presented as a FeatureCollection by this dialog. */
    assetId: string | null

    /** Determines whether the dialog is currently visible. */
    modelValue: boolean
  }>()

  /** Synchronizes the controlled dialog visibility with the primary sidebar. */
  const emit = defineEmits<{
    /** Updates visibility after a person closes the dialog. */
    'update:modelValue': [value: boolean]
  }>()

  /** Provides the current OAuth token required to resolve the requested FeatureCollection and sample its features. */
  const { accessToken } = storeToRefs(useGoogleAuthStore())

  /** Relays dialog visibility without taking presentation ownership away from the parent sidebar. */
  const isOpen = computed({
    get: () => props.modelValue,
    set: value => {
      // eslint-disable-next-line vue/custom-event-name-casing -- Vue reserves this camel-case event for v-model.
      emit('update:modelValue', value)
    },
  })

  /** Holds complete table metadata after the requested asset ID resolves successfully. */
  const asset = ref<EarthEngineAsset | null>(null)

  /** Retains a bounded sample of FeatureCollection rows for the Features and Columns tabs. */
  const features = ref<EarthEngineAssetFeature[]>([])

  /** Keeps a feature-sample failure local so complete FeatureCollection metadata remains available. */
  const featuresLoadError = ref<string | null>(null)

  /** Indicates that the dialog is resolving its FeatureCollection and sampled feature data. */
  const isLoading = ref(false)

  /** Describes why the selected table could not be retrieved or did not match its requested preview type. */
  const loadError = ref<string | null>(null)

  /** Restores the descriptive tab whenever a different FeatureCollection asset is selected. */
  const activeTab = ref('description')

  /** Invalidates late table and feature-sample responses after the selected asset or session changes. */
  let requestVersion = 0

  /** Uses the table title supplied by Earth Engine and otherwise falls back to its terminal path component. */
  const title = computed(() => asset.value?.title ?? asset.value?.name.split('/').pop() ?? 'Feature collection preview')

  /** Converts the FeatureCollection description Markdown into browser-safe HTML for the Description tab. */
  const descriptionHtml = computed(() => asset.value ? renderAssetDescription(asset.value) : '')

  /** Lists user-maintained FeatureCollection properties in a stable order for the Properties tab. */
  const properties = computed(() => asset.value ? getAssetPreviewProperties(asset.value) : [])

  /** Infers displayed FeatureCollection columns from the first fetched feature, matching the extension preview. */
  const columns = computed(() => getFeatureCollectionColumns(features.value))

  /** Copies the fully resolved canonical FeatureCollection asset ID when Clipboard access is available. */
  async function copyAssetId () {
    await navigator.clipboard?.writeText(asset.value?.name ?? '')
  }

  /** Resolves a FeatureCollection and its bounded feature sample whenever its selection changes. */
  watch([isOpen, () => props.assetId, accessToken], async ([isDialogOpen, assetId, token]) => {
    const currentRequest = ++requestVersion

    asset.value = null
    features.value = []
    featuresLoadError.value = null
    loadError.value = null
    activeTab.value = 'description'

    if (!isDialogOpen) {
      return
    }

    if (!assetId) {
      loadError.value = 'No feature collection asset ID was provided.'
      return
    }

    if (!token) {
      loadError.value = 'Connect a Google account to preview Earth Engine assets.'
      return
    }

    isLoading.value = true

    try {
      const loadedAsset = await fetchEarthEngineAsset(token, assetId)

      if (loadedAsset.type !== 'TABLE' && loadedAsset.type !== 'FEATURE_COLLECTION') {
        throw new Error(`Expected a TABLE asset but Earth Engine returned ${loadedAsset.type}.`)
      }

      if (currentRequest !== requestVersion) {
        return
      }

      asset.value = loadedAsset

      try {
        const loadedFeatures = await fetchEarthEngineAssetFeatures(token, assetId, featurePageSize)

        if (currentRequest === requestVersion) {
          features.value = loadedFeatures
        }
      } catch (error) {
        if (currentRequest === requestVersion) {
          featuresLoadError.value = error instanceof Error ? error.message : 'Unable to retrieve features from this collection.'
        }
      }
    } catch (error) {
      if (currentRequest === requestVersion) {
        loadError.value = error instanceof Error ? error.message : 'Unable to retrieve feature collection details.'
      }
    } finally {
      if (currentRequest === requestVersion) {
        isLoading.value = false
      }
    }
  }, { immediate: true })
</script>
