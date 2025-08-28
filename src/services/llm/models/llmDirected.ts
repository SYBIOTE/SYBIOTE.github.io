import { DIRECTED_RESPONSES_URL } from '../config/llmConfig'
import type { LLMParams, LLMResult } from '../llmTypes'

export interface DirectedResponse {
  id: string
  response: string
  emotion?: string
}

export interface TriggerGroup {
  trigger: string
  responses: DirectedResponse[]
}

export interface DirectedConfig {
  triggers: TriggerGroup[]
}

let directedConfig: DirectedConfig | null = null

async function loadDirectedResponses(): Promise<DirectedConfig> {
  if (directedConfig) {
    return directedConfig
  }

  try {
    const response = await fetch(DIRECTED_RESPONSES_URL)
    if (!response.ok) {
      throw new Error(`Failed to load responses: ${response.statusText}`)
    }

    const config = await response.json()
    directedConfig = config
    return config
  } catch (error) {
    console.error('Directed LLM: Failed to load responses:', error)
    throw error
  }
}

function findResponse(userMessage: string, config: DirectedConfig): DirectedResponse | null {
  const lowerMessage = userMessage.toLowerCase().trim()

  // Find exact trigger match first
  const exactMatch = config.triggers.find((triggerGroup) => triggerGroup.trigger.toLowerCase() === lowerMessage)
  if (exactMatch) {
    // Randomly select from available responses
    const randomIndex = Math.floor(Math.random() * exactMatch.responses.length)
    return exactMatch.responses[randomIndex]
  }

  // Find partial trigger match
  const partialMatch = config.triggers.find((triggerGroup) => lowerMessage.includes(triggerGroup.trigger.toLowerCase()))
  if (partialMatch) {
    // Randomly select from available responses
    const randomIndex = Math.floor(Math.random() * partialMatch.responses.length)
    return partialMatch.responses[randomIndex]
  }

  return null
}

function getDefaultResponse(config: DirectedConfig): DirectedResponse | null {
  const defaultTrigger = config.triggers.find((triggerGroup) => triggerGroup.trigger === 'default')
  if (defaultTrigger) {
    // Randomly select from available default responses
    const randomIndex = Math.floor(Math.random() * defaultTrigger.responses.length)
    return defaultTrigger.responses[randomIndex]
  }
  return null
}

export async function llmDirected(params: LLMParams): Promise<LLMResult> {
  const { userMessage, interrupt, latestInterrupt, responseCallback, updateMessages, setThinking } = params

  if (interrupt < latestInterrupt) {
    console.log('LLM: Directed request outdated, stopping')
    return { success: false, error: new Error('Request outdated') }
  }

  setThinking?.(true)

  try {
    // Load responses
    const config = await loadDirectedResponses()

    // Find matching response
    const directedResponse = findResponse(userMessage, config) || getDefaultResponse(config)

    if (!directedResponse) {
      setThinking?.(false)
      return { success: false, error: new Error('No response found') }
    }

    // Simulate streaming response like LLM
    const sentences = directedResponse.response.match(/[^.!?]+[.!?]+/g) || []
    let fullResponse = ''
    let bcounter = 0

    for (let i = 0; i < sentences.length; i++) {
      if (interrupt < latestInterrupt) {
        console.log('LLM: Directed request interrupted')
        break
      }

      const sentence = sentences[i].trimEnd()
      fullResponse += (i > 0 ? '. ' : '') + sentence

      if (responseCallback) {
        responseCallback({
          text: fullResponse,
          breath: sentence,
          ready: true,
          final: i === sentences.length - 1,
          interrupt,
          rcounter: 1000,
          bcounter
        })
      }

      bcounter++

      // Small delay to simulate streaming
      await new Promise((resolve) => setTimeout(resolve, 200))
    }

    updateMessages?.(userMessage, fullResponse)
    setThinking?.(false)

    return { success: true, fullResponse }
  } catch (error) {
    console.error('LLM: Directed reasoning error', error)
    setThinking?.(false)
    return { success: false, error: error as Error }
  }
}
