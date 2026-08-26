<template>
  <v-menu
    :close-on-content-click="false"
    location="start"
    offset="8"
  >
    <template #activator="{ props }">
      <v-list-item
        v-bind="props"
        aria-label="Customize layout"
        prepend-icon="mdi-view-dashboard-outline"
        title="Layout"
      >
        <template #append>
          <v-icon icon="mdi-chevron-right" />
        </template>
      </v-list-item>
    </template>

    <v-list
      aria-label="Layout customization"
      density="comfortable"
      min-width="264"
    >
      <v-list-subheader>Visibility</v-list-subheader>

      <v-list-item
        :aria-checked="layout.primarySidebarVisible"
        aria-label="Toggle primary sidebar"
        prepend-icon="mdi-dock-left"
        role="menuitemcheckbox"
        title="Primary sidebar"
        @click="userPreferencesStore.togglePrimarySidebarVisibility"
      >
        <template #append>
          <v-icon :icon="checkboxIcon(layout.primarySidebarVisible)" />
        </template>
      </v-list-item>

      <v-list-item
        :aria-checked="layout.secondarySidebarVisible"
        aria-label="Toggle secondary sidebar"
        prepend-icon="mdi-dock-right"
        role="menuitemcheckbox"
        title="Secondary sidebar"
        @click="userPreferencesStore.toggleSecondarySidebarVisibility"
      >
        <template #append>
          <v-icon :icon="checkboxIcon(layout.secondarySidebarVisible)" />
        </template>
      </v-list-item>

      <v-list-item
        :aria-checked="layout.panelVisible"
        aria-label="Toggle bottom panel"
        prepend-icon="mdi-dock-bottom"
        role="menuitemcheckbox"
        title="Panel"
        @click="userPreferencesStore.togglePanelVisibility"
      >
        <template #append>
          <v-icon :icon="checkboxIcon(layout.panelVisible)" />
        </template>
      </v-list-item>

      <v-divider />

      <v-list-subheader>Primary sidebar position</v-list-subheader>

      <v-list-item
        :active="layout.primarySidebarPosition === 'left'"
        aria-label="Set primary sidebar position to left"
        prepend-icon="mdi-dock-left"
        title="Left"
        @click="userPreferencesStore.setPrimarySidebarPosition('left')"
      >
        <template
          v-if="layout.primarySidebarPosition === 'left'"
          #append
        >
          <v-icon icon="mdi-check" />
        </template>
      </v-list-item>

      <v-list-item
        :active="layout.primarySidebarPosition === 'right'"
        aria-label="Set primary sidebar position to right"
        prepend-icon="mdi-dock-right"
        title="Right"
        @click="userPreferencesStore.setPrimarySidebarPosition('right')"
      >
        <template
          v-if="layout.primarySidebarPosition === 'right'"
          #append
        >
          <v-icon icon="mdi-check" />
        </template>
      </v-list-item>

      <v-divider />

      <v-list-subheader>Panel alignment</v-list-subheader>

      <v-list-item
        v-for="option in panelAlignmentOptions"
        :key="option.value"
        :active="layout.panelAlignment === option.value"
        :aria-label="`Set panel alignment to ${option.value}`"
        :prepend-icon="option.icon"
        :title="option.title"
        @click="userPreferencesStore.setPanelAlignment(option.value)"
      >
        <template
          v-if="layout.panelAlignment === option.value"
          #append
        >
          <v-icon icon="mdi-check" />
        </template>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script lang="ts" setup>
  import { storeToRefs } from 'pinia'
  import {
    type PanelAlignment,
    useUserPreferencesStore,
  } from '@/stores/userPreferences'

  const panelAlignmentOptions: Array<{ icon: string, title: string, value: PanelAlignment }> = [
    { icon: 'mdi-format-align-left', title: 'Left', value: 'left' },
    { icon: 'mdi-format-align-right', title: 'Right', value: 'right' },
    { icon: 'mdi-format-align-center', title: 'Center', value: 'center' },
    { icon: 'mdi-format-align-justify', title: 'Justify', value: 'justify' },
  ]

  const userPreferencesStore = useUserPreferencesStore()
  const { layout } = storeToRefs(userPreferencesStore)

  function checkboxIcon (isVisible: boolean) {
    return isVisible ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline'
  }
</script>
