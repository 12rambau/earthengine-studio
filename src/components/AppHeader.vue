<template>
  <v-app-bar
    color="workspace-background"
    density="compact"
    :elevation="0"
    height="48"
  >
    <div class="app-header-content">
      <v-toolbar-title class="app-title">
        <span class="app-brand">
          <img
            alt="Earth Engine Studio logo"
            class="mr-2"
            height="32"
            :src="appLogo"
            width="32"
          >

          <span class="app-title-name">Earth Engine Studio</span>
        </span>
      </v-toolbar-title>

      <div class="header-catalog-search">
        <catalog-search />
      </div>

      <div class="app-header-actions">
        <avatar-menu />
      </div>
    </div>
  </v-app-bar>
</template>

<script lang="ts" setup>
  /** Renders the application identity and exposes account preferences through the header menu. */
  import appLogo from '@/assets/logo.png'
  import AvatarMenu from './app-header/AvatarMenu.vue'
  import CatalogSearch from './app-header/CatalogSearch.vue'
</script>

<style scoped>
  .app-header-content {
    align-items: center;
    block-size: 100%;
    display: flex;
    inline-size: 100%;
    padding-inline: 8px;
    position: relative;
  }

  .app-brand {
    align-items: center;
    display: flex;
  }

  .app-title {
    flex: 1 1 0;
    min-inline-size: 0;
  }

  .app-header-actions {
    margin-inline-start: auto;
  }

  .header-catalog-search {
    inline-size: calc(100% - 112px);
    inset-block-start: 50%;
    inset-inline-start: 50%;
    max-inline-size: 480px;
    position: absolute;
    transform: translate(-50%, -50%);
  }

  @media (max-width: 600px) {
    .app-title-name {
      display: none;
    }
  }
</style>
