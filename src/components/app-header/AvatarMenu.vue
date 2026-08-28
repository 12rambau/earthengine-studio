<template>
  <v-menu
    eager
    location="bottom end"
    offset="0"
  >
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        aria-label="Open user menu"
        icon
        size="large"
        variant="text"
      >
        <v-avatar
          color="primary"
          size="large"
        >
          <v-icon icon="mdi-account" />
        </v-avatar>
      </v-btn>
    </template>

    <v-list
      aria-label="User menu"
      min-width="224"
    >
      <theme-selector-dialog />

      <layout-preference-dialog />

      <v-divider />

      <v-list-subheader>Help</v-list-subheader>

      <keyboard-shortcuts-dialog />
    </v-list>
  </v-menu>
</template>

<script lang="ts" setup>
  /** Groups appearance, layout, and keyboard preference dialogs beneath the account menu. */
  import KeyboardShortcutsDialog from './avatar-menu/KeyboardShortcutsDialog.vue'
  import LayoutPreferenceDialog from './avatar-menu/LayoutPreferenceDialog.vue'
  import ThemeSelectorDialog from './avatar-menu/ThemeSelectorDialog.vue'
</script>
