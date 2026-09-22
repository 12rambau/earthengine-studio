<template>
  <v-menu
    v-model="isOpen"
    :close-on-content-click="false"
    location="bottom"
    offset="0"
    :open-on-click="false"
  >
    <template #activator="{ props }">
      <div v-bind="props">
        <v-text-field
          ref="searchField"
          v-model="query"
          aria-label="Search the Earth Engine catalog"
          class="my-1 catalog-search-field"
          density="compact"
          hide-details
          placeholder="Search catalog"
          prepend-inner-icon="mdi-magnify"
          :rounded="isOpen ? 'b-0' : 'md'"
          variant="outlined"
        >
          <template #append-inner>
            <v-chip
              density="compact"
              rounded="sm"
              size="x-small"
              variant="tonal"
            >Ctrl</v-chip>

            <span>+</span>

            <v-chip
              density="compact"
              rounded="sm"
              size="x-small"
              variant="tonal"
            >K</v-chip>
          </template>
        </v-text-field>
      </div>
    </template>

    <v-card
      class="catalog-search-results"
      elevation="8"
      max-height="420"
      max-width="calc(100vw - 16px)"
      rounded="b-md"
      width="480"
    >
      <v-progress-linear
        v-if="isLoading"
        color="primary"
        indeterminate
      />

      <div v-else>
        <div class="catalog-search-summary">
          <span class="catalog-search-total">Results: {{ totalResultCount }}</span>

          <span
            v-for="categoryResult in categoryResultCounts"
            :key="categoryResult.category"
          >
            {{ categoryResult.category }}: {{ categoryResult.count }}
          </span>
        </div>

        <v-divider />

        <v-list
          density="compact"
          prepend-gap="4"
        >
          <template
            v-for="section in searchResultsByCategory"
            :key="section.category"
          >
            <v-list-subheader>{{ section.category }}</v-list-subheader>

            <v-list-item
              v-for="asset in section.assets"
              :key="asset.treeValue"
              :subtitle="asset.assetName"
              :title="asset.title"
              @click="selectAsset(asset)"
            >
              <template #prepend>
                <v-icon
                  :color="asset.iconColor"
                  :icon="asset.icon"
                  size="small"
                />
              </template>
            </v-list-item>
          </template>

          <v-list-item
            v-if="searchResultsByCategory.length === 0"
            title="No matching assets"
          />
        </v-list>
      </div>
    </v-card>
  </v-menu>
</template>

