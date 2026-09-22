import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

/** Represents one script open in the editor, holding its display name and in-memory JavaScript source. */
export interface ScriptTab {
  content: string
  id: string
  name: string
}

/** Seeds every new script with a minimal editable Earth Engine source. */
const defaultScriptContent = '// Earth Engine script\n'

/** Owns the scripts open in the editor pane so each behaves as an independently editable, closable tab. */
export const useScriptEditorStore = defineStore('script-editor', () => {
  /** Holds every script currently open in the editor, in display order. */
  const tabs = ref<ScriptTab[]>([])

  /** Identifies the tab currently displayed in the editor pane. */
  const activeTabId = ref<string | null>(null)

  /** Numbers untitled scripts without reusing a name after earlier tabs close. */
  let nextScriptNumber = 1

  /** Resolves the full tab record backing the active editor, if any script is open. */
  const activeTab = computed(() => tabs.value.find(tab => tab.id === activeTabId.value) ?? null)

  /** Opens a new untitled script tab, seeded with placeholder source, and makes it active. */
  function createTab () {
    const tab: ScriptTab = {
      content: defaultScriptContent,
      id: crypto.randomUUID(),
      name: `Script ${nextScriptNumber++}.js`,
    }

    tabs.value.push(tab)
    activeTabId.value = tab.id

    return tab
  }

  /** Activates an already open tab. */
  function selectTab (tabId: string) {
    activeTabId.value = tabId
  }

  /** Closes a tab and activates its previous neighbor, keeping the active tab stable when it was not the one closed. */
  function closeTab (tabId: string) {
    const index = tabs.value.findIndex(tab => tab.id === tabId)

    if (index === -1) {
      return
    }

    tabs.value.splice(index, 1)

    if (activeTabId.value === tabId) {
      activeTabId.value = tabs.value[index - 1]?.id ?? tabs.value[index]?.id ?? null
    }
  }

  /** Renames an open tab from its inline title editor, ignoring a blank name. */
  function renameTab (tabId: string, name: string) {
    const trimmedName = name.trim()
    const tab = tabs.value.find(current => current.id === tabId)

    if (tab && trimmedName) {
      tab.name = trimmedName
    }
  }

  /** Updates the source held by an open tab as the user edits it. */
  function updateTabContent (tabId: string, content: string) {
    const tab = tabs.value.find(current => current.id === tabId)

    if (tab) {
      tab.content = content
    }
  }

  return {
    activeTab,
    activeTabId,
    closeTab,
    createTab,
    renameTab,
    selectTab,
    tabs,
    updateTabContent,
  }
})
