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
    </v-list>
  </v-menu>
</template>

<script lang="ts" setup>
  import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
  import { useTheme } from 'vuetify'

  type ThemeName = 'system' | 'light' | 'dark'

  const theme = useTheme()
  const themePreferenceKey = 'earthengine-studio.theme'

  const themeOptions: Array<{ icon: string, title: string, value: ThemeName }> = [
    { icon: 'mdi-theme-light-dark', title: 'Use device theme', value: 'system' },
    { icon: 'mdi-weather-sunny', title: 'Light theme', value: 'light' },
    { icon: 'mdi-weather-night', title: 'Dark theme', value: 'dark' },
  ]

  const selectedThemeName = ref<ThemeName>('system')
  const deviceTheme = window.matchMedia('(prefers-color-scheme: dark)')

  const themeLabel = computed(() => {
    return themeOptions.find(option => option.value === selectedThemeName.value)?.title ?? 'Use device theme'
  })

  const themeIcon = computed(() => {
    return themeOptions.find(option => option.value === selectedThemeName.value)?.icon ?? 'mdi-theme-light-dark'
  })

  function setTheme (themeName: ThemeName) {
    selectedThemeName.value = themeName
    localStorage.setItem(themePreferenceKey, themeName)
    applyTheme()
  }

  function applyTheme () {
    const themeName = selectedThemeName.value === 'system'
      ? (deviceTheme.matches ? 'dark' : 'light')
      : selectedThemeName.value

    theme.change(themeName)
  }

  function handleDeviceThemeChange () {
    if (selectedThemeName.value === 'system') {
      applyTheme()
    }
  }

  function isThemeName (themeName: string | null): themeName is ThemeName {
    return themeOptions.some(option => option.value === themeName)
  }

  onMounted(() => {
    const storedThemeName = localStorage.getItem(themePreferenceKey)

    if (isThemeName(storedThemeName)) {
      selectedThemeName.value = storedThemeName
    }

    deviceTheme.addEventListener('change', handleDeviceThemeChange)
    applyTheme()
  })

  onBeforeUnmount(() => {
    deviceTheme.removeEventListener('change', handleDeviceThemeChange)
  })
</script>
