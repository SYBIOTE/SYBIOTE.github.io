/**
 * Helps the browser's speech recognition with the words this site is about: project and company
 * names (from the aliases in src/data/assistantTopics.json) and the tech the visitor asks about.
 *
 * - phrases: boosted in recognizers that support it (Chrome's newer Web Speech API)
 * - pickTranscript: of the recognizer's alternatives, the one that names the most of them
 * - polishTranscript: spells the usual mishearings properly ("three js" -> "Three.js")
 */

import TOPICS from '../../data/assistantTopics.json'
import { findTopics, mentionsAny } from '../llm/topicMatch'

// Projects and jobs share some ids (etherealEngine), so keep both sets of aliases apart
const TOPIC_TABLE: Record<string, string[]> = Object.fromEntries([
  ...Object.entries(TOPICS.projects).map(([id, aliases]) => [`project:${id}`, aliases]),
  ...Object.entries(TOPICS.jobs).map(([id, aliases]) => [`job:${id}`, aliases])
])

const TECH = ['three.js', 'three js', 'webxr', 'web xr', 'webgpu', 'webgl', 'react three fiber', 'gaussian splat', 'godot', 'unity', 'unreal', 'typescript', 'supabase', 'ai twin']

/** Names worth boosting: the longest alias of each project and company, plus the tech terms */
export const RECOGNITION_PHRASES: string[] = [
  ...new Set([
    ...Object.values(TOPIC_TABLE).map((aliases) => aliases.reduce((a, b) => (b.length > a.length ? b : a))),
    'Three.js',
    'WebXR',
    'WebGPU',
    'React Three Fiber',
    'Gaussian splat',
    'Godot',
    'AI twin'
  ])
]

const score = (text: string) => findTopics(text, TOPIC_TABLE).length + TECH.filter((term) => mentionsAny(text, [term])).length

/** The recognizer's best guess, unless a less likely one names more of the site's topics */
export const pickTranscript = (alternatives: string[]): string => {
  let best = alternatives[0] ?? ''
  let bestScore = score(best)
  for (const alternative of alternatives.slice(1)) {
    const s = score(alternative)
    if (s > bestScore) {
      best = alternative
      bestScore = s
    }
  }
  return best
}

const SPELLINGS: [RegExp, string][] = [
  [/\b(?:three|3) ?(?:\.|dot )?(?:js|j s|jay ?s)\b/gi, 'Three.js'],
  [/\bweb ?xr\b/gi, 'WebXR'],
  [/\bweb ?gpu\b/gi, 'WebGPU'],
  [/\bweb ?gl\b/gi, 'WebGL'],
  [/\breact three fiber\b/gi, 'React Three Fiber'],
  // A prefix, so a plural keeps its "s"
  [/\bgaussian splat/gi, 'Gaussian splat']
]

/** The transcript with the site's tech terms spelled the way people write them */
export const polishTranscript = (text: string): string =>
  SPELLINGS.reduce((out, [pattern, replacement]) => out.replace(pattern, replacement), text)
