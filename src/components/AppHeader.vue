<template>
  <v-app-bar
    color="workspace-background"
    density="compact"
    :elevation="0"
    height="48"
  >
    <v-toolbar-title>
      <span class="d-flex align-center">
        <img
          alt="Earth Engine Studio logo"
          class="mr-2"
          height="32"
          :src="appLogo"
          width="32"
        >

        <span>Earth Engine Studio</span>
      </span>
    </v-toolbar-title>

    <avatar-menu />
  </v-app-bar>
</template>

<script lang="ts" setup>
  /** Renders the application identity and exposes account preferences through the header menu. */
  import appLogo from '@/assets/logo.png'
  import AvatarMenu from './app-header/AvatarMenu.vue'
</script>
