/**
 * Procedural eye behaviour so the head doesn't stare like a statue:
 * - speaking: eye contact, with glances away timed to the speech (see avertGaze): people look away
 *   as they start a phrase (thinking what to say) and during pauses (holding the floor), then look
 *   back as they finish (Andrist et al., "Conversational Gaze Aversion for Virtual Agents", IVA 2013)
 * - listening: steady eye contact with micro-saccades, broken by a short glance every few seconds,
 *   since unbroken eye contact past ~3–5s starts to feel like staring
 * - thinking: a glance up and to the side (what people do while recalling)
 * - idle: occasional glances away that return to the camera
 *
 * Gaze is x (-1 left .. 1 right, from the viewer's side) and y (-1 down .. 1 up).
 */

import type { ArkitBlendshape } from './arkitMapping'

export type GazeMode = 'Idle' | 'Listening' | 'Thinking' | 'Responding'

/**
 * - think: up and to the side, as a phrase starts
 * - hold: aside during a pause in speech, so the listener knows more is coming
 * - intimacy: a small, short glance down or aside to break eye contact while listening
 */
export type Aversion = 'think' | 'hold' | 'intimacy'

export interface EyeMotionState {
  x: number
  y: number
  targetX: number
  targetY: number
  nextShiftAt: number
  thinkSide: number
  /** When eye contact (re)started, for breaking it while listening */
  contactSince: number
  /** Until when the eyes are away on purpose; random shifts wait for it */
  avertedUntil: number
}

export const createEyeMotion = (): EyeMotionState => ({
  x: 0,
  y: 0,
  targetX: 0,
  targetY: 0,
  nextShiftAt: 0,
  thinkSide: 1,
  contactSince: 0,
  avertedUntil: -Infinity
})

const rand = (min: number, max: number) => min + Math.random() * (max - min)
const side = () => (Math.random() < 0.5 ? -1 : 1)

// How long listening eye contact lasts before a short glance away (ms)
const CONTACT_HOLD = [3500, 5500] as const

// Where and how long each kind of aversion looks (gaze units, ms)
const AVERSIONS: Record<Aversion, { x: [number, number]; y: [number, number]; ms: [number, number] }> = {
  think: { x: [0.25, 0.45], y: [0.12, 0.35], ms: [900, 2000] },
  hold: { x: [0.2, 0.35], y: [-0.05, 0.15], ms: [700, 1500] },
  intimacy: { x: [0.1, 0.22], y: [-0.14, 0], ms: [400, 900] }
}

const setTarget = (state: EyeMotionState, x: number, y: number) => {
  const jump = Math.hypot(x - state.x, y - state.y)
  state.targetX = x
  state.targetY = y
  return jump
}

/** Looks away on purpose; returns how far the eyes jump (so a blink can come with it). */
export const avertGaze = (state: EyeMotionState, now: number, kind: Aversion): number => {
  const { x, y, ms } = AVERSIONS[kind]
  const duration = rand(...ms)
  state.avertedUntil = now + duration
  state.nextShiftAt = now + duration
  return setTarget(state, side() * rand(...x), rand(...y))
}

/** Back to eye contact now (e.g. as a sentence ends, handing the turn over). */
export const lookAtViewer = (state: EyeMotionState, now: number): number => {
  state.avertedUntil = -Infinity
  state.contactSince = now
  state.nextShiftAt = now + rand(700, 2200)
  return setTarget(state, rand(-0.06, 0.06), rand(-0.04, 0.05))
}

/**
 * Advances the gaze; `now` in ms, `delta` in seconds. Returns how far the eyes are about to jump when
 * a new target is picked (0 otherwise), so big glances can bring a blink with them.
 */
export const updateEyeMotion = (state: EyeMotionState, mode: GazeMode, now: number, delta: number): number => {
  let jump = 0
  if (now >= state.nextShiftAt) {
    const wasAverted = state.avertedUntil > -Infinity
    state.avertedUntil = -Infinity
    if (mode === 'Thinking') {
      // Hold one side for the whole think, up and away from the viewer
      jump = setTarget(state, state.thinkSide * rand(0.35, 0.5), rand(0.3, 0.45))
      state.nextShiftAt = now + rand(900, 1600)
    } else if (mode === 'Idle' && Math.random() < 0.35) {
      // An occasional glance away
      jump = setTarget(state, rand(-0.4, 0.4), rand(-0.15, 0.2))
      state.nextShiftAt = now + rand(600, 1200)
    } else if (mode === 'Listening' && !wasAverted && now - state.contactSince > rand(...CONTACT_HOLD)) {
      jump = avertGaze(state, now, 'intimacy')
    } else {
      // Eye contact with tiny saccades
      if (wasAverted || Math.hypot(state.targetX, state.targetY) > 0.1) state.contactSince = now
      jump = setTarget(state, rand(-0.06, 0.06), rand(-0.04, 0.05))
      state.nextShiftAt = now + rand(700, 2200)
      state.thinkSide = side()
    }
  }
  // Saccades are fast: close most of the gap within ~60ms
  const k = 1 - Math.exp(-delta / 0.06)
  state.x += (state.targetX - state.x) * k
  state.y += (state.targetY - state.y) * k
  return jump
}

/** Gaze as ARKit eye-look weights. */
export const gazeToArkit = ({ x, y }: EyeMotionState): Partial<Record<ArkitBlendshape, number>> => {
  const right = Math.max(0, x)
  const left = Math.max(0, -x)
  const up = Math.max(0, y)
  const down = Math.max(0, -y)
  return {
    // Looking towards the viewer's right is the avatar's left
    eyeLookOutLeft: right,
    eyeLookInRight: right,
    eyeLookOutRight: left,
    eyeLookInLeft: left,
    eyeLookUpLeft: up,
    eyeLookUpRight: up,
    eyeLookDownLeft: down,
    eyeLookDownRight: down
  }
}
