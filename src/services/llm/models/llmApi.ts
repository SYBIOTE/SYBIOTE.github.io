/**
 * Hosted LLM Implementation
 *
 * Streams replies from the site's own /api/chat Vercel Function (Gemini / Groq free tiers).
 * The server owns the system prompt, so only user/assistant turns are sent.
 * Handles breath chunking for TTS integration.
 */

import i18n from '../../../i18n/i18n'
import { AvatarUIState } from '../../actions/avatarActions'
import type { LLMParams, LLMResult } from '../llmTypes'

const MIN_BREATH_LENGTH = 20

export async function llmApi(params: LLMParams): Promise<LLMResult> {
  const { userMessage, interrupt, messages, llmUrl, isStale, responseCallback, updateMessages, setThinking } = params

  if (!llmUrl) {
    return { success: false, error: new Error('Chat API URL is required') }
  }

  setThinking?.(true)

  const rcounter = 1000
  let fragmentCounter = 0
  let fullResponse = ''
  let breath = ''

  // Network chunks can hold several sentences, so split on every boundary
  // (punctuation followed by whitespace) once the breath is long enough.
  const breathHelper = (fragment: string | null = null, finished = false) => {
    if (isStale()) {
      logger.log('LLM: skipping - work is old', interrupt)
      return
    }

    if (fragment) breath += fragment

    const boundary = /[.,!?](?=\s)/g
    let match: RegExpExecArray | null
    while ((match = boundary.exec(breath))) {
      const end = match.index + 1
      if (end < MIN_BREATH_LENGTH) continue

      responseCallback?.({
        text: fullResponse,
        breath: breath.slice(0, end),
        ready: true,
        final: false,
        interrupt,
        rcounter,
        bcounter: fragmentCounter
      })
      fragmentCounter++
      // Keep the leading space: breaths are concatenated into the chat message
      breath = breath.slice(end)
      boundary.lastIndex = 0
    }

    if (finished && fullResponse.length) {
      responseCallback?.({
        text: fullResponse,
        breath: breath.trim() ? breath : '',
        ready: true,
        final: true,
        interrupt,
        rcounter,
        bcounter: fragmentCounter
      })
      breath = ''
    }
  }

  try {
    const history = [...messages, { role: 'user' as const, content: userMessage }]
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }))

    // What the shared screen shows, so the avatar can talk about it ("what's this?")
    const { openSectionId, focusProjectId, openFolderId } = AvatarUIState.get()
    const screen = { section: openSectionId, project: focusProjectId, folder: openFolderId ?? null }

    const response = await fetch(llmUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history, locale: i18n.language, screen })
    })

    if (!response.ok || !response.body) {
      setThinking?.(false)
      return { success: false, error: new Error(`Chat API ${response.status}`) }
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      if (isStale()) {
        logger.log('LLM: API request outdated, stopping')
        await reader.cancel()
        break
      }

      const content = decoder.decode(value, { stream: true })
      if (content) {
        fullResponse += content
        breathHelper(content)
      }
    }

    if (!fullResponse.trim()) {
      setThinking?.(false)
      return { success: false, error: new Error('Empty response from chat API') }
    }

    updateMessages?.(userMessage, fullResponse)
    setThinking?.(false)

    breathHelper(null, true)

    return { success: true, fullResponse }
  } catch (err) {
    logger.error('LLM: API reasoning error', err)
    setThinking?.(false)
    return { success: false, error: err as Error }
  }
}
