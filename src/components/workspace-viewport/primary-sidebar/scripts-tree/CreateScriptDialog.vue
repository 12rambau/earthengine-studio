<template>
  <v-dialog
    v-model="isOpen"
    max-width="720"
  >
    <v-card aria-label="Create script">
      <v-toolbar title="Create script">
        <template #append>
          <v-btn
            aria-label="Close create script dialog"
            icon="mdi-close"
            size="small"
            title="Close create script dialog"
            variant="text"
            @click="isOpen = false"
          />
        </template>
      </v-toolbar>

      <v-card-text>
        <v-select
          v-model="repositoryId"
          :items="repositoryOptions"
          label="Repository"
          variant="outlined"
        />

        <v-text-field
          v-model="path"
          label="Script path"
          placeholder="analysis/example.js"
          variant="outlined"
        />

        <v-textarea
          v-model="content"
          auto-grow
          label="Script contents"
          rows="8"
          variant="outlined"
        />

        <v-alert
          v-if="error"
          density="compact"
          type="error"
          variant="tonal"
        >
          {{ error }}
        </v-alert>
      </v-card-text>

      <v-card-actions>
        <v-spacer />

        <v-btn
          text="Cancel"
          variant="text"
          @click="isOpen = false"
        />

        <v-btn
          color="primary"
          :disabled="!repositoryId || !path.trim()"
          :loading="isSubmitting"
          text="Create script"
          variant="flat"
          @click="createScript"
        />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
  /** Creates a JavaScript source file through the selected connected Git repository. */
  import { storeToRefs } from 'pinia'
  import { computed, ref, watch } from 'vue'
  import { useGitRepositoriesStore } from '@/stores/gitRepositories'

  /** Receives and updates visibility controlled by the Scripts tree. */
  const props = defineProps<{
    /** Determines whether the script creation dialog is visible. */
    modelValue: boolean
  }>()

  /** Synchronizes controlled dialog visibility with the Scripts tree. */
  const emit = defineEmits<{
    /** Updates the dialog visibility after cancellation or successful file creation. */
    'update:modelValue': [value: boolean]
  }>()

  /** Relays dialog visibility without taking ownership away from the Scripts tree. */
  const isOpen = computed({
    get: () => props.modelValue,
    set: value => {
      // eslint-disable-next-line vue/custom-event-name-casing -- Vue reserves this camel-case event for v-model.
      emit('update:modelValue', value)
    },
  })

  /** Provides the connected repositories available as remote destinations for the new script. */
  const { repositories } = storeToRefs(useGitRepositoriesStore())

  /** Shares the provider create-file operation with the visible scripts filesystem. */
  const gitRepositoriesStore = useGitRepositoriesStore()

  /** Holds the selected remote repository's stable provider-qualified ID. */
  const repositoryId = ref<string | null>(null)

  /** Holds the repository-relative JavaScript filename, including optional directory segments. */
  const path = ref('')

  /** Starts each new Earth Engine script with a minimal editable JavaScript source template. */
  const content = ref('// Earth Engine script\n')

  /** Indicates that the selected Git provider is committing the new file. */
  const isSubmitting = ref(false)

  /** Keeps create-file validation and provider failures visible without discarding entered source. */
  const error = ref<string | null>(null)

  /** Exposes repository titles and branches in the compact destination selector. */
  const repositoryOptions = computed(() => {
    return repositories.value.map(repository => ({
      title: `${repository.name} (${repository.defaultBranch})`,
      value: repository.id,
    }))
  })

  /** Initializes a fresh script form against the first connected repository when the dialog opens. */
  watch(isOpen, dialogIsOpen => {
    if (!dialogIsOpen) {
      return
    }

    repositoryId.value = repositories.value[0]?.id ?? null
    path.value = ''
    content.value = '// Earth Engine script\n'
    error.value = null
  })

  /** Commits the supplied JavaScript source and returns to the updated repository filesystem on success. */
  async function createScript () {
    if (!repositoryId.value) {
      return
    }

    error.value = null
    isSubmitting.value = true

    try {
      await gitRepositoriesStore.createScript(repositoryId.value, path.value, content.value)
      isOpen.value = false
    } catch (creationError) {
      error.value = creationError instanceof Error ? creationError.message : 'Unable to create this script.'
    } finally {
      isSubmitting.value = false
    }
  }
</script>
