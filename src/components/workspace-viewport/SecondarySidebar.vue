<template>
  <workspace-sheet
    class="secondary"
    :is-fullscreen="isFullscreen"
    title="Secondary sidebar"
    @close="emit('close')"
    @toggle-fullscreen="emit('toggle-fullscreen')"
  >
    <template #header>
      <v-tabs
        v-model="activeTab"
        aria-label="Secondary sidebar tabs"
        class="my-1"
        density="compact"
        height="24"
        hide-slider
      >
        <v-tab
          class="secondary-sidebar-tab"
          :class="{ 'secondary-sidebar-tab--inactive': activeTab !== 'chat' }"
          density="compact"
          min-width="0"
          rounded="sm"
          size="x-small"
          slim
          text="Chat"
          value="chat"
          :variant="activeTab === 'chat' ? 'tonal' : 'text'"
        />
      </v-tabs>
    </template>

    <v-tabs-window v-model="activeTab" class="h-100 secondary-sidebar-window">
      <v-tabs-window-item class="h-100" value="chat">
        <ai-assistant-panel />
      </v-tabs-window-item>
    </v-tabs-window>
  </workspace-sheet>
</template>

<script lang="ts" setup>
  /** Adapts the shared workspace sheet to represent the closable, tabbed secondary sidebar. */
  import { ref } from 'vue'
  import AiAssistantPanel from './secondary-sidebar/AiAssistantPanel.vue'
  import WorkspaceSheet from './WorkspaceSheet.vue'

  /** Declares the presentation state owned by the workspace viewport. */
  defineProps<{
    /** Indicates that the secondary sidebar currently occupies the fullscreen workspace view. */
    isFullscreen: boolean
  }>()

  /** Identifies the secondary-sidebar tab currently displayed, beginning with the Gemini chat. */
  const activeTab = ref('chat')

  /** Forwards secondary sidebar actions to the workspace viewport. */
  const emit = defineEmits<{
    /** Requests that the workspace hide the secondary sidebar. */
    'close': []

    /** Requests that the workspace toggle the secondary sidebar fullscreen state. */
    'toggle-fullscreen': []
  }>()
</script>

<style scoped>
  /* Vuetify exposes no prop for the window's inner container, which must stretch so the chat composer stays anchored. */
  .secondary-sidebar-window :deep(.v-window__container) {
    block-size: 100%;
  }

  .secondary-sidebar-tab.v-tab--selected {
    color: rgb(var(--v-theme-primary));
  }

  .secondary-sidebar-tab--inactive {
    color: color-mix(in srgb, rgb(var(--v-theme-on-background)) calc(var(--v-medium-emphasis-opacity) * 100%), transparent);
  }
</style>
