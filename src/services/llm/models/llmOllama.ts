/**
 * Ollama LLM Implementation
 *
 * This module provides local LLM processing using the Ollama JavaScript library.
 * Handles breath chunking for TTS integration with streaming support.
 */

import { Ollama } from 'ollama/browser'

import type { LLMParams, LLMResult } from '../llmTypes'

const MIN_BREATH_LENGTH = 20

/**
 * Health check function to verify backend and Ollama connectivity
 */
export async function checkOllamaHealth(llmUrl: string): Promise<{ backend: boolean; ollama: boolean; error?: string }> {
  try {
    // Check 1: Backend health endpoint
    console.log('🔍 [Health Check] Checking backend connectivity...', llmUrl)
    const healthResponse = await fetch(`${llmUrl}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!healthResponse.ok) {
      console.error('❌ [Health Check] Backend health check failed:', healthResponse.status, healthResponse.statusText)
      return { backend: false, ollama: false, error: `Backend returned ${healthResponse.status}` }
    }

    const healthData = await healthResponse.json().catch(() => null)
    console.log('✅ [Health Check] Backend is reachable:', healthData)

    // Check 2: Ollama API through backend
    console.log('🔍 [Health Check] Checking Ollama connectivity through backend...')
    const ollamaResponse = await fetch(`${llmUrl}/api/tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!ollamaResponse.ok) {
      console.error('❌ [Health Check] Ollama API check failed:', ollamaResponse.status, ollamaResponse.statusText)
      return { backend: true, ollama: false, error: `Ollama API returned ${ollamaResponse.status}` }
    }

    const ollamaData = await ollamaResponse.json().catch(() => null)
    const models = ollamaData?.models || []
    console.log('✅ [Health Check] Ollama is connected through backend')
    console.log('📦 [Health Check] Available models:', models.map((m: any) => m.name).join(', ') || 'None')

    return { backend: true, ollama: true }
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error'
    console.error('❌ [Health Check] Health check failed:', error)
    return { backend: false, ollama: false, error }
  }
}

export async function llmOllama(params: LLMParams): Promise<LLMResult> {
  const {
    userMessage,
    interrupt,
    messages,
    llmUrl,
    llmModel = 'llama3.2',
    latestInterrupt,
    responseCallback,
    updateMessages,
    setThinking
  } = params

  if (!llmUrl) {
    return { success: false, error: new Error('Ollama URL is required') }
  }

  setThinking?.(true)

  const rcounter = 1000
  let fragmentCounter = 0
  let fullResponse = ''
  let breath = ''

  const breathHelper = (fragment: string | null = null, finished = false) => {
    if (latestInterrupt > interrupt) {
      console.log('LLM: skipping - work is old', interrupt)
      return
    }

    if (!fragment || !fragment.length || finished) {
      if (fullResponse.length && responseCallback) {
        responseCallback({
          text: fullResponse,
          breath: '',
          ready: true,
          final: true,
          interrupt
        })
        fullResponse = ''
      }
      return
    }

    const match = fragment.match(/.*?[.,!?]/)
    if (breath.length < MIN_BREATH_LENGTH || !match) {
      breath += fragment
    } else {
      const i = match[0].length
      breath += fragment.slice(0, i)

      if (responseCallback) {
        responseCallback({
          text: fullResponse,
          breath,
          ready: true,
          final: false,
          interrupt,
          rcounter,
          bcounter: fragmentCounter
        })
      }
      breath = ''
      fragmentCounter++
    }
  }

  try {
    const ollama = new Ollama({
      host: llmUrl
    })

    const allMessages = [...messages, { role: 'user' as const, content: userMessage }]

    const requestMessages = allMessages.map((msg) => ({
      role: msg.role,
      content: msg.content
    }))

    console.log('LLM - sending Ollama request to', llmUrl, 'with model', llmModel)

    const response = await ollama.chat({
      model: llmModel,
      messages: requestMessages,
      stream: true
    })

    for await (const chunk of response) {
      if (latestInterrupt > interrupt) {
        console.log('LLM: Ollama request outdated, stopping')
        break
      }

      if (chunk.message?.content) {
        const content = chunk.message.content
        fullResponse += content
        breathHelper(content, chunk.done)
      }
    }

    updateMessages?.(userMessage, fullResponse)
    setThinking?.(false)

    breathHelper(null, true)

    return { success: true, fullResponse }
  } catch (err) {
    console.error('LLM: Ollama reasoning error', err)
    setThinking?.(false)
    return { success: false, error: err as Error }
  }
}
