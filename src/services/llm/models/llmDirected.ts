/**
 * Scripted replies for when no LLM is reachable (see public/assets/directed-responses.json).
 *
 * A project named in the message gets that project's answer (names matched like the LLM's
 * details, so misheard ones still work); otherwise the intent with the longest matching trigger
 * wins, with triggers matched as whole words. Answers don't repeat back to back, and "tell me
 * more" goes to the project the last reply was about.
 */

import TOPICS from '../../../data/assistantTopics.json'
import { DIRECTED_RESPONSES_URL } from '../config/llmConfig'
import type { LLMParams, LLMResult } from '../llmTypes'
import { findTopics, mentionsAny } from '../topicMatch'

export interface DirectedIntent {
  id: string
  triggers: string[]
  responses: string[]
}

export interface DirectedConfig {
  projects: Record<string, string[]>
  intents: DirectedIntent[]
  default: string[]
}

// Intents that answer the question even when a project is named too ("how much would something like AssetHub cost?")
const OVERRIDE_PROJECT = new Set(['hire', 'contact', 'phone', 'real', 'thanks', 'bye'])
// Asking for more about whatever came up last
const FOLLOW_UP = ['more', 'tell me more', 'that one', 'it', 'go on', 'and', 'what else', 'details', 'elaborate']

let directedConfig: DirectedConfig | null = null

async function loadDirectedResponses(): Promise<DirectedConfig> {
  if (directedConfig) return directedConfig
  const response = await fetch(DIRECTED_RESPONSES_URL)
  if (!response.ok) throw new Error(`Failed to load responses: ${response.statusText}`)
  directedConfig = (await response.json()) as DirectedConfig
  return directedConfig
}

// What was said last for each group, so the same line doesn't come twice in a row
const lastUsed = new Map<string, string>()
const pick = (group: string, options: string[] | undefined): string | null => {
  if (!options?.length) return null
  const fresh = options.filter((o) => o !== lastUsed.get(group))
  const choice = (fresh.length ? fresh : options)[Math.floor(Math.random() * (fresh.length || options.length))]
  lastUsed.set(group, choice)
  return choice
}

/** Longest trigger (in words, then letters) of the intent that matches `text` best. */
const bestIntent = (text: string, intents: DirectedIntent[]): DirectedIntent | null => {
  let best: { intent: DirectedIntent; score: number } | null = null
  for (const intent of intents) {
    for (const trigger of intent.triggers) {
      if (!mentionsAny(text, [trigger])) continue
      const score = trigger.split(/\s+/).length * 100 + trigger.length
      if (!best || score > best.score) best = { intent, score }
    }
  }
  return best?.intent ?? null
}

export function findDirectedResponse(userMessage: string, config: DirectedConfig, previousReply = ''): string {
  const projects = findTopics(userMessage, TOPICS.projects).filter((id) => config.projects[id])
  const intent = bestIntent(userMessage, config.intents)
  if (intent && (OVERRIDE_PROJECT.has(intent.id) || !projects.length)) return pick(intent.id, intent.responses)!
  if (projects.length) return pick(`project:${projects[0]}`, config.projects[projects[0]])!
  if (mentionsAny(userMessage, FOLLOW_UP)) {
    const earlier = findTopics(previousReply, TOPICS.projects).find((id) => config.projects[id])
    if (earlier) return pick(`project:${earlier}`, config.projects[earlier])!
  }
  return pick('default', config.default) ?? "Sorry, I didn't catch that."
}

/** Splits a reply into sentences for speaking, only where punctuation is followed by a space (so "Three.js" stays whole). */
export const toSentences = (text: string) => text.split(/(?<=[.!?])\s+/).filter((s) => s.trim())

export async function llmDirected(params: LLMParams): Promise<LLMResult> {
  const { userMessage, interrupt, isStale, responseCallback, updateMessages, setThinking } = params

  if (isStale()) {
    logger.log('LLM: Directed request outdated, stopping')
    return { success: false, error: new Error('Request outdated') }
  }

  setThinking?.(true)

  try {
    const config = await loadDirectedResponses()
    const previousReply = [...params.messages].reverse().find((m) => m.role === 'assistant')?.content ?? ''
    const reply = findDirectedResponse(userMessage, config, previousReply)

    // Simulate streaming response like LLM
    const sentences = toSentences(reply)
    let fullResponse = ''
    let bcounter = 0

    for (let i = 0; i < sentences.length; i++) {
      if (isStale()) {
        logger.log('LLM: Directed request interrupted')
        break
      }

      // Breaths after the first keep a leading space, as the LLM's do, since they're concatenated
      const sentence = i > 0 ? ` ${sentences[i]}` : sentences[i]
      fullResponse += sentence

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
    logger.error('LLM: Directed reasoning error', error)
    setThinking?.(false)
    return { success: false, error: error as Error }
  }
}
