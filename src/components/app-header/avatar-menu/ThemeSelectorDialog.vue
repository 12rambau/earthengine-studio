<template>
  <v-dialog
    v-model="isOpen"
    max-width="256"
    transition="dialog-scale-transition"
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

    <v-card
      aria-label="Theme selector dialog"
      density="compact"
      rounded="lg"
    >
      <v-sheet
        class="d-flex align-center justify-center"
        color="primary"
        height="32"
      >
        <span style="color: rgb(var(--v-theme-on-primary))">Appearance</span>
      </v-sheet>

      <v-list
        aria-label="Appearance settings"
        density="compact"
        nav
      >
        <v-list-item
          v-for="option in themeOptions"
          :key="option.value"
          :aria-label="option.title"
          density="compact"
          nav
          slim
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
  import { storeToRefs } from 'pinia'
  import { computed, ref } from 'vue'
  import {
    type ThemeName,
    themeOptions,
    useUserPreferencesStore,
  } from '@/stores/userPreferences'

  const isOpen = ref(false)
  const userPreferencesStore = useUserPreferencesStore()
  const { theme: selectedThemeName } = storeToRefs(userPreferencesStore)

  const themeLabel = computed(() => {
    return themeOptions.find(option => option.value === selectedThemeName.value)?.title ?? 'Use device theme'
  })

  const themeIcon = computed(() => {
    return themeOptions.find(option => option.value === selectedThemeName.value)?.icon ?? 'mdi-theme-light-dark'
  })

  function selectTheme (themeName: ThemeName) {
    userPreferencesStore.setTheme(themeName)
    isOpen.value = false
  }
</script>
