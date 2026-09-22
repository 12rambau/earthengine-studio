<template>
  <article
    class="assistant-message d-flex ga-2 px-2 py-2"
    :class="{ 'assistant-message--user': message.role === 'user' }"
  >
    <v-avatar
      v-if="message.role === 'assistant'"
      color="primary"
      size="20"
      variant="tonal"
    >
      <v-icon icon="mdi-star-four-points" size="12" />
    </v-avatar>

    <v-avatar
      v-else-if="picture"
      :image="picture"
      size="20"
    />

    <v-avatar
      v-else
      color="surface-variant"
      size="20"
    >
      <v-icon icon="mdi-account" size="12" />
    </v-avatar>

    <div class="assistant-message-body flex-1-1">
      <div class="text-caption text-medium-emphasis mb-1">{{ authorLabel }}</div>

      <!-- eslint-disable-next-line vue/no-v-html -- Markdown is sanitized with DOMPurify before rendering. -->
      <div
        v-if="message.role === 'assistant'"
        class="assistant-markdown text-body-2"
        v-html="renderedContent"
      />

      <div
        v-else
        class="text-body-2 assistant-message-text"
      >{{ message.content }}</div>
    </div>
  </article>
</template>

<script lang="ts" setup>
  /** Renders one conversation turn, parsing assistant Markdown while stripping unsafe HTML. */
  import type { AssistantMessage } from '@/services/geminiAssistant'
  import DOMPurify from 'dompurify'
  import { marked } from 'marked'
  import { storeToRefs } from 'pinia'
  import { computed } from 'vue'
  import { useGoogleAuthStore } from '@/stores/googleAuth'

  /** Receives the conversation turn to display. */
  const { message } = defineProps<{
    /** Supplies the author and raw content of this turn. */
    message: AssistantMessage
  }>()

  /** Provides the signed-in account picture used as the user turn's avatar. */
  const { profile } = storeToRefs(useGoogleAuthStore())

  /** Falls back to a generic avatar when the Google account exposes no picture. */
  const picture = computed(() => profile.value?.picture)

  /** Attributes the turn to the connected account or to the assistant. */
  const authorLabel = computed(() => {
    return message.role === 'assistant' ? 'Gemini' : profile.value?.name ?? 'You'
  })

  /** Converts assistant Markdown to HTML that is sanitized before it reaches the DOM. */
  const renderedContent = computed(() => {
    return DOMPurify.sanitize(marked.parse(message.content, { async: false }))
  })
</script>

<style scoped>
  .assistant-message--user {
    background-color: rgba(var(--v-theme-on-surface), 0.04);
  }

  .assistant-message-body {
    min-inline-size: 0;
  }

  .assistant-message-text {
    white-space: pre-wrap;
  }

  .assistant-markdown :deep(p) {
    margin-block-end: 8px;
  }

  .assistant-markdown :deep(p:last-child) {
    margin-block-end: 0;
  }

  .assistant-markdown :deep(pre) {
    background-color: rgba(var(--v-theme-on-surface), 0.06);
    border-radius: 4px;
    margin-block: 8px;
    overflow-x: auto;
    padding: 8px;
  }

  .assistant-markdown :deep(code) {
    font-family: 'Roboto Mono', monospace;
    font-size: 11px;
  }

  .assistant-markdown :deep(:not(pre) > code) {
    background-color: rgba(var(--v-theme-on-surface), 0.06);
    border-radius: 3px;
    padding: 1px 4px;
  }

  .assistant-markdown :deep(ol),
  .assistant-markdown :deep(ul) {
    margin-block-end: 8px;
    padding-inline-start: 20px;
  }
</style>
