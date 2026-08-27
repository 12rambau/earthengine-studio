<template>
  <v-card class="ma-1">
    <v-card-text
      v-if="entries === undefined"
      class="text-medium-emphasis"
    >
      Earth Engine authentication is required to load API docs.
    </v-card-text>

    <v-treeview
      v-else
      aria-label="Earth Engine API documentation"
      fluid
      item-children="children"
      item-props="props"
      item-title="title"
      item-value="value"
      :items="documentationTree"
      no-data-text="No API docs available"
      open-on-click
    />
  </v-card>
</template>

<script lang="ts" setup>
  /** Displays Earth Engine API entries or explains that an authenticated session is required to load them. */
  import type { ApiDocumentationEntry } from './docsTree'
  import { computed } from 'vue'
  import { buildDocumentationTree } from './docsTree'

  /** Receives the authenticated algorithm registry once the application session loads it. */
  const { entries } = defineProps<{
    /** Provides parsed Earth Engine API entries; absence means no authenticated registry is available. */
    entries?: ApiDocumentationEntry[]
  }>()

  /** Converts the loaded flat API registry into the hierarchy rendered by the tree view. */
  const documentationTree = computed(() => buildDocumentationTree(entries ?? []))
</script>
