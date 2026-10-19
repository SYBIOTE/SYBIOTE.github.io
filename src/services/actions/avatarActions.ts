/**
 * Avatar actions ("tool calls")
 *
 * The LLM (and the scripted fallback) embeds actions inline in its spoken reply:
 *   "Here's AssetHub [[show_project:assetHub]]."
 * Each breath is parsed before it's spoken: tags are stripped from the text and the
 * actions are dispatched, so the UI reacts in step with the sentence that mentions it.
 *
 * Inline tags (rather than provider function calling) work the same on every provider
 * and in scripted mode, and need no extra round trip.
 */

import { createSimpleStore } from '@hexafield/simple-store'

import type { EmotionType } from '../emote/emoteTypes'

export const ACTION_SECTIONS = ['resume', 'portfolio', 'services', 'contact', 'chat'] as const
export type ActionSection = (typeof ACTION_SECTIONS)[number]

export const ACTION_EMOTIONS = ['happy', 'love', 'alert', 'sad', 'neutral'] as const satisfies readonly EmotionType[]
export type ActionEmotion = (typeof ACTION_EMOTIONS)[number]

export type AvatarAction =
  | { type: 'open_section'; section: ActionSection }
  | { type: 'show_project'; id: string }
  | { type: 'close' }
  | { type: 'emote'; emotion: ActionEmotion }

const TAG_PATTERN = /\s?\[\[\s*([a-z_]+)\s*(?::\s*([\w-]+)\s*)?\]\]/gi

const includes = <T extends string>(list: readonly T[], value: string): value is T => list.includes(value as T)

const toAction = (name: string, arg: string | undefined, projectIds?: ReadonlySet<string>): AvatarAction | null => {
  switch (name.toLowerCase()) {
    case 'open':
    case 'open_section':
      return arg && includes(ACTION_SECTIONS, arg) ? { type: 'open_section', section: arg } : null
    case 'show_project':
      return arg && (!projectIds || projectIds.has(arg)) ? { type: 'show_project', id: arg } : null
    case 'close':
      return { type: 'close' }
    case 'emote':
      return arg && includes(ACTION_EMOTIONS, arg) ? { type: 'emote', emotion: arg } : null
    default:
      return null
  }
}

/**
 * Strips action tags from a chunk of text. Unknown or invalid tags are removed but ignored,
 * so a model mistake never gets read out loud.
 */
export const parseActions = (
  text: string,
  projectIds?: ReadonlySet<string>
): { text: string; actions: AvatarAction[] } => {
  const actions: AvatarAction[] = []
  const clean = text.replace(TAG_PATTERN, (_, name: string, arg?: string) => {
    const action = toAction(name, arg, projectIds)
    if (action) actions.push(action)
    return ''
  })
  return { text: clean, actions }
}

// ---------------------------------------------------------------------------
// UI state the avatar can drive
// ---------------------------------------------------------------------------

export interface AvatarUIState {
  /** Section panel currently open (null = none) */
  openSectionId: string | null
  /** Project the portfolio should open; consumed (reset to null) by the portfolio once shown */
  focusProjectId: string | null
}

export const AvatarUIState = createSimpleStore<AvatarUIState>({ openSectionId: null, focusProjectId: null })

export interface ActionContext {
  performEmotion: (emotion: ActionEmotion) => void
}

export const runAvatarAction = (action: AvatarAction, context: ActionContext): void => {
  switch (action.type) {
    case 'open_section':
      AvatarUIState.set((prev) => ({ ...prev, openSectionId: action.section }))
      break
    case 'show_project':
      AvatarUIState.set({ openSectionId: 'portfolio', focusProjectId: action.id })
      break
    case 'close':
      AvatarUIState.set({ openSectionId: null, focusProjectId: null })
      break
    case 'emote':
      context.performEmotion(action.emotion)
      break
  }
}
