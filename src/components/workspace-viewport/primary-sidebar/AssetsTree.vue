<template>
  <v-card
    class="asset-tree-card"
    elevation="0"
    :loading="isLoading ? 'primary' : false"
    rounded="lg"
  >
    <v-card-text
      v-if="!accessToken"
      class="text-medium-emphasis"
    >
      Connect a Google account to browse Earth Engine assets.
    </v-card-text>

    <v-card-text
      v-else-if="!selectedProject"
      class="text-medium-emphasis"
    >
      Select a Google Cloud project to browse Earth Engine assets.
    </v-card-text>

    <v-card-text
      v-else-if="loadError"
      class="text-error"
    >
      {{ loadError }}
    </v-card-text>

    <v-card-text
      v-else-if="isRootLoading"
      class="text-medium-emphasis"
    >
      Loading Earth Engine assets.
    </v-card-text>

    <v-treeview
      v-else
      v-model:opened="opened"
      aria-label="Earth Engine assets"
      fluid
      hide-actions
      indent-lines
      item-children="children"
      item-title="title"
      item-value="value"
      :items="assetTree"
      no-data-text="No Earth Engine assets in this project."
      open-on-click
      @click:open="loadOpenedFolder"
      @click:select="previewAssetItem"
    >
      <template #prepend="{ isOpen, item }">
        <v-icon
          :color="item.iconColor"
          :icon="item.isFolder && isOpen ? 'mdi-folder-open' : item.icon"
          size="small"
        />
      </template>

      <template #title="{ item }">
        <v-tooltip
          v-if="item.asset && !item.isFolder"
          content-class="asset-id-tooltip"
          location="end"
          :offset="8"
          :open-delay="200"
          :text="item.asset.name"
        >
          <template #activator="{ props: tooltipProps }">
            <span v-bind="tooltipProps">{{ item.title }}</span>
          </template>
        </v-tooltip>

        <span v-else>{{ item.title }}</span>
      </template>

      <template #append="{ item }">
        <v-btn
          v-if="item.asset && isPreviewableAsset(item.asset)"
          :aria-label="`Preview ${item.title}`"
          class="asset-preview-action"
          icon="mdi-eye-outline"
          size="x-small"
          :title="`Preview ${item.title}`"
          variant="text"
          @click.stop="previewAsset(item.asset)"
        />
      </template>
    </v-treeview>
  </v-card>
</template>

