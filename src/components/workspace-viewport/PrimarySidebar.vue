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
        density="compact"
      >
        <v-tab
          prepend-icon="mdi-book-open-variant"
          text="Documentation"
          value="documentation"
        />
      </v-tabs>
    </template>

    <v-tabs-window v-model="activeTab">
      <v-tabs-window-item value="documentation">
        <documentation-tree />
      </v-tabs-window-item>
    </v-tabs-window>
  </workspace-sheet>
</template>

<script lang="ts" setup>
  /** Adapts the shared workspace sheet to represent the closable primary sidebar. */
  import { ref } from 'vue'
  import DocumentationTree from './primary-sidebar/DocumentationTree.vue'
  import WorkspaceSheet from './WorkspaceSheet.vue'

  /** Declares the presentation state owned by the workspace viewport. */
  defineProps<{
    /** Indicates that the primary sidebar currently occupies the fullscreen workspace view. */
    isFullscreen: boolean
  }>()

  /** Identifies the primary-sidebar tab currently displayed in the content area. */
  const activeTab = ref('documentation')

  /** Forwards primary sidebar actions to the workspace viewport. */
  const emit = defineEmits<{
    /** Requests that the workspace hide the primary sidebar. */
    'close': []

    /** Requests that the workspace toggle the primary sidebar fullscreen state. */
    'toggle-fullscreen': []
  }>()
</script>
