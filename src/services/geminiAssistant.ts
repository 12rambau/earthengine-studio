/** Identifies the assistant interaction modes mirrored from the editor's chat experience. */
export type AssistantMode = 'agent' | 'ask' | 'plan'

/** Distinguishes the author of a conversation turn for rendering and for the Gemini request payload. */
export type AssistantRole = 'assistant' | 'user'

/** Represents one stored conversation turn rendered by the assistant panel. */
export interface AssistantMessage {
  content: string
  id: string
  role: AssistantRole
}

/** Provides the Vertex AI REST root that serves Gemini from the caller's own Google Cloud project. */
const vertexAiApiUrl = 'https://aiplatform.googleapis.com/v1'

/**
 * Requests the Vertex AI access needed to run Gemini in the user's project.
 * Google exposes no narrower Vertex AI scope, so this supersedes the read-only project scope.
 */
export const googleCloudPlatformScope = 'https://www.googleapis.com/auth/cloud-platform'

/** Serves Gemini without pinning the conversation to a single regional endpoint. */
const modelLocation = 'global'

/** Selects the Gemini model used for workspace assistance. */
const geminiModel = 'gemini-2.5-flash'

/** Grounds replies in the Earth Engine domain without narrowing what the user may ask. */
const systemInstruction = [
  'You are the Earth Engine Studio assistant, embedded in a web workspace for Google Earth Engine workflows.',
  'Favor accurate, runnable Earth Engine JavaScript API examples and concise explanations.',
  'Use Markdown, and fenced code blocks with a language tag for code.',
  'When a request depends on assets or permissions you cannot inspect, say so instead of inventing asset IDs.',
].join(' ')

/**
 * Requests one Gemini completion through Vertex AI, billed to and quota-attributed against `projectId`
 * so the connected user consumes their own Google Cloud resources rather than the application's.
 */
export async function generateAssistantReply (
  accessToken: string,
  projectId: string,
  messages: AssistantMessage[],
  signal?: AbortSignal,
): Promise<string> {
  const requestUrl = `${vertexAiApiUrl}/projects/${encodeURIComponent(projectId)}/locations/${modelLocation}/publishers/google/models/${geminiModel}:generateContent`
  const response = await fetch(requestUrl, {
    body: JSON.stringify({
      contents: messages.map(message => ({
        parts: [{ text: message.content }],
        role: message.role === 'assistant' ? 'model' : 'user',
      })),
      generationConfig: { maxOutputTokens: 2048, temperature: 0.2 },
      systemInstruction: { parts: [{ text: systemInstruction }] },
    }),
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Goog-User-Project': projectId,
    },
    method: 'POST',
    signal,
  })

  if (!response.ok) {
    throw new Error('Unable to reach Gemini. Ensure the Vertex AI API is enabled for the selected project and reconnect Google services.')
  }

  return parseAssistantReply(await response.json())
}

/** Extracts the reply text from a Vertex AI candidate, surfacing safety blocks as an actionable message. */
function parseAssistantReply (payload: unknown): string {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Gemini returned an invalid response.')
  }

  const candidate = (payload as { candidates?: unknown[] }).candidates?.[0]

  if (!candidate || typeof candidate !== 'object') {
    throw new Error('Gemini returned no reply for this request.')
  }

  const { content, finishReason } = candidate as {
    content?: { parts?: { text?: unknown }[] }
    finishReason?: unknown
  }

  const reply = (content?.parts ?? [])
    .map(part => (typeof part.text === 'string' ? part.text : ''))
    .join('')
    .trim()

  if (!reply) {
    throw new Error(finishReason === 'SAFETY'
      ? 'Gemini blocked this reply under its safety policies.'
      : 'Gemini returned an empty reply.')
  }

  return reply
}
