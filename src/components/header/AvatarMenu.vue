<template>
  <v-menu
    location="bottom end"
    offset="8"
  >
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        aria-label="Open user menu"
        icon
        variant="text"
      >
        <v-avatar
          color="primary"
          size="32"
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
      <v-menu
        location="start"
        offset="8"
      >
        <template #activator="{ props }">
          <v-list-item
            v-bind="props"
            aria-label="Change appearance"
            :prepend-icon="themeIcon"
            :subtitle="themeLabel"
            title="Appearance"
          >
            <template #append>
              <v-icon icon="mdi-chevron-right" />
            </template>
          </v-list-item>
        </template>

        <v-list
          aria-label="Appearance settings"
          density="comfortable"
          min-width="224"
        >
          <v-list-item
            v-for="option in themeOptions"
            :key="option.value"
            :active="selectedThemeName === option.value"
            :aria-label="option.title"
            :prepend-icon="option.icon"
            :title="option.title"
            @click="setTheme(option.value)"
          >
            <template
              v-if="selectedThemeName === option.value"
              #append
            >
              <v-icon icon="mdi-check" />
            </template>
          </v-list-item>
        </v-list>
      </v-menu>

      <layout-customization-menu />

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
  import { storeToRefs } from 'pinia'
  import { computed, ref } from 'vue'
  import {
    type ThemeName,
    themeOptions,
    useUserPreferencesStore,
  } from '@/stores/userPreferences'
  import LayoutCustomizationMenu from './LayoutCustomizationMenu.vue'

  const userPreferencesStore = useUserPreferencesStore()

  const isKeyboardShortcutsDialogOpen = ref(false)
  const keyboardShortcuts = [
    { icon: 'mdi-dock-left', keys: ['Ctrl', 'B'], title: 'Toggle primary sidebar' },
    { icon: 'mdi-dock-right', keys: ['Ctrl', 'Alt', 'B'], title: 'Toggle secondary sidebar' },
    { icon: 'mdi-dock-bottom', keys: ['Ctrl', 'J'], title: 'Toggle panel' },
  ]
  const { theme: selectedThemeName } = storeToRefs(userPreferencesStore)

  const themeLabel = computed(() => {
    return themeOptions.find(option => option.value === selectedThemeName.value)?.title ?? 'Use device theme'
  })

  const themeIcon = computed(() => {
    return themeOptions.find(option => option.value === selectedThemeName.value)?.icon ?? 'mdi-theme-light-dark'
  })

  function setTheme (themeName: ThemeName) {
    userPreferencesStore.setTheme(themeName)
  }
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
