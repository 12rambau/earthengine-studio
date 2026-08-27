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
      </v-tabs>
    </template>

    <v-tabs-window v-model="activeTab">
      <v-tabs-window-item value="catalog">
        <catalog-tree :active="activeTab === 'catalog'" />
      </v-tabs-window-item>

      <v-tabs-window-item value="documentation">
        <documentation-tree />
      </v-tabs-window-item>
    </v-tabs-window>
  </workspace-sheet>
</template>

<script lang="ts" setup>
  /** Adapts the shared workspace sheet to represent the closable primary sidebar. */
  import { ref } from 'vue'
  import CatalogTree from './primary-sidebar/CatalogTree.vue'
  import DocumentationTree from './primary-sidebar/DocumentationTree.vue'
  import WorkspaceSheet from './WorkspaceSheet.vue'

  /** Declares the presentation state owned by the workspace viewport. */
  defineProps<{
    /** Indicates that the primary sidebar currently occupies the fullscreen workspace view. */
    isFullscreen: boolean
  }>()

  /** Identifies the primary-sidebar tab currently displayed in the content area, beginning with the public catalog. */
  const activeTab = ref('catalog')

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