<script lang="ts" setup>
  /** Searches every public Earth Engine catalog category from the application header. */
  import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import {
    buildCommunityThemes,
    type CatalogEntry,
    type CatalogPreviewTarget,
    catalogUrl,
    fetchCatalogAssetType,
    fetchCatalogEntries,
    fetchCommunityDatasets,
    fetchPublisherHrefs,
    getCatalogAssetPresentation,
    getDatasetCatalogUrl,
  } from '@/components/workspace-viewport/primary-sidebar/catalog'
  import { useAppStore } from '@/stores/app'

  /** Names the catalog sections that remain visible while search results are grouped. */
  type CatalogCategory = 'Google' | 'Publishers' | 'Community'

  /** Represents one searchable asset together with its visual type and the identity used to select it in the tree. */
  interface CatalogSearchAsset {
    assetName: string
    category: CatalogCategory
    icon: string
    iconColor?: string
    previewTarget: CatalogPreviewTarget
    tags: string[]
    title: string
    treeValue: string
  }

  /** Defines the focus capability exposed by the Vuetify text field instance. */
  interface FocusableSearchField {
    focus: () => void
  }

  /** Requests the primary sidebar to open and highlight a dataset selected from search results. */
  const appStore = useAppStore()

  /** Holds the terms supplied in the header search field. */
  const query = ref('')

  /** References the search input so the global catalog shortcut can focus it. */
  const searchField = ref<FocusableSearchField | null>(null)

  /** Controls the result menu only after a non-empty catalog query is supplied. */
  const isOpen = ref(false)

  /** Indicates the first complete catalog index is being loaded for this header instance. */
  const isLoading = ref(false)

  /** Prevents duplicate requests after the complete search index has been attempted. */
  const hasLoaded = ref(false)

  /** Stores the flattened assets from the same public sources used by the primary sidebar. */
  const catalogAssets = ref<CatalogSearchAsset[]>([])

  /** Groups matching assets in stable catalogue-section order for result display. */
  const searchResultsByCategory = computed(() => {
    const queryTerms = query.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)

    return (['Google', 'Publishers', 'Community'] as const).map(category => {
      const assets = catalogAssets.value
        .filter(asset => asset.category === category)
        .filter(asset => queryTerms.every(queryTerm => {
          return [asset.title, asset.assetName, ...asset.tags].some(value => {
            return value.toLocaleLowerCase().includes(queryTerm)
          })
        }))
      const sortedAssets = [...assets]

      sortedAssets.sort((first, second) => first.title.localeCompare(second.title))

      return {
        assets: sortedAssets,
        category,
      }
    }).filter(section => section.assets.length > 0)
  })

  /** Counts the visible category results so the search summary matches the list below it. */
  const totalResultCount = computed(() => {
    return searchResultsByCategory.value.reduce((total, section) => total + section.assets.length, 0)
  })

  /** Counts every catalog category so the summary explicitly represents categories with no matching assets. */
  const categoryResultCounts = computed(() => {
    return (['Google', 'Publishers', 'Community'] as const).map(category => ({
      category,
      count: searchResultsByCategory.value.find(section => section.category === category)?.assets.length ?? 0,
    }))
  })

  /**
   * Converts one official provider branch into searchable items while preserving the sidebar's asset title rules.
   */
  async function buildProviderAssets (
    provider: CatalogEntry,
    publisherHrefs: Set<string>,
  ): Promise<CatalogSearchAsset[]> {
    const collections = await fetchCatalogEntries(provider.href)

    return Promise.all(collections.map(async collection => {
      const assetType = await fetchCatalogAssetType(collection.href).catch(() => undefined)
      const datasetId = collection.title.replaceAll('_', '/')
      const title = collection.title.split('_').slice(1).join('_') || collection.title
      const { color: iconColor, icon } = getCatalogAssetPresentation(assetType)

      return {
        assetName: datasetId,
        category: publisherHrefs.has(provider.href) ? 'Publishers' : 'Google',
        icon,
        iconColor,
        previewTarget: {
          assetName: datasetId,
          catalogHref: getDatasetCatalogUrl(datasetId),
          source: 'stac',
          stacHref: collection.href,
          tags: [provider.title],
          title,
          type: assetType ?? 'unknown',
        },
        tags: [provider.title, assetType?.replaceAll('_', ' ') ?? ''],
        title,
        treeValue: `dataset:${collection.href}`,
      } satisfies CatalogSearchAsset
    }))
  }

  /**
   * Loads a complete, flattened catalog once; unavailable provider branches do not hide the remaining sources.
   */
  async function loadCatalog () {
    if (hasLoaded.value || isLoading.value) {
      return
    }

    isLoading.value = true

    try {
      const [officialResult, communityResult] = await Promise.allSettled([
        fetchCatalogEntries(catalogUrl).then(async providers => {
          const publisherHrefs = await fetchPublisherHrefs(providers)
          const providerResults = await Promise.allSettled(
            providers.map(provider => buildProviderAssets(provider, publisherHrefs)),
          )

          return providerResults.flatMap(result => result.status === 'fulfilled' ? result.value : [])
        }),
        fetchCommunityDatasets(),
      ])
      const officialAssets = officialResult.status === 'fulfilled' ? officialResult.value : []
      const communityAssets = communityResult.status === 'fulfilled'
        ? buildCommunityThemes(communityResult.value).flatMap(theme => theme.datasets.map(dataset => {
          const { color: iconColor, icon } = getCatalogAssetPresentation(dataset.type)

          return {
            assetName: dataset.id,
            category: 'Community' as const,
            icon,
            iconColor,
            previewTarget: {
              assetName: dataset.id,
              catalogHref: dataset.docs,
              description: dataset.description,
              previewHref: dataset.thumbnail,
              provider: dataset.provider,
              source: 'community' as const,
              tags: [dataset.thematic_group, ...(dataset.tags?.split(',').map(tag => tag.trim()) ?? [])]
                .filter(Boolean),
              title: dataset.title,
              type: dataset.type,
            },
            tags: [dataset.thematic_group, dataset.type].filter(Boolean),
            title: dataset.title,
            treeValue: `community:${dataset.docs}`,
          } satisfies CatalogSearchAsset
        }))
        : []

      catalogAssets.value = [...officialAssets, ...communityAssets]
    } finally {
      hasLoaded.value = true
      isLoading.value = false
    }
  }

  /** Opens the dataset's preview dialog and highlights it in the primary sidebar's catalog tree. */
  function selectAsset (asset: CatalogSearchAsset) {
    appStore.requestCatalogSelection(asset.previewTarget, asset.treeValue)
    isOpen.value = false
  }

  /** Focuses catalog search when Ctrl+K is pressed, replacing the browser's default shortcut behavior. */
  function handleSearchShortcut (event: KeyboardEvent) {
    if (
      event.defaultPrevented
      || event.altKey
      || event.metaKey
      || event.shiftKey
      || !event.ctrlKey
      || event.key.toLocaleLowerCase() !== 'k'
    ) {
      return
    }

    event.preventDefault()
    searchField.value?.focus()
  }

  /** Opens the result menu and begins indexing only when there is a query to evaluate. */
  watch(query, value => {
    const hasQuery = value.trim().length > 0

    isOpen.value = hasQuery

    if (hasQuery) {
      void loadCatalog()
    }
  })

  onMounted(() => {
    window.addEventListener('keydown', handleSearchShortcut, true)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleSearchShortcut, true)
  })
</script>

<style scoped>
  .catalog-search-field :deep(.v-field) {
    --v-field-input-padding-bottom: 0px;
    --v-field-input-padding-top: 0px;
    --v-input-control-height: 24px;
    font-size: 11px;
  }

  .catalog-search-results {
    border-start-end-radius: 0;
    border-start-start-radius: 0;
    overflow-y: auto;
  }

  .catalog-search-results :deep(.v-list-item__prepend) {
    margin-inline-end: 4px;
  }

  .catalog-search-results :deep(.v-list-item-title) {
    font-size: 10px;
    line-height: 12px;
  }

  .catalog-search-results :deep(.v-list-item-subtitle) {
    font-size: 9px;
    line-height: 11px;
  }

  .catalog-search-results :deep(.v-list-subheader) {
    min-block-size: 24px;
    padding-inline: 16px;
  }

  .catalog-search-summary {
    align-items: center;
    border-block-end: 1px solid rgb(var(--v-theme-on-surface) / 12%);
    display: flex;
    flex-wrap: wrap;
    font-size: 10px;
    gap: 0 8px;
    line-height: 12px;
    padding: 3px 16px;
  }

  .catalog-search-total {
    font-weight: 600;
  }
</style>
