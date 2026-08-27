<template>
  <v-app>
    <transition name="startup-screen">
      <startup-screen
        v-if="isStarting"
        :is-dark="isDark"
      />
    </transition>

    <app-header />

    <v-main
      aria-label="Workspace canvas"
      class="workspace-main"
    >
      <workspace-viewport />
    </v-main>
  </v-app>
</template>

<script lang="ts" setup>
  import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import { useTheme } from 'vuetify'
  import StartupScreen from '@/components/app/StartupScreen.vue'
  import AppHeader from '@/components/AppHeader.vue'
  import { preloadCatalog } from '@/components/workspace-viewport/primary-sidebar/catalog'
  import WorkspaceViewport from '@/components/WorkspaceViewport.vue'
  import { resolveThemeName, useUserPreferencesStore } from '@/stores/userPreferences'

  const theme = useTheme()
  const userPreferencesStore = useUserPreferencesStore()
  const deviceTheme = window.matchMedia('(prefers-color-scheme: dark)')

  /** Keeps the launch screen visible while essential public workspace data is fetched. */
  const isStarting = ref(true)

  /** Reflects the resolved Vuetify theme so the launch scene matches the application. */
  const isDark = computed(() => theme.global.name.value === 'dark')

  function handleLayoutShortcut (event: KeyboardEvent) {
    if (event.defaultPrevented || event.metaKey || event.repeat || !event.ctrlKey || event.shiftKey) {
      return
    }

    const key = event.key.toLowerCase()

    if (event.altKey && key === 'b') {
      event.preventDefault()
      userPreferencesStore.toggleSecondarySidebarVisibility()
      return
    }

    if (event.altKey) {
      return
    }

    if (key === 'b') {
      event.preventDefault()
      userPreferencesStore.togglePrimarySidebarVisibility()
    } else if (key === 'j') {
      event.preventDefault()
      userPreferencesStore.togglePanelVisibility()
    }
  }

  function applyTheme () {
    theme.change(resolveThemeName(userPreferencesStore.theme, deviceTheme.matches))
  }

  function handleDeviceThemeChange () {
    if (userPreferencesStore.theme === 'system') {
      applyTheme()
    }
  }

  userPreferencesStore.initialize()
  watch(() => userPreferencesStore.theme, applyTheme, { immediate: true })

  onMounted(async () => {
    deviceTheme.addEventListener('change', handleDeviceThemeChange)
    window.addEventListener('keydown', handleLayoutShortcut, true)

    await Promise.allSettled([
      preloadCatalog(),
      new Promise<void>(resolve => window.setTimeout(resolve, 700)),
    ])
    isStarting.value = false
  })

  onBeforeUnmount(() => {
    deviceTheme.removeEventListener('change', handleDeviceThemeChange)
    window.removeEventListener('keydown', handleLayoutShortcut, true)
  })
</script>

<style scoped>
  .workspace-main {
    block-size: 100dvh;
    overflow: hidden;
  }

  .startup-screen-leave-active {
    transition: opacity 280ms ease-in;
  }

  .startup-screen-leave-to {
    opacity: 0;
  }
</style>
