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
 * - Supports interrupt timestamps for barge-in: a newer turn or a barge-in stops the old reply
 * - Maintains conversation history, with interrupted replies cut to what was actually said
 */

import { useCallback, useMemo, useRef, useState } from 'react'

import { defaultLLMConfig, type LLMConfig } from './config/llmConfig'
import type { LLMPerformRequest, LLMResponse, LLMState, LLMStatusUpdate } from './llmTypes'
import { llmApi } from './models/llmApi'
import { llmDirected } from './models/llmDirected'

type LLMServiceProps = {
  config?: Partial<LLMConfig>
  onStatus?: (update: LLMStatusUpdate) => void
  onResponse?: (response: LLMResponse) => void
}

/** An interrupted reply as the model sees it next turn: what was said, ending in a dash (see api/chat.ts) */
const cutOff = (spoken: string) => `${spoken.trim()}—`

export const useLLMService = ({ config: configPartial = {}, onStatus, onResponse }: LLMServiceProps) => {
  const config = useMemo(() => ({ ...defaultLLMConfig, ...configPartial }), [configPartial])
  const [state, setState] = useState<LLMState>({
    messages: [],
    thinking: false,
    ready: true,
    loading: false,
    _latest_interrupt: 0
  })
  // Read live by in-flight requests (state would be the value from when they started)
  const latestInterruptRef = useRef(0)
  // Replies the visitor cut off, by turn: what was actually spoken before they did
  const cutOffsRef = useRef(new Map<number, string>())

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

      latestInterruptRef.current = Math.max(latestInterruptRef.current, request.interrupt)
      setState((prev) => ({ ...prev, _latest_interrupt: request.interrupt }))
      const interrupt = request.interrupt

      const baseParams = {
        userMessage: text,
        interrupt: request.interrupt,
        messages: state.messages,
        isStale: () => latestInterruptRef.current > interrupt,
        responseCallback: onResponse,
        updateMessages: (userMsg: string, assistantMsg: string) => {
          const spoken = cutOffsRef.current.get(interrupt)
          setState((prev) => ({
            ...prev,
            messages: [
              ...prev.messages,
              { role: 'user', content: userMsg, interrupt },
              { role: 'assistant', content: spoken === undefined ? assistantMsg : cutOff(spoken), interrupt }
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
    [state.messages, onResponse, onStatus, processThinkBlocks, config.llm_provider, config.api_url]
  )

  /** Stops the in-flight reply (the visitor took the turn), without starting a new one */
  const supersede = useCallback((interrupt: number) => {
    latestInterruptRef.current = Math.max(latestInterruptRef.current, interrupt)
  }, [])

  /**
   * The visitor cut off the reply to turn `interrupt` after `spoken` had been said: remember only that,
   * whether the reply is already in the history or still streaming in
   */
  const markCutOff = useCallback((interrupt: number, spoken: string) => {
    cutOffsRef.current.set(interrupt, spoken)
    setState((prev) => ({
      ...prev,
      messages: prev.messages.map((m) =>
        m.role === 'assistant' && m.interrupt === interrupt ? { ...m, content: cutOff(spoken) } : m
      )
    }))
  }, [])

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
      supersede,
      markCutOff,
      clearHistory
    }),
    [load, processUserInput, supersede, markCutOff, clearHistory]
  )

  return useMemo(
    () => ({
      state,
      actions
    }),
    [state, actions]
  )
}
