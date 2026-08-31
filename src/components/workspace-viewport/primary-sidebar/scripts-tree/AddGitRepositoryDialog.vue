<template>
  <v-dialog
    v-model="isOpen"
    max-width="560"
  >
    <v-card aria-label="Add script repository">
      <v-toolbar title="Add script repository">
        <template #append>
          <v-btn
            aria-label="Close add repository dialog"
            icon="mdi-close"
            size="small"
            title="Close add repository dialog"
            variant="text"
            @click="isOpen = false"
          />
        </template>
      </v-toolbar>

      <v-card-text>
        <v-btn-toggle
          v-model="provider"
          aria-label="Git provider"
          class="mb-4"
          color="primary"
          mandatory
        >
          <v-btn
            prepend-icon="mdi-github"
            text="GitHub"
            value="github"
          />

          <v-btn
            prepend-icon="mdi-gitlab"
            text="GitLab"
            value="gitlab"
          />
        </v-btn-toggle>

        <v-text-field
          v-model="repositoryUrl"
          autocomplete="url"
          label="Repository URL"
          placeholder="https://github.com/owner/repository"
          variant="outlined"
        />

        <v-text-field
          v-model="accessToken"
          :append-inner-icon="isTokenVisible ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
          autocomplete="off"
          label="Personal access token"
          :type="isTokenVisible ? 'text' : 'password'"
          variant="outlined"
          @click:append-inner="isTokenVisible = !isTokenVisible"
        />

        <v-text-field
          v-model="branch"
          label="Branch"
          placeholder="Default branch"
          variant="outlined"
        />

        <v-alert
          density="compact"
          type="info"
          variant="tonal"
        >
          The token is used only for this browser session and is not saved in preferences.
        </v-alert>

        <v-alert
          v-if="error"
          class="mt-4"
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
          :disabled="!repositoryUrl.trim()"
          :loading="isSubmitting"
          text="Connect repository"
          variant="flat"
          @click="addRepository"
        />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
  /** Connects a GitHub or GitLab repository and retains its credential only for the active browser session. */
  import type { GitProvider } from '@/services/gitRepositories'
  import { computed, ref, watch } from 'vue'
  import { useGitRepositoriesStore } from '@/stores/gitRepositories'

  /** Receives and updates visibility controlled by the Scripts tree. */
  const props = defineProps<{
    /** Determines whether the repository connection dialog is visible. */
    modelValue: boolean
  }>()

  /** Synchronizes controlled dialog visibility with the Scripts tree. */
  const emit = defineEmits<{
    /** Updates the dialog visibility after cancellation or a successful connection. */
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

  /** Selects the provider-specific authentication and repository API contract. */
  const provider = ref<GitProvider>('github')

  /** Holds the GitHub or GitLab clone or web URL supplied for the remote script repository. */
  const repositoryUrl = ref('')

  /** Holds the optional personal access token without placing it in persistent browser storage. */
  const accessToken = ref('')

  /** Allows an existing non-default branch to be used as the script workspace root. */
  const branch = ref('')

  /** Controls whether the repository credential can be inspected while entering it. */
  const isTokenVisible = ref(false)

  /** Indicates that the provider repository metadata and file tree are being verified. */
  const isSubmitting = ref(false)

  /** Displays provider validation or authorization failures without closing the dialog. */
  const error = ref<string | null>(null)

  /** Connects the remote repository, then closes only when its JavaScript filesystem is ready to display. */
  const gitRepositoriesStore = useGitRepositoriesStore()

  /** Restores neutral form state each time a new repository connection begins. */
  watch(isOpen, dialogIsOpen => {
    if (!dialogIsOpen) {
      return
    }

    provider.value = 'github'
    repositoryUrl.value = ''
    accessToken.value = ''
    branch.value = ''
    isTokenVisible.value = false
    error.value = null
  })

  /** Verifies repository access and inserts the connected repository into the shared scripts filesystem. */
  async function addRepository () {
    error.value = null
    isSubmitting.value = true

    try {
      await gitRepositoriesStore.addRepository({
        branch: branch.value || undefined,
        provider: provider.value,
        repositoryUrl: repositoryUrl.value,
      }, accessToken.value)
      isOpen.value = false
    } catch (connectionError) {
      error.value = connectionError instanceof Error ? connectionError.message : 'Unable to connect this repository.'
    } finally {
      isSubmitting.value = false
    }
  }
</script>
