import type {
  AssistantMessage,
  AssistantMode,
} from '@/services/geminiAssistant'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { generateAssistantReply } from '@/services/geminiAssistant'
import { useGoogleAuthStore } from '@/stores/googleAuth'
import { useGoogleProjectsStore } from '@/stores/googleProjects'

/** Owns the assistant conversation so it survives hiding and restoring the secondary sidebar. */
export const useAiAssistantStore = defineStore('ai-assistant', () => {
  /** Holds the ordered conversation turns exchanged with Gemini during this browser session. */
  const messages = ref<AssistantMessage[]>([])

  /** Tracks the selected interaction mode; only `ask` is implemented today. */
  const mode = ref<AssistantMode>('ask')

  /** Exposes a recoverable reason why the last request could not be completed. */
  const error = ref<string | null>(null)

  /** Indicates that a reply is pending so the composer can disable submission and offer cancellation. */
  const isGenerating = ref(false)

  /** Cancels an in-flight reply when the user stops generation or clears the conversation. */
  let activeRequest: AbortController | undefined

  /** Reports whether a connected account and selected project are both available for a request. */
  const isReady = computed(() => {
    return Boolean(useGoogleAuthStore().accessToken && useGoogleProjectsStore().selectedProject)
  })

  /** Appends the user's turn, then records Gemini's reply or a recoverable failure. */
  async function sendPrompt (prompt: string) {
    const trimmedPrompt = prompt.trim()
    const { accessToken } = useGoogleAuthStore()
    const { selectedProject } = useGoogleProjectsStore()

    if (!trimmedPrompt || isGenerating.value) {
      return
    }

    if (!accessToken || !selectedProject) {
      error.value = 'Connect Google services and select a project before asking the assistant.'
      return
    }

    error.value = null
    messages.value.push({ content: trimmedPrompt, id: crypto.randomUUID(), role: 'user' })
    isGenerating.value = true
    activeRequest = new AbortController()

    try {
      const reply = await generateAssistantReply(
        accessToken,
        selectedProject.id,
        messages.value,
        activeRequest.signal,
      )

      messages.value.push({ content: reply, id: crypto.randomUUID(), role: 'assistant' })
    } catch (replyError) {
      if (replyError instanceof DOMException && replyError.name === 'AbortError') {
        return
      }

      error.value = replyError instanceof Error ? replyError.message : 'The assistant request failed.'
    } finally {
      isGenerating.value = false
      activeRequest = undefined
    }
  }

  /** Abandons the pending reply while keeping the conversation already exchanged. */
  function stopGenerating () {
    activeRequest?.abort()
  }

  /** Starts a new conversation and discards any reply still in flight. */
  function clearConversation () {
    activeRequest?.abort()
    error.value = null
    messages.value = []
  }

  return {
    clearConversation,
    error,
    isGenerating,
    isReady,
    messages,
    mode,
    sendPrompt,
    stopGenerating,
  }
})
