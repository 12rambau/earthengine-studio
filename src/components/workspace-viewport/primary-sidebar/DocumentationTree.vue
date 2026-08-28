<template>
  <v-card
    class="ma-1"
    elevation="0"
    :loading="isLoading ? 'primary' : false"
    rounded="lg"
  >
    <v-card-text
      v-if="!accessToken"
      class="text-medium-emphasis"
    >
      Connect a Google account to load Earth Engine API docs.
    </v-card-text>

    <v-card-text
      v-else-if="!selectedProject"
      class="text-medium-emphasis"
    >
      Select a Google Cloud project to load Earth Engine API docs.
    </v-card-text>

    <v-card-text
      v-else-if="loadError"
      class="text-error"
    >
      {{ loadError }}
    </v-card-text>

    <v-card-text
      v-else-if="isLoading"
      class="text-medium-emphasis"
    >
      Loading Earth Engine API docs.
    </v-card-text>

    <v-treeview
      v-else
      aria-label="Earth Engine API documentation"
      fluid
      hide-actions
      indent-lines
      item-children="children"
      item-props="props"
      item-title="title"
      item-value="value"
      :items="documentationTree"
      no-data-text="No API docs available"
      open-on-click
    >
      <template #prepend="{ item }">
        <v-icon
          :color="item.iconColor"
          :icon="item.icon"
          size="small"
        />
      </template>

      <template #title="{ item }">
        <v-menu
          v-if="item.documentation"
          :close-delay="0"
          location="end"
          max-width="420"
          :offset="8"
          :open-delay="200"
          :open-on-click="false"
          :open-on-focus="false"
          open-on-hover
          target="cursor"
          :transition="false"
        >
          <template #activator="{ props: tooltipProps }">
            <span
              v-bind="tooltipProps"
              class="documentation-leaf"
            >
              {{ item.title }}
            </span>
          </template>

          <v-sheet class="api-tooltip">
            <div class="api-tooltip-signature">
              <code>{{ item.documentation.usage }}</code>

              <span v-if="item.documentation.returns">
                Returns {{ item.documentation.returns }}
              </span>
            </div>

            <p
              v-if="item.documentation.description"
              class="api-tooltip-description"
            >
              {{ item.documentation.description }}
            </p>

            <table
              v-if="item.documentation.args.length > 0"
              class="api-tooltip-arguments"
            >
              <thead>
                <tr>
                  <th>Argument</th>
                  <th>Type</th>
                  <th>Details</th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="argument in item.documentation.args"
                  :key="argument.name"
                >
                  <td><code>{{ argument.name }}</code></td>
                  <td><code>{{ argument.type }}</code></td>
                  <td>{{ argument.details }}</td>
                </tr>
              </tbody>
            </table>

            <a
              class="api-tooltip-link"
              :href="item.props?.href"
              rel="noopener noreferrer"
              target="_blank"
              @click.stop
            >
              Open API reference
              <v-icon
                icon="mdi-open-in-new"
                size="x-small"
              />
            </a>
          </v-sheet>
        </v-menu>

        <span v-else>{{ item.title }}</span>
      </template>
    </v-treeview>
  </v-card>
</template>

