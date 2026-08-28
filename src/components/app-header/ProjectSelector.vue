<template>
  <v-dialog
    v-model="isOpen"
    location="top"
    location-strategy="connected"
    max-width="calc(100vw - 112px)"
    origin="overlap"
    scrollable
    target=".catalog-search-field .v-field"
    transition="dialog-scale-transition"
    viewport-margin="0"
    width="480"
  >
    <template #activator="{ props }">
      <v-text-field
        v-bind="props"
        :aria-label="projectSelectorLabel"
        class="project-selector my-1"
        :disabled="!profile"
        hide-details
        :loading="isLoading ? 'primary' : false"
        :model-value="selectedProject?.name ?? 'Select project'"
        prepend-inner-icon="mdi-google-cloud"
        readonly
        variant="outlined"
      />
    </template>

    <v-card
      aria-label="Google Cloud project selector"
      class="project-dialog-card"
      rounded="md"
    >
      <v-sheet
        class="d-flex align-center justify-center"
        color="primary"
        height="24"
      >
        <span style="color: rgb(var(--v-theme-on-primary))">Select Google Cloud project</span>
      </v-sheet>

      <v-card-text class="pa-2">
        <v-text-field
          v-model="projectFilter"
          aria-label="Filter Google Cloud projects"
          class="project-filter"
          clearable
          density="compact"
          hide-details
          placeholder="Filter projects"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
        />
      </v-card-text>

      <v-progress-linear
        v-if="isLoading"
        color="primary"
        indeterminate
      />

      <v-card-text
        v-else-if="error"
        class="text-error"
      >{{ error }}</v-card-text>

      <v-list
        v-else-if="filteredProjects.length > 0"
        aria-label="Available Google Cloud projects"
      >
        <v-list-item
          v-for="project in filteredProjects"
          :key="project.id"
          :title="project.name"
          @click="selectProject(project)"
        >
          <template #append>
            <span class="project-id">{{ project.id }}</span>
          </template>
        </v-list-item>
      </v-list>

      <v-card-text v-else>
        No Google Cloud projects are available for this account.
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
  /** Selects the Google Cloud project used by the connected account's workspace. */
  import type { GoogleCloudProject } from '@/services/googleProjects'
  import { storeToRefs } from 'pinia'
  import { computed, ref, watch } from 'vue'
  import { useGoogleAuthStore } from '@/stores/googleAuth'
  import { useGoogleProjectsStore } from '@/stores/googleProjects'

  /** Controls the project picker dialog opened from the application header. */
  const isOpen = ref(false)

  /** Holds the text that narrows the complete project list without changing the selected project. */
  const projectFilter = ref<string | null>(null)

  /** Exposes the in-memory account token needed to load its visible Cloud projects. */
  const { accessToken, profile } = storeToRefs(useGoogleAuthStore())

  /** Shares the selected project with future Google Cloud and Earth Engine features. */
  const googleProjectsStore = useGoogleProjectsStore()

  /** Exposes project loading, selection, and errors to the picker interface. */
  const { error, isLoading, projects, selectedProject } = storeToRefs(googleProjectsStore)

  /** Labels the project selector with the current choice for assistive technology. */
  const projectSelectorLabel = computed(() => {
    return selectedProject.value ? `Select Google Cloud project: ${selectedProject.value.name}` : 'Select Google Cloud project'
  })

  /** Keeps every loaded project visible by default and narrows the dialog by name or ID on demand. */
  const filteredProjects = computed(() => {
    const filter = projectFilter.value?.trim().toLocaleLowerCase()

    if (!filter) {
      return projects.value
    }

    return projects.value.filter(project => {
      return project.name.toLocaleLowerCase().includes(filter) || project.id.toLocaleLowerCase().includes(filter)
    })
  })

  /** Replaces the project list and its default selection whenever Google supplies a new account token. */
  watch(accessToken, token => {
    if (!token) {
      googleProjectsStore.clearProjects()
      return
    }

    void googleProjectsStore.loadProjects(token)
  }, { immediate: true })

  /** Applies a project selection and returns the user to the workspace. */
  function selectProject (project: GoogleCloudProject) {
    googleProjectsStore.selectProject(project)
    isOpen.value = false
  }
</script>

<style scoped>
  .project-selector {
    flex: 0 1 192px;
    inline-size: 192px;
    max-inline-size: 28vw;
  }

  .project-selector :deep(.v-field),
  .project-filter :deep(.v-field) {
    --v-field-input-padding-bottom: 0px;
    --v-field-input-padding-top: 0px;
    --v-input-control-height: 24px;
    font-size: 11px;
  }

  .project-dialog-card {
    margin-block-start: 1px;
  }

  .project-id {
    color: rgb(var(--v-theme-on-surface) / var(--v-medium-emphasis-opacity));
    font-family: 'Roboto Mono', monospace;
    font-size: 9px;
  }
</style>
