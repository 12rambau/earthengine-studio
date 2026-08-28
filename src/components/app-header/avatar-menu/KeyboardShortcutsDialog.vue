<template>
  <v-dialog
    v-model="isOpen"
    location="top"
    location-strategy="connected"
    max-width="calc(100vw - 112px)"
    origin="overlap"
    target=".catalog-search-field .v-field"
    transition="dialog-scale-transition"
    viewport-margin="0"
    width="480"
  >
    <template #activator="{ props }">
      <v-list-item
        v-bind="props"
        aria-label="Open keyboard shortcuts"
        title="Keyboard shortcuts"
      >
        <template #prepend>
          <v-icon
            icon="mdi-keyboard-outline"
            size="small"
          />
        </template>
      </v-list-item>
    </template>

    <v-card
      aria-label="Keyboard shortcuts dialog"
      rounded="md"
    >
      <v-sheet
        class="d-flex align-center justify-center"
        color="primary"
        height="24"
      >
        <span style="color: rgb(var(--v-theme-on-primary))">Keyboard shortcuts</span>
      </v-sheet>

      <v-list aria-label="Keyboard shortcuts">
        <v-list-item
          v-for="shortcut in keyboardShortcuts"
          :key="shortcut.title"
          :title="shortcut.title"
        >
          <template #prepend>
            <v-icon
              :icon="shortcut.icon"
              size="small"
            />
          </template>

          <template #append>
            <span class="d-flex align-center">
              <template
                v-for="(key, index) in shortcut.keys"
                :key="key"
              >
                <span v-if="index > 0">+</span>

                <v-chip
                  rounded="sm"
                  size="x-small"
                  variant="tonal"
                >{{ key }}</v-chip>
              </template>
            </span>
          </template>
        </v-list-item>
      </v-list>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
  /** Lists the keyboard commands that control the workspace layout. */
  import { ref } from 'vue'

  /** Defines the shortcuts shown to users for workspace visibility controls. */
  const keyboardShortcuts = [
    { icon: 'mdi-magnify', keys: ['Ctrl', 'K'], title: 'Search catalog' },
    { icon: 'mdi-dock-left', keys: ['Ctrl', 'B'], title: 'Toggle primary sidebar' },
    { icon: 'mdi-dock-right', keys: ['Ctrl', 'Alt', 'B'], title: 'Toggle secondary sidebar' },
    { icon: 'mdi-dock-bottom', keys: ['Ctrl', 'J'], title: 'Toggle panel' },
  ]

  /** Controls whether the keyboard shortcut reference is displayed as a dialog. */
  const isOpen = ref(false)
</script>