<script lang="ts" setup>
  /** Displays the active Google Cloud project's complete Earth Engine API registry as a hierarchy. */
  import type { ApiDocumentationEntry } from './docsTree'
  import { storeToRefs } from 'pinia'
  import { computed, ref, watch } from 'vue'
  import { fetchEarthEngineApiDocumentation } from '@/services/earthEngine'
  import { useGoogleAuthStore } from '@/stores/googleAuth'
  import { useGoogleProjectsStore } from '@/stores/googleProjects'
  import { buildDocumentationTree } from './docsTree'

  /** Receives whether the surrounding tab currently displays the Earth Engine API documentation. */
  const { active } = defineProps<{
    /** Indicates whether this tree is visible and may begin a registry request. */
    active: boolean
  }>()

  /** Provides the OAuth token required to initialize the Earth Engine browser client. */
  const { accessToken } = storeToRefs(useGoogleAuthStore())

  /** Provides the Google Cloud project whose Earth Engine registry is displayed. */
  const { selectedProject } = storeToRefs(useGoogleProjectsStore())

  /** Holds the complete algorithm registry after the active session loads it. */
  const entries = ref<ApiDocumentationEntry[]>([])

  /** Indicates when the Earth Engine client is initializing or retrieving the algorithm registry. */
  const isLoading = ref(false)

  /** Exposes an Earth Engine initialization or registry error while keeping the surrounding workspace usable. */
  const loadError = ref<string | null>(null)

  /** Converts the loaded flat API registry into the hierarchy rendered by the tree view. */
  const documentationTree = computed(() => buildDocumentationTree(entries.value))

  /** Loads current project documentation only while the Docs tab is visible and discards superseded responses. */
  watch([() => active, accessToken, selectedProject], async ([isActive, token, project], _previous, onCleanup) => {
    let isCurrent = true
    onCleanup(() => {
      isCurrent = false
    })

    if (!isActive) {
      return
    }

    entries.value = []
    loadError.value = null

    if (!token || !project) {
      return
    }

    isLoading.value = true

    try {
      const documentation = await fetchEarthEngineApiDocumentation(token, project.id)

      if (isCurrent) {
        entries.value = documentation
      }
    } catch (error) {
      if (isCurrent) {
        loadError.value = error instanceof Error ? error.message : 'Unable to load Earth Engine API docs.'
      }
    } finally {
      if (isCurrent) {
        isLoading.value = false
      }
    }
  }, { immediate: true })
</script>

<style scoped>
  :deep(.v-treeview-indent-lines) {
    grid-template-columns: repeat(var(--v-indent-parts, 1), 28px);
  }

  .documentation-leaf {
    display: block;
  }

  .api-tooltip {
    color: rgb(var(--v-theme-on-surface));
    display: grid;
    gap: 8px;
    max-block-size: calc(100dvh - 32px);
    overflow-y: auto;
    padding: 10px 12px;
  }

  .api-tooltip-signature {
    display: grid;
    gap: 2px;
  }

  .api-tooltip-signature code {
    color: rgb(var(--v-theme-primary));
    font-family: 'Roboto Mono', monospace;
    font-size: 11px;
    overflow-wrap: anywhere;
  }

  .api-tooltip-signature span,
  .api-tooltip-description,
  .api-tooltip-arguments,
  .api-tooltip-link {
    font-size: 10px;
    line-height: 1.35;
  }

  .api-tooltip-signature span {
    color: rgb(var(--v-theme-on-surface) / var(--v-medium-emphasis-opacity));
  }

  .api-tooltip-description {
    margin: 0;
    white-space: pre-line;
  }

  .api-tooltip-arguments {
    border-collapse: collapse;
    inline-size: 100%;
  }

  .api-tooltip-arguments th {
    color: rgb(var(--v-theme-on-surface) / var(--v-medium-emphasis-opacity));
    font-weight: 500;
    text-align: start;
  }

  .api-tooltip-arguments th,
  .api-tooltip-arguments td {
    border-block-start: 1px solid rgb(var(--v-theme-on-surface) / 12%);
    padding-block: 4px;
    text-align: start;
    vertical-align: top;
  }

  .api-tooltip-arguments th + th,
  .api-tooltip-arguments td + td {
    padding-inline-start: 8px;
  }

  .api-tooltip-arguments code {
    font-family: 'Roboto Mono', monospace;
    font-size: inherit;
    overflow-wrap: anywhere;
  }

  .api-tooltip-link {
    align-items: center;
    color: rgb(var(--v-theme-primary));
    display: inline-flex;
    gap: 4px;
    text-decoration: none;
  }
</style>
