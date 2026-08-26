<template>
  <v-app>
    <app-header />

    <v-main
      aria-label="Workspace canvas"
      class="workspace-main"
    >
      <workspace-viewport />
    </v-main>
  </v-app>
</template>

<script lang="ts" setup>
  import AppHeader from '@/components/header/AppHeader.vue'
  import WorkspaceViewport from '@/components/workspace/WorkspaceViewport.vue'
</script>

<style scoped>
  .workspace-main {
    block-size: 100dvh;
    overflow: hidden;
  }
</style>
