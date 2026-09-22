import type { CatalogPreviewTarget } from '@/components/workspace-viewport/primary-sidebar/catalog'
// Utilities
import { defineStore } from 'pinia'
import { ref } from 'vue'

/** Identifies a public catalog dataset that should be opened and highlighted in the primary sidebar. */
export interface CatalogSelectionRequest {
  previewTarget: CatalogPreviewTarget
  requestId: number
  treeValue: string
}

export const useAppStore = defineStore('app', () => {
  /** Holds the most recent catalog search selection until the primary sidebar consumes it. */
  const catalogSelectionRequest = ref<CatalogSelectionRequest | null>(null)

  /** Requests that the primary sidebar open the catalog tab, preview a dataset, and highlight it in the tree. */
  function requestCatalogSelection (previewTarget: CatalogPreviewTarget, treeValue: string) {
    catalogSelectionRequest.value = {
      previewTarget,
      requestId: (catalogSelectionRequest.value?.requestId ?? 0) + 1,
      treeValue,
    }
  }

  return {
    catalogSelectionRequest,
    requestCatalogSelection,
  }
})
