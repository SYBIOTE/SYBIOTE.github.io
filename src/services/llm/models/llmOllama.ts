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
 * Custom fetch wrapper that adds ngrok header for tunneled connections
 */
const createNgrokFetch = () => {
  return (url: RequestInfo | URL, options?: RequestInit) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options?.headers,
        'ngrok-skip-browser-warning': 'true'
      }
    })
  }
}

/**
 * Create an Ollama client with ngrok-compatible headers
 */
function createOllamaClient(host: string): Ollama {
  return new Ollama({
    host,
    fetch: createNgrokFetch()
  })
}

/**
 * Get available models from Ollama using ollama/browser
 */
async function getAvailableModels(llmUrl: string): Promise<string[]> {
  try {
    const ollama = createOllamaClient(llmUrl)
    const response = await ollama.list()
    return (response.models || []).map((m: any) => m.name)
  } catch (err) {
    logger.error('Failed to get available models:', err)
    return []
  }
}

/**
 * Find a fallback model if requested model is not available
 */
async function findFallbackModel(llmUrl: string, requestedModel: string, preferredFallbacks: string[] = []): Promise<string | null> {
  const availableModels = await getAvailableModels(llmUrl)
  
  if (availableModels.length === 0) {
    return null
  }

  // Check if requested model is available
  if (availableModels.includes(requestedModel)) {
    return requestedModel
  }

  logger.warn(`⚠️ [Model Fallback] Requested model "${requestedModel}" not available`)
  logger.log(`📦 [Model Fallback] Available models:`, availableModels.join(', '))

  // Try preferred fallbacks in order
  for (const fallback of preferredFallbacks) {
    if (availableModels.includes(fallback)) {
      logger.log(`✅ [Model Fallback] Using fallback model: ${fallback}`)
      return fallback
    }
  }

  // Use first available model as last resort
  const firstAvailable = availableModels[0]
  logger.log(`⚠️ [Model Fallback] Using first available model: ${firstAvailable}`)
  return firstAvailable
}

/**
 * Health check function to verify backend and Ollama connectivity
 */
export async function checkOllamaHealth(llmUrl: string): Promise<{ backend: boolean; ollama: boolean; availableModels?: string[]; error?: string }> {
  try {
    // Check 1: Backend health endpoint
    logger.log('🔍 [Health Check] Checking backend connectivity...', llmUrl)
    const healthResponse = await fetch(`${llmUrl}/health`, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true'
      },
      mode: 'cors'
    })

    if (!healthResponse.ok) {
      logger.error('❌ [Health Check] Backend health check failed:', healthResponse.status, healthResponse.statusText)
      return { backend: false, ollama: false, error: `Backend returned ${healthResponse.status}` }
    }

    const healthData = await healthResponse.json().catch(() => null)
    logger.log('✅ [Health Check] Backend is reachable:', healthData)

    // Check 2: Ollama API through backend using ollama/browser
    logger.log('🔍 [Health Check] Checking Ollama connectivity through backend...')
    try {
      const ollama = createOllamaClient(llmUrl)

      const listResponse = await ollama.list()
      const modelNames = (listResponse.models || []).map((m: any) => m.name)
      logger.log('✅ [Health Check] Ollama is connected through backend')
      logger.log('📦 [Health Check] Available models:', modelNames.join(', ') || 'None')

      return { backend: true, ollama: true, availableModels: modelNames }
    } catch (ollamaErr) {
      logger.error('❌ [Health Check] Ollama API check failed:', ollamaErr)
      return { backend: true, ollama: false, error: `Ollama API error: ${ollamaErr instanceof Error ? ollamaErr.message : 'Unknown error'}` }
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error'
    logger.error('❌ [Health Check] Health check failed:', error)
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
      logger.log('LLM: skipping - work is old', interrupt)
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
    // Check if requested model is available, fallback if not
    const preferredFallbacks = ['gemma3:1b', 'llama3.2:1b', 'llama3.2']
    const actualModel = await findFallbackModel(llmUrl, llmModel, preferredFallbacks)
    
    if (!actualModel) {
      const error = new Error(`No models available on Ollama server. Requested: ${llmModel}`)
      logger.error('LLM: No models available:', error)
      setThinking?.(false)
      return { success: false, error }
    }

    // Log if fallback was used
    if (actualModel !== llmModel) {
      logger.warn(`⚠️ [LLM] Model fallback: "${llmModel}" → "${actualModel}"`)
    }

    const ollama = createOllamaClient(llmUrl)

    const allMessages = [...messages, { role: 'user' as const, content: userMessage }]

    const requestMessages = allMessages.map((msg) => ({
      role: msg.role,
      content: msg.content
    }))

    logger.log('LLM - sending Ollama request to', llmUrl, 'with model', actualModel)

    const response = await ollama.chat({
      model: actualModel,
      messages: requestMessages,
      stream: true
    })

    for await (const chunk of response) {
      if (latestInterrupt > interrupt) {
        logger.log('LLM: Ollama request outdated, stopping')
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
    logger.error('LLM: Ollama reasoning error', err)
    setThinking?.(false)
    return { success: false, error: err as Error }
  }
}
