/**
 * LLM Service
 *
 * Providers:
 * - api:    the site's /api/chat Vercel Function (hosted free-tier models, streamed)
 * - script: directed responses from directed-responses.json (no network LLM)
 *
 * Any API failure falls back to scripted responses so the avatar never goes silent.
 *
 * Key behaviors:
 * - Breaks responses into natural speech chunks for TTS
 * - Supports interrupt timestamps for barge-in
 * - Maintains conversation history
 */

import { useCallback, useMemo, useState } from 'react'

import { defaultLLMConfig, type LLMConfig } from './config/llmConfig'
import type { LLMPerformRequest, LLMResponse, LLMState, LLMStatusUpdate } from './llmTypes'
import { llmApi } from './models/llmApi'
import { llmDirected } from './models/llmDirected'

type LLMServiceProps = {
  config?: Partial<LLMConfig>
  onStatus?: (update: LLMStatusUpdate) => void
  onResponse?: (response: LLMResponse) => void
}

export const useLLMService = ({ config: configPartial = {}, onStatus, onResponse }: LLMServiceProps) => {
  const config = useMemo(() => ({ ...defaultLLMConfig, ...configPartial }), [configPartial])
  const [state, setState] = useState<LLMState>({
    messages: [],
    thinking: false,
    ready: true,
    loading: false,
    _latest_interrupt: 0
  })

  const processThinkBlocks = useCallback((input: string) => {
    const thinkBlocks: string[] = []

    const cleanedResponse = input.replace(/<think>(.*?)<\/think>/gs, (_, content) => {
      thinkBlocks.push(content.trim())
      return ''
    })

    return { cleanedResponse, thinkBlocks }
  }, [])

  const processUserInput = useCallback(
    async (request: LLMPerformRequest) => {
      if (!request.final || !request.bargein) return

      const text = request.text?.trim()
      if (!text || !text.length) return

      setState((prev) => ({ ...prev, _latest_interrupt: request.interrupt }))

      const baseParams = {
        userMessage: text,
        interrupt: request.interrupt,
        messages: state.messages,
        latestInterrupt: state._latest_interrupt,
        responseCallback: onResponse,
        updateMessages: (userMsg: string, assistantMsg: string) => {
          setState((prev) => ({
            ...prev,
            messages: [
              ...prev.messages,
              { role: 'user', content: userMsg },
              { role: 'assistant', content: assistantMsg }
            ]
          }))
        },
        setThinking: (thinking: boolean) => {
          setState((prev) => ({ ...prev, thinking }))
        },
        statusCallback: onStatus,
        processThinkBlocks
      }

      const runScripted = async () => {
        const result = await llmDirected(baseParams)
        if (!result.success && result.error) {
          logger.error('LLM: Scripted responses failed:', result.error)
          onStatus?.({ color: 'error', text: 'Failed to process request' })
        }
      }

      try {
        if (config.llm_provider === 'script' || !config.api_url) {
          await runScripted()
          return
        }

        const result = await llmApi({ ...baseParams, llmUrl: config.api_url })
        if (!result.success && result.error) {
          logger.error('LLM: API reasoning failed:', result.error)
          onStatus?.({ color: 'warning', text: 'Chat API unavailable, using scripted responses' })
          await runScripted()
        }
      } catch (error) {
        logger.error('LLM - error processing input:', error)
        try {
          await runScripted()
        } catch (fallbackError) {
          logger.error('LLM: Fallback error handler also failed:', fallbackError)
          onStatus?.({ color: 'error', text: 'Error processing request' })
        }
      }
    },
    [state.messages, state._latest_interrupt, onResponse, onStatus, processThinkBlocks, config.llm_provider, config.api_url]
  )

  const clearHistory = useCallback(() => {
    setState((prev) => ({
      ...prev,
      messages: []
    }))
  }, [])

  // Kept for API compatibility with useAgent; there is nothing to preload anymore.
  const load = useCallback(async () => {}, [])

  const actions = useMemo(
    () => ({
      load,
      processUserInput,
      clearHistory
    }),
    [load, processUserInput, clearHistory]
  )

  return useMemo(
    () => ({
      state,
      actions
    }),
    [state, actions]
  )
}
