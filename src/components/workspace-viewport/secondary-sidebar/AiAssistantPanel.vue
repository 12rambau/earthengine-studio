<template>
  <div class="assistant-panel">
    <div ref="conversationElement" class="assistant-conversation">
      <div
        v-if="messages.length === 0"
        class="d-flex flex-column align-center justify-center text-center ga-2 pa-4 h-100 text-medium-emphasis"
      >
        <v-icon color="primary" icon="mdi-star-four-points" size="28" />
        <div class="text-body-2">Ask Gemini about your Earth Engine workflows</div>
        <div class="text-caption">Replies use the Gemini models of your selected Google Cloud project.</div>
      </div>

      <assistant-message
        v-for="message in messages"
        :key="message.id"
        :message="message"
      />

      <div
        v-if="isGenerating"
        class="d-flex align-center ga-2 px-2 py-2 text-medium-emphasis"
      >
        <v-progress-circular color="primary" indeterminate size="14" width="2" />
        <span class="text-caption">Gemini is working…</span>
      </div>
    </div>

    <v-alert
      v-if="error"
      class="ma-2 text-caption"
      closable
      density="compact"
      type="error"
      variant="tonal"
      @click:close="assistantStore.error = null"
    >{{ error }}</v-alert>

    <div class="assistant-composer ma-2 pa-1 rounded-lg">
      <v-textarea
        v-model="prompt"
        aria-label="Message the assistant"
        auto-grow
        density="compact"
        :disabled="isGenerating"
        hide-details
        max-rows="8"
        :placeholder="composerPlaceholder"
        rows="2"
        variant="plain"
        @keydown.enter.exact.prevent="submitPrompt"
      />

      <div class="d-flex align-center ga-1">
        <v-select
          v-model="mode"
          aria-label="Assistant mode"
          class="assistant-mode-select"
          density="compact"
          hide-details
          item-title="label"
          item-value="value"
          :items="modes"
          variant="plain"
        />

        <v-spacer />

        <span class="text-caption text-disabled me-1">gemini-2.5-flash</span>

        <v-btn
          v-if="messages.length > 0"
          aria-label="Start a new conversation"
          density="compact"
          icon="mdi-broom"
          size="small"
          title="Start a new conversation"
          variant="text"
          @click="assistantStore.clearConversation"
        />

        <v-btn
          v-if="isGenerating"
          aria-label="Stop generating"
          color="error"
          density="compact"
          icon="mdi-stop"
          size="small"
          title="Stop generating"
          variant="text"
          @click="assistantStore.stopGenerating"
        />

        <v-btn
          v-else
          aria-label="Send message"
          color="primary"
          density="compact"
          :disabled="!prompt.trim() || !isReady"
          icon="mdi-send"
          size="small"
          title="Send message"
          variant="text"
          @click="submitPrompt"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  /** Provides the conversational Gemini assistant hosted by the secondary sidebar. */
  import { storeToRefs } from 'pinia'
  import { computed, nextTick, ref, watch } from 'vue'
  import { useAiAssistantStore } from '@/stores/aiAssistant'
  import AssistantMessage from './ai-assistant-panel/AssistantMessage.vue'

  /** Owns the conversation, pending state, and Gemini requests. */
  const assistantStore = useAiAssistantStore()

  /** Exposes conversation state to the panel while keeping store mutations centralized. */
  const { error, isGenerating, isReady, messages, mode } = storeToRefs(assistantStore)

  /** Holds the composer text until the user submits it. */
  const prompt = ref('')

  /** Scrolls the transcript as turns and pending indicators are appended. */
  const conversationElement = ref<HTMLElement | null>(null)

  /** Offers the editor's three chat modes while only `ask` is implemented. */
  const modes = [
    { label: 'Plan', props: { disabled: true }, value: 'plan' },
    { label: 'Ask', value: 'ask' },
    { label: 'Agent', props: { disabled: true }, value: 'agent' },
  ]

  /** Explains why the composer cannot send until Google services and a project are available. */
  const composerPlaceholder = computed(() => {
    return isReady.value
      ? 'Ask about Earth Engine, or describe what you want to build'
      : 'Connect Google services and select a project to start'
  })

  /** Keeps the newest turn visible without fighting a user who scrolled back. */
  watch([messages, isGenerating], async () => {
    await nextTick()
    conversationElement.value?.scrollTo({ behavior: 'smooth', top: conversationElement.value.scrollHeight })
  }, { deep: true })

  /** Sends the composer text and clears it only once the turn has been accepted. */
  function submitPrompt () {
    if (!prompt.value.trim() || isGenerating.value || !isReady.value) {
      return
    }

    void assistantStore.sendPrompt(prompt.value)
    prompt.value = ''
  }
</script>

<style scoped>
  .assistant-panel {
    block-size: 100%;
    display: grid;
    grid-template-rows: minmax(0, 1fr) min-content min-content;
  }

  .assistant-conversation {
    min-block-size: 0;
    overflow-y: auto;
  }

  .assistant-composer {
    border: 1px solid rgba(var(--v-theme-on-surface), 0.18);
  }

  .assistant-composer:focus-within {
    border-color: rgb(var(--v-theme-primary));
  }

  .assistant-mode-select {
    flex: 0 0 96px;
    font-size: 11px;
    inline-size: 96px;
  }
</style>
