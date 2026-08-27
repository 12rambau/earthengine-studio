<template>
  <v-card
    class="catalog-tree-card"
    density="compact"
    elevation="0"
    :loading="isLoading ? 'primary' : false"
    rounded="lg"
  >
    <v-treeview
      aria-label="Earth Engine data catalog"
      density="compact"
      fluid
      hide-actions
      indent-lines
      item-children="children"
      item-title="title"
      item-value="value"
      :items="catalogItems"
      open-on-click
      prepend-gap="4"
      slim
    >
      <template #prepend="{ isOpen, item }">
        <v-icon
          :color="item.iconColor"
          :icon="item.children && isOpen ? 'mdi-folder-open' : item.icon"
          size="16"
        />
      </template>

      <template #append="{ item }">
        <v-btn
          v-if="item?.catalogHref"
          :aria-label="`Open ${item.title} catalog page`"
          class="catalog-tree-link"
          density="compact"
          :href="item.catalogHref"
          icon="mdi-open-in-new"
          rel="noopener noreferrer"
          size="x-small"
          target="_blank"
          :title="`Open ${item.title} catalog page`"
          variant="text"
          @click.stop
        />
      </template>
    </v-treeview>
  </v-card>
</template>

<script lang="ts" setup>
  /** Browses the public Earth Engine and community STAC catalogs without requiring authentication. */
  import { ref, watch } from 'vue'
  import {
    buildCommunityThemes,
    type CatalogEntry,
    catalogUrl,
    fetchCatalogAssetType,
    fetchCatalogEntries,
    fetchCommunityDatasets,
    fetchPublisherHrefs,
    getCatalogAssetPresentation,
    getDatasetCatalogUrl,
  } from './catalog'

  /** Represents one entry in the fully loaded public catalog hierarchy. */
  interface CatalogTreeItem {
    catalogHref?: string
    children?: CatalogTreeItem[]
    href?: string
    icon: string
    iconColor?: string
    title: string
    value: string
  }

  /** Receives whether the catalog tab is currently visible to defer network activity until it is opened. */
  const { active } = defineProps<{
    /** Indicates that the surrounding tab currently displays the public catalog. */
    active: boolean
  }>()

  /** Holds the complete public catalog hierarchy after it has been loaded. */
  const catalogItems = ref<CatalogTreeItem[]>([])

  /** Indicates that the catalog's single up-front fetch is in progress. */
  const isLoading = ref(false)

  /** Prevents repeated catalog downloads when a user returns to the tab. */
  const hasLoaded = ref(false)

  /** Shares the root request between Google and Publisher branches. */
  let rootProviders: Promise<CatalogEntry[]> | undefined

  /** Shares the publisher classification request between Google and Publisher branches. */
  let publisherHrefs: Promise<Set<string>> | undefined

  /** Retrieves and caches the public STAC root entries. */
  function getRootProviders () {
    rootProviders ??= fetchCatalogEntries(catalogUrl)

    return rootProviders
  }

  /** Retrieves and caches the providers identified as publishers by their STAC metadata. */
  function getPublisherProviders () {
    publisherHrefs ??= getRootProviders().then(fetchPublisherHrefs)

    return publisherHrefs
  }

  /**
   * Builds all leaf entries for one STAC provider and keeps a request failure local to that provider's branch.
   */
  async function buildProviderItem (provider: CatalogEntry): Promise<CatalogTreeItem> {
    try {
      const collections = await fetchCatalogEntries(provider.href)
      const typedCollections = await Promise.all(collections.map(async collection => ({
        assetType: await fetchCatalogAssetType(collection.href).catch(() => undefined),
        collection,
      })))
      const children: CatalogTreeItem[] = typedCollections.map(({ assetType, collection }) => {
        const datasetId = collection.title.replaceAll('_', '/')
        const title = collection.title.split('_').slice(1).join('_') || collection.title
        const { color: iconColor, icon } = getCatalogAssetPresentation(assetType)

        return {
          catalogHref: getDatasetCatalogUrl(datasetId),
          icon,
          iconColor,
          title,
          value: `dataset:${collection.href}`,
        }
      })

      children.sort((first, second) => first.title.localeCompare(second.title))

      return {
        children,
        href: provider.href,
        icon: 'mdi-folder',
        title: provider.title,
        value: `provider:${provider.href}`,
      }
    } catch {
      return {
        children: [getFailureItem(`provider:${provider.href}`)],
        href: provider.href,
        icon: 'mdi-folder',
        title: provider.title,
        value: `provider:${provider.href}`,
      }
    }
  }

  /** Creates a tree item that makes a failed public request visible without blocking the remaining catalog. */
  function getFailureItem (value: string): CatalogTreeItem {
    return {
      icon: 'mdi-alert-circle-outline',
      title: 'Unable to load this catalog section.',
      value: `${value}:error`,
    }
  }

  /** Retrieves every public catalog branch when the tab is first displayed and retains partial results on failure. */
  async function loadCatalog () {
    if (hasLoaded.value || isLoading.value) {
      return
    }

    isLoading.value = true

    try {
      const [stacResult, communityResult] = await Promise.allSettled([
        Promise.all([getRootProviders(), getPublisherProviders()]),
        fetchCommunityDatasets(),
      ])
      let stacSections: CatalogTreeItem[]

      if (stacResult.status === 'fulfilled') {
        const [providers, publisherHrefs] = stacResult.value
        const providerItems = await Promise.all(providers.map(provider => buildProviderItem(provider)))
        const googleItems = providerItems.filter(item => publisherHrefs.has(item.href ?? '') === false)
        const publisherItems = providerItems.filter(item => publisherHrefs.has(item.href ?? ''))

        googleItems.sort((first, second) => first.title.localeCompare(second.title))
        publisherItems.sort((first, second) => first.title.localeCompare(second.title))
        stacSections = [
          {
            children: googleItems,
            icon: 'mdi-folder',
            title: 'Google',
            value: 'google',
          },
          {
            children: publisherItems,
            icon: 'mdi-folder',
            title: 'Publishers',
            value: 'publishers',
          },
        ]
      } else {
        stacSections = [
          {
            children: [getFailureItem('google')],
            icon: 'mdi-folder',
            title: 'Google',
            value: 'google',
          },
          {
            children: [getFailureItem('publishers')],
            icon: 'mdi-folder',
            title: 'Publishers',
            value: 'publishers',
          },
        ]
      }

      let communitySection: CatalogTreeItem

      if (communityResult.status === 'fulfilled') {
        const children: CatalogTreeItem[] = buildCommunityThemes(communityResult.value).map(theme => {
          const datasets = theme.datasets.map(dataset => {
            const { color: iconColor, icon } = getCatalogAssetPresentation(dataset.type)

            return {
              catalogHref: dataset.docs,
              icon,
              iconColor,
              title: dataset.title,
              value: `community:${dataset.docs}`,
            }
          })

          return {
            children: datasets,
            icon: 'mdi-folder',
            title: theme.title,
            value: `theme:${theme.title}`,
          }
        })

        communitySection = {
          children,
          icon: 'mdi-folder',
          title: 'Community',
          value: 'community',
        }
      } else {
        communitySection = {
          children: [getFailureItem('community')],
          icon: 'mdi-folder',
          title: 'Community',
          value: 'community',
        }
      }

      catalogItems.value = [...stacSections, communitySection]
    } catch {
      catalogItems.value = [
        {
          children: [getFailureItem('catalog')],
          icon: 'mdi-folder',
          title: 'Catalog',
          value: 'catalog',
        },
      ]
    } finally {
      hasLoaded.value = true
      isLoading.value = false
    }
  }

  /** Starts the complete catalog request only after the surrounding tab becomes visible. */
  watch(() => active, isActive => {
    if (isActive) {
      void loadCatalog()
    }
  }, { immediate: true })
</script>

<style scoped>
  .catalog-tree-card {
    border-start-end-radius: 0;
    border-start-start-radius: 0;
  }

  .catalog-tree-card :deep(.v-list-item) {
    min-block-size: 28px;
    padding-block: 0;
  }

  .catalog-tree-card :deep(.v-list-item-title) {
    font-size: 10px;
  }

  .catalog-tree-card :deep(.catalog-tree-link) {
    color: rgb(var(--v-theme-on-surface) / var(--v-medium-emphasis-opacity));
    opacity: 0;
    pointer-events: none;
  }

  .catalog-tree-card :deep(.v-list-item:hover .catalog-tree-link),
  .catalog-tree-card :deep(.v-list-item:focus-within .catalog-tree-link) {
    opacity: 1;
    pointer-events: auto;
  }

  .catalog-tree-card :deep(.v-treeview-indent-lines) {
    grid-template-columns: repeat(var(--v-indent-parts, 1), 28px);
  }
</style>
