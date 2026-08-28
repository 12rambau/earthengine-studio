<template>
  <v-dialog
    v-model="isOpen"
    max-width="640"
    scrollable
  >
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        :aria-label="projectSelectorLabel"
        class="project-selector"
        :disabled="!profile"
        :loading="isLoading"
        prepend-icon="mdi-google-cloud"
        size="small"
        variant="text"
      >
        <span class="project-selector-label">{{ selectedProject?.name ?? 'Select project' }}</span>

        <v-icon
          icon="mdi-menu-down"
          size="small"
        />
      </v-btn>
    </template>

    <v-card aria-label="Google Cloud project selector">
      <v-toolbar
        density="compact"
        title="Select a Google Cloud project"
      >
        <template #append>
          <v-btn
            aria-label="Close project selector"
            icon="mdi-close"
            size="small"
            title="Close project selector"
            variant="text"
            @click="isOpen = false"
          />
        </template>
      </v-toolbar>

      <v-divider />

      <v-card-text class="pa-2">
        <v-text-field
          v-model="projectFilter"
          aria-label="Filter Google Cloud projects"
          clearable
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
          :active="selectedProject?.id === project.id"
          :subtitle="project.id"
          :title="project.name"
          @click="selectProject(project)"
        >
          <template #prepend>
            <v-icon
              icon="mdi-google-cloud"
              size="small"
            />
          </template>

          <template
            v-if="selectedProject?.id === project.id"
            #append
          >
            <v-icon
              icon="mdi-check"
              size="small"
            />
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
    max-inline-size: 240px;
  }

  .project-selector-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
