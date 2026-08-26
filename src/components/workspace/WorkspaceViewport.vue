<template>
  <section
    aria-label="Workspace viewport"
    class="workspace-viewport"
    :style="workspaceGridStyle"
  >
    <primary-sidebar v-if="layout.primarySidebarVisible" />
    <secondary-sidebar v-if="layout.secondarySidebarVisible" />
    <editor-pane />
    <bottom-panel v-if="layout.panelVisible" />
  </section>
</template>

<script lang="ts" setup>
  import { storeToRefs } from 'pinia'
  import { computed } from 'vue'
  import { useUserPreferencesStore } from '@/stores/userPreferences'
  import BottomPanel from './BottomPanel.vue'
  import EditorPane from './EditorPane.vue'
  import PrimarySidebar from './PrimarySidebar.vue'
  import SecondarySidebar from './SecondarySidebar.vue'
  import { getWorkspaceGridLayout } from './workspaceLayout'

  const userPreferencesStore = useUserPreferencesStore()
  const { layout } = storeToRefs(userPreferencesStore)

  const workspaceGridStyle = computed(() => {
    const desktopGridLayout = getWorkspaceGridLayout(layout.value, 'desktop')
    const compactGridLayout = getWorkspaceGridLayout(layout.value, 'compact')

    return {
      '--workspace-grid-areas': desktopGridLayout.areas,
      '--workspace-grid-areas-compact': compactGridLayout.areas,
      '--workspace-grid-columns': desktopGridLayout.columns,
      '--workspace-grid-columns-compact': compactGridLayout.columns,
      '--workspace-grid-row-gap': desktopGridLayout.rowGap,
      '--workspace-grid-rows': desktopGridLayout.rows,
      '--workspace-grid-rows-compact': compactGridLayout.rows,
    }
  })
</script>

<style scoped>
  .workspace-viewport {
    --workspace-border: rgba(var(--v-theme-on-surface), 0.14);

    background: rgb(var(--v-theme-background));
    block-size: 100%;
    box-sizing: border-box;
    display: grid;
    column-gap: 8px;
    grid-template-areas: var(--workspace-grid-areas);
    grid-template-columns: var(--workspace-grid-columns);
    grid-template-rows: var(--workspace-grid-rows);
    min-block-size: 0;
    overflow: hidden;
    padding: 8px;
    row-gap: var(--workspace-grid-row-gap);
  }

  .workspace-shell {
    background: rgb(var(--v-theme-surface));
    border: 1px solid var(--workspace-border);
    border-radius: 8px;
    min-inline-size: 0;
    overflow: hidden;
  }

  .primary-sidebar {
    grid-area: primary;
  }

  .secondary-sidebar {
    grid-area: secondary;
  }

  .editor-pane {
    background: rgb(var(--v-theme-background));
    grid-area: editor;
  }

  .bottom-panel {
    grid-area: panel;
  }

  @media (max-width: 840px) {
    .workspace-viewport {
      grid-template-areas: var(--workspace-grid-areas-compact);
      grid-template-columns: var(--workspace-grid-columns-compact);
      grid-template-rows: var(--workspace-grid-rows-compact);
    }
  }
</style>
