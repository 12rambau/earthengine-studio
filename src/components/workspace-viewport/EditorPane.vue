<template>
  <workspace-sheet
    class="editor"
    :is-closable="false"
    :is-fullscreen="isFullscreen"
    title="Editor"
    @toggle-fullscreen="emit('toggle-fullscreen')"
  >
    <template #header>
      <v-btn
        aria-label="New script"
        density="compact"
        icon="mdi-plus"
        size="small"
        title="New script"
        variant="text"
        @click="scriptEditorStore.createTab()"
      />

      <v-tabs
        v-if="tabs.length > 0"
        v-model="activeTabIdModel"
        aria-label="Open scripts"
        class="my-1 ms-1"
        density="compact"
        height="24"
        hide-slider
        show-arrows
      >
        <v-tab
          v-for="tab in tabs"
          :key="tab.id"
          class="editor-tab"
          :class="{ 'editor-tab--inactive': activeTabId !== tab.id }"
          density="compact"
          min-width="0"
          rounded="sm"
          size="x-small"
          slim
          :value="tab.id"
          :variant="activeTabId === tab.id ? 'tonal' : 'text'"
          @dblclick="startRenaming(tab)"
        >
          <v-text-field
            v-if="renamingTabId === tab.id"
            :ref="setRenameInputRef"
            v-model="renameValue"
            class="editor-tab-rename"
            density="compact"
            hide-details
            single-line
            variant="plain"
            @blur="commitRename(tab.id)"
            @click.stop
            @keydown.enter="commitRename(tab.id)"
            @keydown.esc="cancelRenaming"
          />

          <span v-else>{{ tab.name }}</span>

          <v-icon
            :aria-label="`Close ${tab.name}`"
            class="editor-tab-close ms-1"
            icon="mdi-close"
            size="14"
            :title="`Close ${tab.name}`"
            @click.stop="scriptEditorStore.closeTab(tab.id)"
          />
        </v-tab>
      </v-tabs>
    </template>

    <script-editor
      v-if="activeTab"
      :key="activeTab.id"
      :language="activeLanguage"
      :model-value="activeTab.content"
      @update:model-value="content => scriptEditorStore.updateTabContent(activeTab!.id, content)"
    />

    <div
      v-else
      class="d-flex flex-column align-center justify-center ga-2 h-100 text-medium-emphasis"
    >
      <v-icon icon="mdi-language-javascript" size="28" />
      <div class="text-body-2">No script is open</div>

      <v-btn
        prepend-icon="mdi-plus"
        text="New script"
        variant="tonal"
        @click="scriptEditorStore.createTab()"
      />
    </div>
  </workspace-sheet>
</template>

<script lang="ts" setup>
  /** Hosts the tabbed Earth Engine script editor. */
  import type { ScriptTab } from '@/stores/scriptEditor'
  import type { ComponentPublicInstance } from 'vue'
  import { storeToRefs } from 'pinia'
  import { computed, nextTick, ref } from 'vue'
  import { useScriptEditorStore } from '@/stores/scriptEditor'
  import ScriptEditor from './editor-pane/ScriptEditor.vue'
  import { resolveScriptLanguage } from './editor-pane/scriptLanguage'
  import WorkspaceSheet from './WorkspaceSheet.vue'

  /** Declares the presentation state owned by the workspace viewport. */
  defineProps<{
    /** Indicates that the editor currently occupies the fullscreen workspace view. */
    isFullscreen: boolean
  }>()

  /** Forwards editor fullscreen requests to the workspace viewport. */
  const emit = defineEmits<{
    /** Requests that the workspace toggle the editor fullscreen state. */
    'toggle-fullscreen': []
  }>()

  /** Owns the open script tabs and the source each one holds. */
  const scriptEditorStore = useScriptEditorStore()

  /** Exposes the open tabs and active selection to the tab strip and editor. */
  const { activeTab, activeTabId, tabs } = storeToRefs(scriptEditorStore)

  /** Bridges v-tabs' two-way binding to the store's explicit tab-selection action. */
  const activeTabIdModel = computed({
    get: () => activeTabId.value,
    set: value => {
      if (value) {
        scriptEditorStore.selectTab(value as string)
      }
    },
  })

  /** Resolves the active script's Monaco language from its file extension, falling back to raw plain text. */
  const activeLanguage = computed(() => resolveScriptLanguage(activeTab.value?.name ?? ''))

  /** Identifies the tab whose name is being edited inline, if any. */
  const renamingTabId = ref<string | null>(null)

  /** Holds the in-progress tab name until it is committed or discarded. */
  const renameValue = ref('')

  /** Tracks the rename field's underlying input element so it can be focused and pre-selected. */
  let renameInputEl: HTMLInputElement | null = null

  /** Captures a reference to the rename field's input element as it mounts. */
  function setRenameInputRef (component: Element | ComponentPublicInstance | null) {
    const el = (component as ComponentPublicInstance | null)?.$el as HTMLElement | undefined
    renameInputEl = el?.querySelector('input') ?? null
  }

  /** Opens the inline rename field for a tab, pre-selecting the name up to its extension. */
  function startRenaming (tab: ScriptTab) {
    renamingTabId.value = tab.id
    renameValue.value = tab.name

    nextTick(() => {
      const extensionIndex = tab.name.lastIndexOf('.')
      const selectionEnd = extensionIndex > 0 ? extensionIndex : tab.name.length
      renameInputEl?.focus()
      renameInputEl?.setSelectionRange(0, selectionEnd)
    })
  }

  /** Applies the edited name to the tab and closes the inline rename field. */
  function commitRename (tabId: string) {
    if (renamingTabId.value === tabId) {
      scriptEditorStore.renameTab(tabId, renameValue.value)
      renamingTabId.value = null
    }
  }

  /** Discards the in-progress rename without changing the tab's name. */
  function cancelRenaming () {
    renamingTabId.value = null
  }
</script>

<style scoped>
  .editor-tab.v-tab--selected {
    color: rgb(var(--v-theme-primary));
  }

  .editor-tab--inactive {
    color: color-mix(in srgb, rgb(var(--v-theme-on-background)) calc(var(--v-medium-emphasis-opacity) * 100%), transparent);
  }

  .editor-tab-close {
    opacity: 0.6;
  }

  .editor-tab-close:hover {
    opacity: 1;
  }

  .editor-tab-rename {
    font-size: inherit;
    inline-size: 96px;
  }

  .editor-tab-rename :deep(.v-field),
  .editor-tab-rename :deep(.v-field__field),
  .editor-tab-rename :deep(.v-field__input),
  .editor-tab-rename :deep(input) {
    font-size: inherit;
    line-height: inherit;
  }

  .editor-tab-rename :deep(.v-field__input) {
    padding: 0;
    min-height: unset;
  }

  .editor-tab-rename :deep(input) {
    text-align: center;
  }
</style>
