<template>
  <v-menu
    eager
    location="bottom end"
    offset="8"
  >
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        aria-label="Open user menu"
        density="compact"
        icon
        variant="text"
      >
        <v-avatar
          color="primary"
          size="24"
          variant="tonal"
        >
          <v-icon icon="mdi-account" />
        </v-avatar>
      </v-btn>
    </template>

    <v-list
      aria-label="User menu"
      density="comfortable"
      min-width="224"
    >
      <theme-selector-dialog />

      <layout-preference-dialog />

      <v-divider />

      <v-list-subheader>Help</v-list-subheader>

      <v-list-item
        aria-label="Open keyboard shortcuts"
        prepend-icon="mdi-keyboard-outline"
        role="button"
        title="Keyboard shortcuts"
        @click="isKeyboardShortcutsDialogOpen = true"
      />
    </v-list>
  </v-menu>

  <v-dialog
    v-model="isKeyboardShortcutsDialogOpen"
    max-width="520"
  >
    <v-card
      aria-label="Keyboard shortcuts dialog"
      class="keyboard-shortcuts-dialog"
    >
      <v-card-title class="d-flex align-center">
        Keyboard shortcuts

        <v-spacer />

        <v-btn
          aria-label="Close keyboard shortcuts"
          icon="mdi-close"
          title="Close keyboard shortcuts"
          variant="text"
          @click="isKeyboardShortcutsDialogOpen = false"
        />
      </v-card-title>

      <v-list density="comfortable">
        <v-list-item
          v-for="shortcut in keyboardShortcuts"
          :key="shortcut.title"
          :prepend-icon="shortcut.icon"
          :title="shortcut.title"
        >
          <template #append>
            <span class="shortcut-keys">
              <kbd
                v-for="key in shortcut.keys"
                :key="key"
                class="shortcut-key"
              >{{ key }}</kbd>
            </span>
          </template>
        </v-list-item>
      </v-list>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
  import { ref } from 'vue'
  import LayoutPreferenceDialog from './avatar-menu/LayoutPreferenceDialog.vue'
  import ThemeSelectorDialog from './avatar-menu/ThemeSelectorDialog.vue'

  const isKeyboardShortcutsDialogOpen = ref(false)
  const keyboardShortcuts = [
    { icon: 'mdi-dock-left', keys: ['Ctrl', 'B'], title: 'Toggle primary sidebar' },
    { icon: 'mdi-dock-right', keys: ['Ctrl', 'Alt', 'B'], title: 'Toggle secondary sidebar' },
    { icon: 'mdi-dock-bottom', keys: ['Ctrl', 'J'], title: 'Toggle panel' },
  ]
</script>

<style scoped>
  .keyboard-shortcuts-dialog {
    border-radius: 8px;
  }

  .shortcut-keys {
    display: flex;
    gap: 4px;
  }

  .shortcut-key {
    align-items: center;
    background: rgba(var(--v-theme-on-surface), 0.08);
    border: 1px solid rgba(var(--v-theme-on-surface), 0.18);
    border-radius: 4px;
    display: inline-flex;
    font-family: 'Roboto Mono', monospace;
    font-size: 11px;
    min-block-size: 24px;
    padding-inline: 6px;
  }
</style>
