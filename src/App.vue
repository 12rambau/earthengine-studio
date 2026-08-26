<template>
  <v-app>
    <app-header v-if="!popoutPanel" />

    <v-main
      aria-label="Workspace canvas"
      class="workspace-main"
    >
      <workspace-viewport :popout-panel="popoutPanel" />
    </v-main>
  </v-app>
</template>

<script lang="ts" setup>
  import { onBeforeUnmount, onMounted, watch } from 'vue'
  import { useTheme } from 'vuetify'
  import AppHeader from '@/components/AppHeader.vue'
  import { getWorkspacePanelId } from '@/components/workspace/workspacePanel'
  import WorkspaceViewport from '@/components/WorkspaceViewport.vue'
  import { resolveThemeName, useUserPreferencesStore } from '@/stores/userPreferences'

  const theme = useTheme()
  const userPreferencesStore = useUserPreferencesStore()
  const popoutPanel = getWorkspacePanelId(new URLSearchParams(window.location.search).get('panel'))
  const deviceTheme = window.matchMedia('(prefers-color-scheme: dark)')

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

  onMounted(() => {
    deviceTheme.addEventListener('change', handleDeviceThemeChange)
    window.addEventListener('keydown', handleLayoutShortcut, true)
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
</style>
