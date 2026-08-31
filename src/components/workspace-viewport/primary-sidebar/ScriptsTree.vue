<template>
  <v-card
    class="script-tree-card"
    elevation="0"
    :loading="isLoading ? 'primary' : false"
    rounded="lg"
  >
    <v-toolbar class="script-tree-toolbar">
      <v-toolbar-title text="Scripts" />

      <template #append>
        <v-btn
          aria-label="Refresh script repositories"
          :disabled="repositories.length === 0"
          icon="mdi-refresh"
          size="small"
          title="Refresh script repositories"
          variant="text"
          @click="refreshRepositories"
        />

        <v-btn
          aria-label="Create script"
          :disabled="repositories.length === 0"
          icon="mdi-file-plus-outline"
          size="small"
          title="Create script"
          variant="text"
          @click="isCreateScriptDialogOpen = true"
        />

        <v-btn
          aria-label="Add script repository"
          icon="mdi-source-repository"
          size="small"
          title="Add script repository"
          variant="text"
          @click="isAddRepositoryDialogOpen = true"
        />
      </template>
    </v-toolbar>

    <v-card-text
      v-if="repositories.length === 0"
      class="text-medium-emphasis"
    >
      Add a GitHub or GitLab repository to store and browse JavaScript scripts.
    </v-card-text>

    <template v-else>
      <v-alert
        v-for="repository in repositoriesWithLoadErrors"
        :key="repository.id"
        class="ma-2"
        density="compact"
        type="warning"
        variant="tonal"
      >
        {{ repository.name }}: {{ loadErrorsByRepository[repository.id] }}
      </v-alert>

      <v-card-text
        v-for="repository in repositoriesWithoutScripts"
        :key="`${repository.id}:empty`"
        class="py-1 text-medium-emphasis"
      >
        {{ repository.name }} has no JavaScript files.
      </v-card-text>

      <v-treeview
        v-model:opened="opened"
        aria-label="Repository JavaScript files"
        fluid
        hide-actions
        indent-lines
        item-children="children"
        item-title="title"
        item-value="value"
        :items="scriptTree"
        open-on-click
      >
        <template #prepend="{ item, isOpen }">
          <v-icon
            :icon="item.type === 'directory' && isOpen ? 'mdi-folder-open' : item.icon"
            size="small"
          />
        </template>

        <template #append="{ item }">
          <template v-if="item.repository">
            <v-btn
              :aria-label="`Open ${item.title} repository`"
              class="repository-action"
              :href="item.repository.webUrl"
              icon="mdi-open-in-new"
              rel="noopener noreferrer"
              size="x-small"
              target="_blank"
              :title="`Open ${item.title} repository`"
              variant="text"
              @click.stop
            />

            <v-btn
              :aria-label="`Refresh ${item.title} scripts`"
              class="repository-action"
              icon="mdi-refresh"
              :loading="isLoadingByRepository[item.repository.id]"
              size="x-small"
              :title="`Refresh ${item.title} scripts`"
              variant="text"
              @click.stop="gitRepositoriesStore.refreshRepository(item.repository.id)"
            />

            <v-btn
              :aria-label="`Disconnect ${item.title}`"
              class="repository-action"
              icon="mdi-close"
              size="x-small"
              :title="`Disconnect ${item.title}`"
              variant="text"
              @click.stop="gitRepositoriesStore.removeRepository(item.repository.id)"
            />
          </template>
        </template>
      </v-treeview>
    </template>

    <add-git-repository-dialog v-model="isAddRepositoryDialogOpen" />

    <create-script-dialog v-model="isCreateScriptDialogOpen" />
  </v-card>
</template>

