<template>
  <v-app>
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
  import { onBeforeUnmount, onMounted } from 'vue'
  import AppHeader from '@/components/header/AppHeader.vue'
  import WorkspaceViewport from '@/components/workspace/WorkspaceViewport.vue'
  import { useUserPreferencesStore } from '@/stores/userPreferences'

  const userPreferencesStore = useUserPreferencesStore()

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

  userPreferencesStore.initialize()

  onMounted(() => {
    window.addEventListener('keydown', handleLayoutShortcut, true)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleLayoutShortcut, true)
  })
</script>

<style scoped>
  .workspace-main {
    block-size: 100dvh;
    overflow: hidden;
  }
</style>
