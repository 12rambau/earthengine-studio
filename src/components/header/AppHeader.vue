<template>
  <v-app-bar
    border
    :elevation="0"
    height="56"
  >
    <img
      alt="Earth Engine Studio logo"
      class="ml-2 mr-3"
      height="32"
      :src="appLogo"
      width="32"
    >

    <v-toolbar-title>Earth Engine Studio</v-toolbar-title>

    <v-spacer />

    <avatar-menu />
  </v-app-bar>
</template>

<script lang="ts" setup>
  import appLogo from '@/assets/logo.png'
  import AvatarMenu from './AvatarMenu.vue'
</script>
