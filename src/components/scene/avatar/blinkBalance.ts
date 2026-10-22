/**
 * Evens out the two eyelids' blink travel.
 *
 * LAM reconstructs each eye's blink blendshape separately, and they don't always match: on this avatar
 * the right lid's edge drops ~8.1mm at a full blink and the left ~9.4mm, so the right eye closes short
 * and the closed eyes look lopsided. We measure both lids' travel from the blendshapes and scale the
 * weaker eye's blink weight up to match. Open eyes (weight 0) are untouched.
 */

import type { ArkitFrame } from './arkitMapping'

interface BalanceInternals {
  viewer?: {
    skinModel?: {
      morphTargetDictionary?: Record<string, number>
      geometry: { morphAttributes: { position?: { array: ArrayLike<number> }[] } }
    }
  }
}

// Ignore differences smaller than this; never boost by more than this
const MIN_GAIN = 1.02
const MAX_GAIN = 1.5

/** How far a blink moves its lid's edge: the median travel of the vertices that move most. */
const lidTravel = (delta: ArrayLike<number>) => {
  const travel: number[] = []
  for (let i = 0; i + 2 < delta.length; i += 3) travel.push(Math.hypot(delta[i], delta[i + 1], delta[i + 2]))
  const max = travel.reduce((m, v) => (v > m ? v : m), 0)
  const edge = travel.filter((v) => v > 0.85 * max).sort((a, b) => a - b)
  return edge.length ? edge[Math.floor(edge.length / 2)] : 0
}

/** Returns a function that evens out the blink weights in a frame, or null if the blinks already match. */
export const createBlinkBalance = (renderer: unknown) => {
  const skin = (renderer as BalanceInternals).viewer?.skinModel
  const morphs = skin?.geometry.morphAttributes.position
  const dict = skin?.morphTargetDictionary
  if (!morphs || !dict) return null
  const left = morphs[dict.eyeBlinkLeft]?.array
  const right = morphs[dict.eyeBlinkRight]?.array
  if (!left || !right) return null
  const l = lidTravel(left), r = lidTravel(right)
  if (!l || !r) return null
  const weaker = l < r ? 'eyeBlinkLeft' : 'eyeBlinkRight'
  const gain = Math.min(MAX_GAIN, Math.max(l, r) / Math.min(l, r))
  if (gain < MIN_GAIN) return null
  return (frame: Partial<ArkitFrame>) => {
    const w = frame[weaker]
    if (w) frame[weaker] = w * gain
  }
}
