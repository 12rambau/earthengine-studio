<template>
  <v-dialog
    v-model="isOpen"
    content-class="function-documentation-dialog"
    location="top"
    location-strategy="connected"
    max-width="480"
    origin="overlap"
    scrollable
    target=".catalog-search-field .v-field"
    transition="dialog-scale-transition"
    viewport-margin="0"
    width="100%"
  >
    <v-card
      v-if="entry"
      aria-label="Function documentation"
    >
      <v-sheet
        class="d-flex align-center justify-center"
        color="primary"
        height="24"
      >
        <span style="color: rgb(var(--v-theme-on-primary))">{{ entry.name }}</span>
      </v-sheet>

      <v-card-text>
        <div class="function-signature">
          <code>{{ entry.usage }}</code>

          <span v-if="entry.returns">
            Returns {{ entry.returns }}
          </span>
        </div>

        <p
          v-if="entry.description"
          class="function-description"
        >
          {{ entry.description }}
        </p>

        <v-table
          v-if="entry.args.length > 0"
          density="compact"
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
              v-for="argument in entry.args"
              :key="argument.name"
            >
              <td><code>{{ argument.name }}</code></td>
              <td><code>{{ argument.type }}</code></td>
              <td>{{ argument.details }}</td>
            </tr>
          </tbody>
        </v-table>

        <a
          v-if="href"
          class="function-reference-link"
          :href="href"
          rel="noopener noreferrer"
          target="_blank"
        >
          Open API reference
          <v-icon
            icon="mdi-open-in-new"
            size="x-small"
          />
        </a>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
  /** Displays the full metadata for an Earth Engine API function selected from the documentation tree. */
  import type { ApiDocumentationEntry } from './docsTree'
  import { computed } from 'vue'

  /** Receives the selected function and the visibility state held by the documentation tree. */
  const props = defineProps<{
    /** Identifies the Earth Engine algorithm currently being previewed. */
    entry: ApiDocumentationEntry | null

    /** Links to the official API reference section for the selected function. */
    href?: string | null

    /** Indicates whether the function preview dialog should be displayed. */
    modelValue: boolean
  }>()

  /** Synchronizes the dialog visibility with the owning documentation tree. */
  const emit = defineEmits<{
    /** Updates the visibility state managed by the documentation tree. */
    'update:modelValue': [value: boolean]
  }>()

  /** Relays the controlled dialog model without taking ownership away from the documentation tree. */
  const isOpen = computed({
    get: () => props.modelValue,
    set: value => {
      // eslint-disable-next-line vue/custom-event-name-casing -- Vue reserves this camel-case event for v-model.
      emit('update:modelValue', value)
    },
  })
</script>

<style scoped>
  .function-signature {
    display: grid;
    gap: 2px;
    margin-block-end: 8px;
  }

  .function-signature code {
    color: rgb(var(--v-theme-primary));
    font-family: 'Roboto Mono', monospace;
    font-size: 12px;
    overflow-wrap: anywhere;
  }

  .function-signature span {
    color: rgb(var(--v-theme-on-surface) / var(--v-medium-emphasis-opacity));
    font-size: 11px;
  }

  .function-description {
    font-size: 12px;
    line-height: 1.35;
    margin: 0 0 8px;
    white-space: pre-line;
  }

  .function-reference-link {
    align-items: center;
    color: rgb(var(--v-theme-primary));
    display: inline-flex;
    gap: 4px;
    margin-block-start: 8px;
    text-decoration: none;
  }

  /* Matches the connected strategy's vertical placement but recenters the dialog horizontally. */
  :global(.function-documentation-dialog) {
    left: 50% !important;
    margin-inline: 0 !important;
    transform: translateX(-50%) !important;
  }
</style>
