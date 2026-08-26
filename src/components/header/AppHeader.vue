<template>
  <v-app-bar
    border
    :elevation="0"
    height="56"
  >
    <v-icon
      color="primary"
      icon="mdi-earth"
      size="22"
    />

    <v-toolbar-title>Earth Engine Studio</v-toolbar-title>

    <v-spacer />

    <avatar-menu />
  </v-app-bar>
</template>

<script lang="ts" setup>
  import AvatarMenu from './AvatarMenu.vue'
</script>
