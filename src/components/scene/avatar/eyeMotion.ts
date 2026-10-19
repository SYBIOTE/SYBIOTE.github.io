/**
 * Procedural eye behaviour so the head doesn't stare like a statue:
 * - listening / speaking: steady eye contact with small micro-saccades
 * - thinking: a glance up and to the side (what people do while recalling)
 * - idle: occasional glances away that return to the camera
 *
 * Gaze is x (-1 left .. 1 right, from the viewer's side) and y (-1 down .. 1 up).
 */

import type { ArkitBlendshape } from './arkitMapping'

export type GazeMode = 'Idle' | 'Listening' | 'Thinking' | 'Responding'

export interface EyeMotionState {
  x: number
  y: number
  targetX: number
  targetY: number
  nextShiftAt: number
  thinkSide: number
}

export const createEyeMotion = (): EyeMotionState => ({ x: 0, y: 0, targetX: 0, targetY: 0, nextShiftAt: 0, thinkSide: 1 })

const rand = (min: number, max: number) => min + Math.random() * (max - min)

/** Advances the gaze; `now` in ms, `delta` in seconds. */
export const updateEyeMotion = (state: EyeMotionState, mode: GazeMode, now: number, delta: number): void => {
  if (now >= state.nextShiftAt) {
    if (mode === 'Thinking') {
      // Hold one side for the whole think, up and away from the viewer
      state.targetX = state.thinkSide * rand(0.35, 0.5)
      state.targetY = rand(0.3, 0.45)
      state.nextShiftAt = now + rand(900, 1600)
    } else if (mode === 'Idle' && Math.random() < 0.35) {
      // An occasional glance away
      state.targetX = rand(-0.4, 0.4)
      state.targetY = rand(-0.15, 0.2)
      state.nextShiftAt = now + rand(600, 1200)
    } else {
      // Eye contact with tiny saccades
      state.targetX = rand(-0.06, 0.06)
      state.targetY = rand(-0.04, 0.05)
      state.nextShiftAt = now + rand(700, 2200)
      state.thinkSide = Math.random() < 0.5 ? -1 : 1
    }
  }
  // Saccades are fast: close most of the gap within ~60ms
  const k = 1 - Math.exp(-delta / 0.06)
  state.x += (state.targetX - state.x) * k
  state.y += (state.targetY - state.y) * k
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