<script lang="ts" setup>
  /** Displays the signed-in account's Earth Engine project assets as a lazily loaded folder hierarchy. */
  import type { EarthEngineAsset } from '@/services/earthEngineAssets'
  import { storeToRefs } from 'pinia'
  import { computed, ref, watch } from 'vue'
  import { fetchEarthEngineAssets } from '@/services/earthEngineAssets'
  import { useGoogleAuthStore } from '@/stores/googleAuth'
  import { useGoogleProjectsStore } from '@/stores/googleProjects'
  import { getCatalogAssetPresentation } from './catalog'

  /** Represents one visible Earth Engine asset or transient child state in the Vuetify tree. */
  interface AssetTreeItem {
    asset?: EarthEngineAsset
    children?: AssetTreeItem[]
    icon: string
    iconColor?: string
    isFolder: boolean
    isLoading?: boolean
    title: string
    value: string
  }

  /** Receives whether the surrounding tab is visible and may request the project asset root. */
  const { active } = defineProps<{
    /** Indicates whether the Assets tab currently displays this tree. */
    active: boolean
  }>()

  /** Requests that the parent sidebar open a type-specific preview for a selected leaf asset. */
  const emit = defineEmits<{
    /** Supplies the canonical asset ID and Earth Engine type selected from the tree. */
    preview: [assetId: string, assetType: string]
  }>()

  /** Provides the transient OAuth token required by authenticated Earth Engine asset requests. */
  const { accessToken } = storeToRefs(useGoogleAuthStore())

  /** Provides the selected project used as the root of the visible asset hierarchy. */
  const { selectedProject } = storeToRefs(useGoogleProjectsStore())

  /** Holds the loaded top-level assets and the child branches inserted as folders are opened. */
  const assetTree = ref<AssetTreeItem[]>([])

  /** Tracks folders currently expanded by the user. */
  const opened = ref<string[]>([])

  /** Indicates when the top-level project asset listing is in progress and the tree has no root items to render. */
  const isRootLoading = ref(false)

  /** Counts outstanding folder requests so the card signals lazy loading without hiding the active tree branch. */
  const loadingFolderCount = ref(0)

  /** Signals all active asset requests through the card's native loading state. */
  const isLoading = computed(() => isRootLoading.value || loadingFolderCount.value > 0)

  /** Exposes a root-listing failure while preserving an actionable, connected workspace. */
  const loadError = ref<string | null>(null)

  /** Avoids fetching an already loaded root again while its OAuth session and selected project are unchanged. */
  let loadedRootKey: string | undefined

  /** Invalidates late folder responses when a different project root replaces the tree. */
  let treeVersion = 0

  /** Records folders whose direct children have been successfully retrieved during the current tree lifetime. */
  const loadedFolders = new Set<string>()

  /** Records folders with an active request so reopening an item cannot issue a duplicate child listing. */
  const loadingFolders = new Set<string>()

  /** Converts one REST asset into a tree item, retaining a loading child only for navigable folders. */
  function toAssetTreeItem (asset: EarthEngineAsset): AssetTreeItem {
    const isFolder = asset.type === 'FOLDER'
    const presentation = isFolder ? { icon: 'mdi-folder' } : getCatalogAssetPresentation(asset.type)

    return {
      asset,
      children: isFolder ? [getLoadingTreeItem(asset.name)] : undefined,
      icon: presentation.icon,
      iconColor: presentation.color,
      isFolder,
      title: asset.name.split('/').pop() || asset.name,
      value: asset.name,
    }
  }

  /** Represents an unopened folder's pending child request so the tree can expose an expand control immediately. */
  function getLoadingTreeItem (parent: string): AssetTreeItem {
    return {
      icon: 'mdi-loading',
      isFolder: false,
      title: 'Loading ...',
      value: `${parent}:loading`,
    }
  }

  /** Replaces one item and its ancestor branches so VTreeview receives a new hierarchy after an async update. */
  function replaceAssetTreeItem (
    items: AssetTreeItem[],
    value: string,
    update: (item: AssetTreeItem) => AssetTreeItem,
  ): AssetTreeItem[] {
    return items.map(item => {
      if (item.value === value) {
        return update(item)
      }

      return item.children
        ? { ...item, children: replaceAssetTreeItem(item.children, value, update) }
        : item
    })
  }

  /** Finds the current tree item for a stable asset path after a branch replacement. */
  function findAssetTreeItem (items: AssetTreeItem[], value: string): AssetTreeItem | undefined {
    for (const item of items) {
      if (item.value === value) {
        return item
      }

      const child = item.children && findAssetTreeItem(item.children, value)

      if (child) {
        return child
      }
    }
  }

  /** Loads one folder's direct children once and replaces its transient loading row with the returned assets. */
  async function loadAssetChildren (item: AssetTreeItem) {
    const token = accessToken.value
    const requestVersion = treeVersion
    const folderName = item.value

    if (!token || loadingFolders.has(folderName) || loadedFolders.has(folderName)) {
      return
    }

    loadingFolders.add(folderName)
    assetTree.value = replaceAssetTreeItem(assetTree.value, folderName, currentItem => ({
      ...currentItem,
      children: [getLoadingTreeItem(folderName)],
      isLoading: true,
    }))
    loadingFolderCount.value += 1

    try {
      const assets = await fetchEarthEngineAssets(token, folderName)

      if (requestVersion !== treeVersion) {
        return
      }

      assetTree.value = replaceAssetTreeItem(assetTree.value, folderName, currentItem => ({
        ...currentItem,
        children: assets.map(asset => toAssetTreeItem(asset)),
        isLoading: false,
      }))
      loadedFolders.add(folderName)
    } catch {
      if (requestVersion === treeVersion) {
        assetTree.value = replaceAssetTreeItem(assetTree.value, folderName, currentItem => ({
          ...currentItem,
          children: [{
            icon: 'mdi-alert-circle-outline',
            isFolder: false,
            title: 'Unable to load this folder.',
            value: `${folderName}:error`,
          }],
          isLoading: false,
        }))
      }
    } finally {
      if (requestVersion === treeVersion) {
        loadingFolders.delete(folderName)
        loadingFolderCount.value = Math.max(loadingFolderCount.value - 1, 0)
      }
    }
  }

  /** Starts loading the current folder item when Treeview opens its stable asset-path branch. */
  function loadOpenedFolder ({ id, value }: { id: unknown, value: boolean }) {
    if (!value || typeof id !== 'string') {
      return
    }

    const item = findAssetTreeItem(assetTree.value, id)

    if (item?.isFolder) {
      void loadAssetChildren(item)
    }
  }

  /** Emits a selected leaf asset so the parent can route it to an appropriate preview dialog. */
  function previewAssetItem ({ id }: { id: unknown }) {
    if (typeof id !== 'string') {
      return
    }

    const item = findAssetTreeItem(assetTree.value, id)

    if (item?.asset && !item.isFolder) {
      emit('preview', item.asset.name, item.asset.type)
    }
  }

  /** Identifies asset types that have a dedicated metadata preview dialog. */
  function isPreviewableAsset (asset: EarthEngineAsset) {
    return ['IMAGE', 'IMAGE_COLLECTION', 'TABLE', 'FEATURE_COLLECTION'].includes(asset.type)
  }

  /** Opens the selected compatible asset without changing the tree's active branch. */
  function previewAsset (asset: EarthEngineAsset) {
    emit('preview', asset.name, asset.type)
  }

  /** Loads the selected project's root once the Assets tab is displayed and discards stale project responses. */
  watch([() => active, accessToken, selectedProject], async ([isActive, token, project], _previous, onCleanup) => {
    let isCurrent = true
    onCleanup(() => {
      isCurrent = false
    })

    if (!isActive) {
      return
    }

    if (!token || !project) {
      assetTree.value = []
      opened.value = []
      loadError.value = null
      loadedFolders.clear()
      loadingFolders.clear()
      loadingFolderCount.value = 0
      loadedRootKey = undefined
      treeVersion += 1
      return
    }

    const rootKey = `${token}:${project.id}`

    if (rootKey === loadedRootKey) {
      return
    }

    const requestVersion = ++treeVersion
    assetTree.value = []
    opened.value = []
    loadError.value = null
    loadedFolders.clear()
    loadingFolders.clear()
    loadingFolderCount.value = 0
    isRootLoading.value = true

    try {
      const assets = await fetchEarthEngineAssets(token, `projects/${project.id}`)

      if (isCurrent && requestVersion === treeVersion) {
        assetTree.value = assets.map(asset => toAssetTreeItem(asset))
        loadedRootKey = rootKey
      }
    } catch (error) {
      if (isCurrent && requestVersion === treeVersion) {
        loadError.value = error instanceof Error ? error.message : 'Unable to retrieve Earth Engine assets.'
      }
    } finally {
      if (isCurrent && requestVersion === treeVersion) {
        isRootLoading.value = false
      }
    }
  }, { immediate: true })
</script>

<style scoped>
  .asset-tree-card {
    border-start-end-radius: 0;
    border-start-start-radius: 0;
  }

  .asset-tree-card :deep(.v-treeview-indent-lines) {
    grid-template-columns: repeat(var(--v-indent-parts, 1), 28px);
  }

  .asset-preview-action {
    opacity: 0;
  }

  .asset-tree-card :deep(.v-treeview-item:hover .asset-preview-action),
  .asset-tree-card :deep(.v-treeview-item:focus-within .asset-preview-action) {
    opacity: 1;
  }

  :global(.asset-id-tooltip) {
    font-family: 'Roboto Mono', monospace;
    font-size: 10px;
    line-height: 14px;
    padding: 0 4px;
  }
</style>
