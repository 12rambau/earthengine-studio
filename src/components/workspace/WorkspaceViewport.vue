<template>
  <section
    aria-label="Workspace viewport"
    class="workspace-viewport"
  >
    <primary-sidebar />
    <secondary-sidebar />
    <editor-pane />
    <bottom-panel />
  </section>
</template>

<script lang="ts" setup>
  import BottomPanel from './BottomPanel.vue'
  import EditorPane from './EditorPane.vue'
  import PrimarySidebar from './PrimarySidebar.vue'
  import SecondarySidebar from './SecondarySidebar.vue'
</script>

<style scoped>
  .workspace-viewport {
    --workspace-border: rgba(var(--v-theme-on-surface), 0.14);

    background: rgb(var(--v-theme-background));
    block-size: 100%;
    box-sizing: border-box;
    display: grid;
    gap: 8px;
    grid-template-areas:
      'primary editor secondary'
      'primary panel secondary';
    grid-template-columns: minmax(192px, 19vw) minmax(0, 1fr) minmax(224px, 23vw);
    grid-template-rows: minmax(0, 1fr) 220px;
    min-block-size: 0;
    overflow: hidden;
    padding: 8px;
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
      grid-template-areas:
        'primary editor'
        'panel secondary';
      grid-template-columns: minmax(160px, 38%) minmax(0, 1fr);
      grid-template-rows: minmax(0, 1fr) minmax(156px, 34%);
    }

  }

  @media (max-width: 520px) {
    .workspace-viewport {
      grid-template-columns: minmax(136px, 42%) minmax(0, 1fr);
    }
  }
</style>