<script lang="ts" setup>
  /** Displays JavaScript files from GitHub and GitLab repositories connected for the active browser session. */
  import type { GitRepository, GitRepositoryFile } from '@/services/gitRepositories'
  import { storeToRefs } from 'pinia'
  import { computed, ref } from 'vue'
  import { useGitRepositoriesStore } from '@/stores/gitRepositories'
  import AddGitRepositoryDialog from './scripts-tree/AddGitRepositoryDialog.vue'
  import CreateScriptDialog from './scripts-tree/CreateScriptDialog.vue'

  /** Represents a directory, JavaScript file, or connected repository in the scripts filesystem tree. */
  interface ScriptTreeItem {
    children?: ScriptTreeItem[]
    icon: string
    repository?: GitRepository
    title: string
    type: 'directory' | 'file' | 'repository'
    value: string
  }

  /** Shares authenticated repository state and remote-file operations with the scripts dialogs. */
  const gitRepositoriesStore = useGitRepositoriesStore()

  /** Exposes the current repositories, JavaScript file lists, and per-repository request state. */
  const {
    filesByRepository,
    isLoadingByRepository,
    loadErrorsByRepository,
    repositories,
  } = storeToRefs(gitRepositoriesStore)

  /** Tracks expanded repository and directory paths using stable tree values. */
  const opened = ref<string[]>([])

  /** Controls the connection dialog for adding a GitHub or GitLab repository. */
  const isAddRepositoryDialogOpen = ref(false)

  /** Controls the dialog that creates a JavaScript file in one connected repository. */
  const isCreateScriptDialogOpen = ref(false)

  /** Signals any in-flight repository tree request through the card loading indicator. */
  const isLoading = computed(() => Object.values(isLoadingByRepository.value).some(Boolean))

  /** Builds the visible repository filesystem, retaining directory paths only when they lead to a JavaScript file. */
  const scriptTree = computed(() => {
    return repositories.value.map(repository => buildRepositoryTree(repository, filesByRepository.value[repository.id] ?? []))
  })

  /** Identifies repositories whose latest file-tree request failed without hiding their configured connection. */
  const repositoriesWithLoadErrors = computed(() => {
    return repositories.value.filter(repository => Boolean(loadErrorsByRepository.value[repository.id]))
  })

  /** Identifies successfully loaded repositories whose visible filesystem contains no JavaScript files. */
  const repositoriesWithoutScripts = computed(() => {
    return repositories.value.filter(repository => {
      return !isLoadingByRepository.value[repository.id]
        && !loadErrorsByRepository.value[repository.id]
        && (filesByRepository.value[repository.id]?.length ?? 0) === 0
    })
  })

  /** Refreshes every connected repository concurrently so their remote JavaScript trees stay current. */
  async function refreshRepositories () {
    await Promise.all(repositories.value.map(repository => gitRepositoriesStore.refreshRepository(repository.id)))
  }

  /** Builds one repository tree with only the directories that contain a displayed JavaScript file. */
  function buildRepositoryTree (repository: GitRepository, files: GitRepositoryFile[]): ScriptTreeItem {
    const root: ScriptTreeItem = {
      children: [],
      icon: repository.provider === 'github' ? 'mdi-github' : 'mdi-gitlab',
      repository,
      title: repository.name,
      type: 'repository',
      value: repository.id,
    }

    for (const file of files) {
      const pathSegments = file.path.split('/')
      const fileName = pathSegments.pop()
      let currentDirectory = root
      let directoryPath = ''

      for (const directoryName of pathSegments) {
        directoryPath = directoryPath ? `${directoryPath}/${directoryName}` : directoryName
        const existingDirectory = currentDirectory.children?.find(child => {
          return child.type === 'directory' && child.title === directoryName
        })
        const directory = existingDirectory ?? {
          children: [],
          icon: 'mdi-folder',
          title: directoryName,
          type: 'directory' as const,
          value: `${repository.id}:${directoryPath}`,
        }

        if (!existingDirectory) {
          currentDirectory.children?.push(directory)
        }

        currentDirectory = directory
      }

      if (fileName) {
        currentDirectory.children?.push({
          icon: 'mdi-language-javascript',
          title: fileName,
          type: 'file',
          value: `${repository.id}:${file.path}`,
        })
      }
    }

    sortScriptTreeItems(root.children ?? [])

    return root
  }

  /** Sorts directories before JavaScript files and applies the same order to every nested branch. */
  function sortScriptTreeItems (items: ScriptTreeItem[]) {
    items.sort((first, second) => {
      if (first.type === 'directory' && second.type !== 'directory') {
        return -1
      }

      if (first.type !== 'directory' && second.type === 'directory') {
        return 1
      }

      return first.title.localeCompare(second.title)
    })

    for (const item of items) {
      if (item.children) {
        sortScriptTreeItems(item.children)
      }
    }
  }
</script>

<style scoped>
  .script-tree-card {
    border-start-end-radius: 0;
    border-start-start-radius: 0;
  }

  .script-tree-toolbar {
    border-block-end: 1px solid rgb(var(--v-theme-on-surface) / 12%);
  }

  .script-tree-card :deep(.v-treeview-indent-lines) {
    grid-template-columns: repeat(var(--v-indent-parts, 1), 28px);
  }

  .repository-action {
    opacity: 0;
  }

  .script-tree-card :deep(.v-treeview-item:hover .repository-action),
  .script-tree-card :deep(.v-treeview-item:focus-within .repository-action) {
    opacity: 1;
  }
</style>
