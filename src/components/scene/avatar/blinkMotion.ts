/**
 * Blinks that look like a real person's:
 * - the lid shape over time comes from blinks captured on real faces (LAM_Audio2Expression's
 *   BLINK_PATTERNS, Apache-2.0): the lid snaps shut in a frame or two and reopens more slowly
 * - each blink is a little different: one of four captured curves, at 80–100% strength
 * - timing follows what the face is doing: blinks land on pauses in speech and on big glances,
 *   rather than only on a timer, and now and then come as a double blink
 */

import type { GazeMode } from './eyeMotion'

// Upstream's curves, one value per frame at 30fps
const PATTERNS = [
  [0.365, 0.95, 0.956, 0.917, 0.367, 0.119, 0.025],
  [0.235, 0.91, 0.945, 0.778, 0.191, 0.235, 0.089],
  [0.87, 0.95, 0.949, 0.696, 0.191, 0.073, 0.007],
  [0, 0.557, 0.953, 0.942, 0.426, 0.148, 0.018]
]
const FRAME_MS = 1000 / 30
const DURATION_MS = PATTERNS[0].length * FRAME_MS
const STRENGTH = [0.8, 1] as const

// Time between spontaneous blinks (ms). People blink most while talking, less while listening closely
const INTERVALS: Record<GazeMode, readonly [number, number]> = {
  Responding: [1800, 4500],
  Listening: [2500, 6000],
  Thinking: [1500, 4000],
  Idle: [2000, 6000]
}
// Cued blinks (pauses, glances) need this long since the last one, so they don't cluster
const MIN_GAP_MS = 700
const DOUBLE_CHANCE = 0.08
const DOUBLE_GAP_MS = 90

export interface BlinkMotionState {
  /** When the current blink started (ms), or -Infinity */
  start: number
  pattern: number[]
  strength: number
  nextAt: number
  /** A second blink queued right after this one */
  doubleAt: number
}

const rand = (min: number, max: number) => min + Math.random() * (max - min)

export const createBlinkMotion = (): BlinkMotionState => ({
  start: -Infinity,
  pattern: PATTERNS[0],
  strength: 1,
  nextAt: performance.now() + rand(1000, 3000),
  doubleAt: Infinity
})

const begin = (state: BlinkMotionState, now: number, mode: GazeMode) => {
  state.start = now
  state.pattern = PATTERNS[Math.floor(Math.random() * PATTERNS.length)]
  state.strength = rand(...STRENGTH)
  state.nextAt = now + DURATION_MS + rand(...INTERVALS[mode])
  state.doubleAt = Math.random() < DOUBLE_CHANCE ? now + DURATION_MS + DOUBLE_GAP_MS : Infinity
}

/** Blink now with probability `chance`, unless the eyes blinked very recently. */
export const cueBlink = (state: BlinkMotionState, now: number, mode: GazeMode, chance: number) => {
  if (now - state.start < MIN_GAP_MS || Math.random() >= chance) return
  begin(state, now, mode)
}

/** Advances the blink and returns the eyelid weight (0 open .. 1 shut); `now` in ms. */
export const updateBlinkMotion = (state: BlinkMotionState, now: number, mode: GazeMode): number => {
  if (now >= state.doubleAt) begin(state, now, mode)
  else if (now >= state.nextAt) begin(state, now, mode)
  const t = (now - state.start) / FRAME_MS
  if (!(t >= 0) || t >= state.pattern.length) return 0
  // Between captured frames, interpolate so it stays smooth at any frame rate
  const i = Math.floor(t)
  const next = state.pattern[i + 1] ?? 0
  return (state.pattern[i] + (next - state.pattern[i]) * (t - i)) * state.strength
}
