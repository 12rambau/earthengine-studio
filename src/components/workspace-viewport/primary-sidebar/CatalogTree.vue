<template>
  <v-card
    class="catalog-tree-card"
    elevation="0"
    :loading="isLoading ? 'primary' : false"
    rounded="lg"
  >
    <v-treeview
      v-model:activated="activatedValues"
      v-model:opened="openedValues"
      activatable
      aria-label="Earth Engine data catalog"
      fluid
      hide-actions
      indent-lines
      item-children="children"
      item-title="title"
      item-value="value"
      :items="catalogItems"
      open-on-click
      return-object
    >
      <template #prepend="{ isOpen, item }">
        <v-icon
          :color="item.iconColor"
          :icon="item.children && isOpen ? 'mdi-folder-open' : item.icon"
          size="small"
        />
      </template>

    </v-treeview>
  </v-card>
</template>

<script lang="ts" setup>
  /** Browses the public Earth Engine and community STAC catalogs without requiring authentication. */
  import { nextTick, ref, watch } from 'vue'
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
  } from './catalog'

  /** Represents one entry in the fully loaded public catalog hierarchy. */
  interface CatalogTreeItem {
    children?: CatalogTreeItem[]
    href?: string
    icon: string
    iconColor?: string
    previewTarget?: CatalogPreviewTarget
    title: string
    value: string
  }

  /** Receives whether the catalog tab is currently visible and any dataset selected from the header search. */
  const { active, selectedValue } = defineProps<{
    /** Indicates that the surrounding tab currently displays the public catalog. */
    active: boolean

    /** Identifies the tree node that a header search selection requests be highlighted and revealed. */
    selectedValue?: string | null
  }>()

  /** Requests the owning sidebar to display detailed metadata for a selected catalog leaf. */
  const emit = defineEmits<{
    /** Supplies the selected public STAC dataset's stable preview target. */
    preview: [target: CatalogPreviewTarget]
  }>()

  /** Holds the complete public catalog hierarchy after it has been loaded. */
  const catalogItems = ref<CatalogTreeItem[]>([])

  /** Highlights the dataset most recently selected from either the tree or the header search. */
  const activatedValues = ref<CatalogTreeItem[]>([])

  /** Keeps every ancestor folder expanded for the currently highlighted dataset. */
  const openedValues = ref<CatalogTreeItem[]>([])

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
        const catalogHref = getDatasetCatalogUrl(datasetId)

        return {
          icon,
          iconColor,
          previewTarget: {
            assetName: datasetId,
            catalogHref,
            source: 'stac',
            stacHref: collection.href,
            tags: [provider.title],
            title,
            type: assetType ?? 'unknown',
          },
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

  /** Emits a preview whenever a dataset leaf becomes the treeview's activated item. */
  function previewCatalogItem (items: CatalogTreeItem[]) {
    const [item] = items

    if (item?.previewTarget) {
      emit('preview', item.previewTarget)
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

  /** Opens the preview dialog whenever activation changes, whether from a tree click or a header search selection. */
  watch(activatedValues, previewCatalogItem)

  /** Finds every ancestor folder item on the way to a target dataset value, or returns null when not found. */
  function findAncestorPath (items: CatalogTreeItem[], value: string): CatalogTreeItem[] | null {
    for (const item of items) {
      if (item.value === value) {
        return [item]
      }

      if (item.children) {
        const childPath = findAncestorPath(item.children, value)

        if (childPath) {
          return [item, ...childPath]
        }
      }
    }

    return null
  }

  /** Expands every ancestor folder and highlights the dataset requested from the header search. */
  watch(
    () => [selectedValue, catalogItems.value] as const,
    async ([value, items]) => {
      if (!value) {
        return
      }

      const path = findAncestorPath(items, value)

      if (!path) {
        return
      }

      const target = path.at(-1)
      const ancestors = path.slice(0, -1)

      openedValues.value = [...new Set([...openedValues.value, ...ancestors])]
      activatedValues.value = target ? [target] : []

      await nextTick()
      document.querySelector('.catalog-tree-card .v-list-item--active')?.scrollIntoView({ block: 'center' })
    },
  )
</script>

<style scoped>
  .catalog-tree-card {
    border-start-end-radius: 0;
    border-start-start-radius: 0;
  }

  .catalog-tree-card :deep(.v-treeview-indent-lines) {
    grid-template-columns: repeat(var(--v-indent-parts, 1), 28px);
  }

  .catalog-tree-card :deep(.v-list-item) {
    background-color: transparent;
  }
</style>
