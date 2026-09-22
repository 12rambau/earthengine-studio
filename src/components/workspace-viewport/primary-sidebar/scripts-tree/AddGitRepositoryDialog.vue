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
        <v-text-field
          v-model="repositoryUrl"
          autocomplete="url"
          label="Repository URL"
          placeholder="https://github.com/owner/repository"
          variant="outlined"
        />

        <v-btn
          v-if="!githubUsername"
          block
          class="mb-4"
          :loading="isConnectingGitHub"
          prepend-icon="mdi-github"
          text="Connect with GitHub"
          variant="tonal"
          @click="gitRepositoriesStore.connectGitHubAccount"
        />

        <v-alert
          v-else
          class="mb-4"
          density="compact"
          type="success"
          variant="tonal"
        >
          Connected to GitHub as {{ githubUsername }}
        </v-alert>

        <v-alert
          v-if="githubConnectionError"
          class="mb-4"
          density="compact"
          type="error"
          variant="tonal"
        >
          {{ githubConnectionError }}
        </v-alert>

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
          :disabled="!repositoryUrl.trim() || !githubAccessToken"
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
  /** Connects a GitHub repository authorized through Firebase's GitHub OAuth provider. */
  import { storeToRefs } from 'pinia'
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

  /** Holds the GitHub clone or web URL supplied for the remote script repository. */
  const repositoryUrl = ref('')

  /** Indicates that the repository metadata and file tree are being verified. */
  const isSubmitting = ref(false)

  /** Displays repository validation or authorization failures without closing the dialog. */
  const error = ref<string | null>(null)

  /** Connects the remote repository, then closes only when its JavaScript filesystem is ready to display. */
  const gitRepositoriesStore = useGitRepositoriesStore()

  /** Exposes the GitHub OAuth connection shared across every repository added during this browser session. */
  const { githubAccessToken, githubConnectionError, githubUsername, isConnectingGitHub } = storeToRefs(gitRepositoriesStore)

  /** Restores the repository form each time the dialog reopens, while keeping the GitHub connection for reuse. */
  watch(isOpen, dialogIsOpen => {
    if (!dialogIsOpen) {
      return
    }

    repositoryUrl.value = ''
    error.value = null
  })

  /** Verifies repository access and inserts the connected repository into the shared scripts filesystem. */
  async function addRepository () {
    if (!githubAccessToken.value) {
      return
    }

    error.value = null
    isSubmitting.value = true

    try {
      await gitRepositoriesStore.addRepository({
        repositoryUrl: repositoryUrl.value,
      }, githubAccessToken.value)
      isOpen.value = false
    } catch (connectionError) {
      error.value = connectionError instanceof Error ? connectionError.message : 'Unable to connect this repository.'
    } finally {
      isSubmitting.value = false
    }
  }
</script>
