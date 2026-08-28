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
        aria-label="Customize layout"
        prepend-icon="mdi-view-dashboard-outline"
        title="Layout"
      >
        <template #append>
          <v-icon icon="mdi-chevron-right" />
        </template>
      </v-list-item>
    </template>

    <v-card
      aria-label="Layout preferences dialog"
      density="compact"
      rounded="md"
    >
      <v-sheet
        class="d-flex align-center justify-center"
        color="primary"
        height="24"
      >
        <span style="color: rgb(var(--v-theme-on-primary))">Layout</span>
      </v-sheet>

      <v-list
        aria-label="Layout preferences"
        density="compact"
        nav
      >
        <v-list-subheader>Visibility</v-list-subheader>

        <v-list-item
          :aria-checked="layout.primarySidebarVisible"
          aria-label="Toggle primary sidebar"
          density="compact"
          nav
          role="menuitemcheckbox"
          slim
          title="Primary sidebar"
          @click="userPreferencesStore.togglePrimarySidebarVisibility"
        >
          <template #prepend>
            <v-icon
              icon="mdi-dock-left"
              size="small"
            />
          </template>

          <template
            v-if="layout.primarySidebarVisible"
            #append
          >
            <v-icon
              icon="mdi-check"
              size="small"
            />
          </template>
        </v-list-item>

        <v-list-item
          :aria-checked="layout.secondarySidebarVisible"
          aria-label="Toggle secondary sidebar"
          density="compact"
          nav
          role="menuitemcheckbox"
          slim
          title="Secondary sidebar"
          @click="userPreferencesStore.toggleSecondarySidebarVisibility"
        >
          <template #prepend>
            <v-icon
              icon="mdi-dock-right"
              size="small"
            />
          </template>

          <template
            v-if="layout.secondarySidebarVisible"
            #append
          >
            <v-icon
              icon="mdi-check"
              size="small"
            />
          </template>
        </v-list-item>

        <v-list-item
          :aria-checked="layout.panelVisible"
          aria-label="Toggle bottom panel"
          density="compact"
          nav
          role="menuitemcheckbox"
          slim
          title="Panel"
          @click="userPreferencesStore.togglePanelVisibility"
        >
          <template #prepend>
            <v-icon
              icon="mdi-dock-bottom"
              size="small"
            />
          </template>

          <template
            v-if="layout.panelVisible"
            #append
          >
            <v-icon
              icon="mdi-check"
              size="small"
            />
          </template>
        </v-list-item>

        <v-divider />

        <v-list-subheader>Primary sidebar position</v-list-subheader>

        <v-list-item
          aria-label="Set primary sidebar position to left"
          density="compact"
          nav
          slim
          title="Left"
          @click="userPreferencesStore.setPrimarySidebarPosition('left')"
        >
          <template #prepend>
            <v-icon
              icon="mdi-dock-left"
              size="small"
            />
          </template>

          <template
            v-if="layout.primarySidebarPosition === 'left'"
            #append
          >
            <v-icon
              icon="mdi-check"
              size="small"
            />
          </template>
        </v-list-item>

        <v-list-item
          aria-label="Set primary sidebar position to right"
          density="compact"
          nav
          slim
          title="Right"
          @click="userPreferencesStore.setPrimarySidebarPosition('right')"
        >
          <template #prepend>
            <v-icon
              icon="mdi-dock-right"
              size="small"
            />
          </template>

          <template
            v-if="layout.primarySidebarPosition === 'right'"
            #append
          >
            <v-icon
              icon="mdi-check"
              size="small"
            />
          </template>
        </v-list-item>

        <v-divider />

        <v-list-subheader>Panel alignment</v-list-subheader>

        <v-list-item
          v-for="option in panelAlignmentOptions"
          :key="option.value"
          :aria-label="`Set panel alignment to ${option.value}`"
          density="compact"
          nav
          slim
          :title="option.title"
          @click="userPreferencesStore.setPanelAlignment(option.value)"
        >
          <template #prepend>
            <v-icon
              :icon="option.icon"
              size="small"
            />
          </template>

          <template
            v-if="layout.panelAlignment === option.value"
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
  /** Lets the user configure workspace visibility, sidebar position, and panel alignment. */
  import { storeToRefs } from 'pinia'
  import { ref } from 'vue'
  import {
    type PanelAlignment,
    useUserPreferencesStore,
  } from '@/stores/userPreferences'

  /** Defines the selectable alignment options for the workspace bottom panel. */
  const panelAlignmentOptions: Array<{ icon: string, title: string, value: PanelAlignment }> = [
    { icon: 'mdi-format-align-left', title: 'Left', value: 'left' },
    { icon: 'mdi-format-align-right', title: 'Right', value: 'right' },
    { icon: 'mdi-format-align-center', title: 'Center', value: 'center' },
    { icon: 'mdi-format-align-justify', title: 'Justify', value: 'justify' },
  ]

  /** Controls whether the layout preferences menu is displayed as a dialog. */
  const isOpen = ref(false)

  /** Persists workspace layout preferences selected in this dialog. */
  const userPreferencesStore = useUserPreferencesStore()

  /** Exposes current layout preferences to the dialog controls. */
  const { layout } = storeToRefs(userPreferencesStore)
</script>
