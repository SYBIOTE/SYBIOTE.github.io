/**
 * Keeps the face from ever being perfectly still between expressions, as a real face never is:
 * slow, small drift on the mouth corners, cheeks and brows (each side on its own, so it isn't
 * mirror-symmetric), a faint resting smile that's a little warmer while listening, and a brief
 * warm smile the head can flash when it acknowledges the visitor.
 *
 * Kept tiny on purpose: the app's shape gains boost smiles ~1.5x, and anything visible as motion
 * reads as twitching rather than life.
 */

import type { ArkitBlendshape } from './arkitMapping'
import type { GazeMode } from './eyeMotion'

type Weights = Partial<Record<ArkitBlendshape, number>>

// Resting smile per mode; while speaking the voice model drives the mouth, so stay out of its way
const RESTING_SMILE: Record<GazeMode, number> = { Idle: 0.04, Listening: 0.07, Thinking: 0.02, Responding: 0 }
// Drift amplitude per shape, and its speed: a period of several seconds
const DRIFT: [ArkitBlendshape, number][] = [
  ['mouthSmileLeft', 0.03],
  ['mouthSmileRight', 0.03],
  ['cheekSquintLeft', 0.02],
  ['cheekSquintRight', 0.02],
  ['browInnerUp', 0.035],
  ['browOuterUpLeft', 0.025],
  ['browOuterUpRight', 0.025],
  ['mouthPressLeft', 0.02],
  ['mouthPressRight', 0.02]
]
const DRIFT_HZ = [0.07, 0.2] as const
// While the voice drives the face, drift only this much
const SPEAKING_SHARE = 0.3
// The acknowledging smile: rise, hold and fade (ms), and how strong
const WARM_MS = 1400
const WARM_SMILE = 0.16

export interface FaceDriftState {
  /** Per shape: two sine components at unrelated frequencies and phases, so it never visibly repeats */
  waves: { hz: [number, number]; phase: [number, number] }[]
  smile: number
  warmStart: number
}

const rand = (min: number, max: number) => min + Math.random() * (max - min)

export const createFaceDrift = (): FaceDriftState => ({
  waves: DRIFT.map(() => ({
    hz: [rand(...DRIFT_HZ), rand(...DRIFT_HZ)],
    phase: [rand(0, 2 * Math.PI), rand(0, 2 * Math.PI)]
  })),
  smile: 0,
  warmStart: -Infinity
})

/** A brief warm smile, e.g. with a listener nod. */
export const warmSmile = (state: FaceDriftState, now: number) => {
  state.warmStart = now
}

/** Weights to add to this frame; `now` in ms, `delta` in s, `speaking` while the voice drives the face. */
export const updateFaceDrift = (state: FaceDriftState, mode: GazeMode, now: number, delta: number, speaking: boolean): Weights => {
  const t = now / 1000
  const share = speaking ? SPEAKING_SHARE : 1
  // Ease between resting smiles over ~1s so mode changes don't snap
  state.smile += (RESTING_SMILE[mode] - state.smile) * (1 - Math.exp(-delta / 1))
  const u = (now - state.warmStart) / WARM_MS
  const warm = u >= 0 && u < 1 ? WARM_SMILE * Math.sin(u * Math.PI) ** 2 : 0

  const out: Weights = {}
  DRIFT.forEach(([name, amount], i) => {
    const { hz, phase } = state.waves[i]
    // 0..1, centred at 0.5: drift both up and down from the resting value without going negative
    const wave = 0.5 + 0.25 * (Math.sin(2 * Math.PI * hz[0] * t + phase[0]) + Math.sin(2 * Math.PI * hz[1] * t + phase[1]))
    out[name] = amount * wave * share
  })
  for (const side of ['Left', 'Right'] as const) {
    out[`mouthSmile${side}`] = (out[`mouthSmile${side}`] ?? 0) + state.smile + warm
    out[`cheekSquint${side}`] = (out[`cheekSquint${side}`] ?? 0) + 0.5 * warm
  }
  return out
}
