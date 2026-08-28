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
        aria-label="Change appearance"
        :subtitle="themeLabel"
        title="Appearance"
      >
        <template #prepend>
          <v-icon
            :icon="themeIcon"
            size="small"
          />
        </template>
      </v-list-item>
    </template>

    <v-card
      aria-label="Theme selector dialog"
      rounded="md"
    >
      <v-sheet
        class="d-flex align-center justify-center"
        color="primary"
        height="24"
      >
        <span style="color: rgb(var(--v-theme-on-primary))">Appearance</span>
      </v-sheet>

      <v-list aria-label="Appearance settings">
        <v-list-item
          v-for="option in themeOptions"
          :key="option.value"
          :aria-label="option.title"
          :title="option.title"
          @click="selectTheme(option.value)"
        >
          <template #prepend>
            <v-icon
              :icon="option.icon"
              size="small"
            />
          </template>

          <template
            v-if="selectedThemeName === option.value"
            #append
          >
            <v-icon
              icon="mdi-check"
              size="small"
            />
          </template>
        </v-list-item>
      </v-list>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
  /** Lets the user choose the color theme persisted for the application. */
  import { storeToRefs } from 'pinia'
  import { computed, ref } from 'vue'
  import {
    type ThemeName,
    themeOptions,
    useUserPreferencesStore,
  } from '@/stores/userPreferences'

  /** Controls whether the appearance menu is displayed as a dialog. */
  const isOpen = ref(false)

  /** Persists the selected application color theme. */
  const userPreferencesStore = useUserPreferencesStore()

  /** Exposes the currently selected theme to the dialog template. */
  const { theme: selectedThemeName } = storeToRefs(userPreferencesStore)

  /** Provides the label of the selected theme or the device-preference fallback. */
  const themeLabel = computed(() => {
    return themeOptions.find(option => option.value === selectedThemeName.value)?.title ?? 'Use device theme'
  })

  /** Provides the icon associated with the selected theme or its fallback. */
  const themeIcon = computed(() => {
    return themeOptions.find(option => option.value === selectedThemeName.value)?.icon ?? 'mdi-theme-light-dark'
  })

  /** Persists a chosen theme and closes the appearance dialog. */
  function selectTheme (themeName: ThemeName) {
    userPreferencesStore.setTheme(themeName)
    isOpen.value = false
  }
</script>
