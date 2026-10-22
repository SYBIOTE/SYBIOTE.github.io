/**
 * Head gestures layered on top of the renderer's built-in head motion clips:
 * - beat nods on stressed words while speaking (head motion clusters on pitch accents: Busso et al. 2007)
 * - listener nods when the visitor pauses: a short nod, a double nod, or a slow acknowledging one
 *   (the types from Kato et al., "Real-time Generation of Various Types of Nodding", ICMI 2025)
 * - the head following the eyes a little on big glances, as people turn their head with their gaze
 *
 * Angles in radians: pitch > 0 nods down, yaw > 0 turns towards the viewer's right, roll tilts.
 */

import { Quaternion, Vector3, type Bone } from 'three'

export type NodKind = 'beat' | 'short' | 'double' | 'long'

interface Gesture {
  start: number
  duration: number
  pitch: number
  /** Humps in the nod: 1 for a single nod, 2 for a double nod */
  humps: number
}

export interface HeadMotionState {
  gestures: Gesture[]
  /** Head turn following the gaze, eased */
  followYaw: number
  followPitch: number
  lastGestureAt: number
}

export interface HeadPose {
  pitch: number
  yaw: number
  roll: number
}

const DEG = Math.PI / 180
const rand = (min: number, max: number) => min + Math.random() * (max - min)

// Amplitude (degrees) and duration (ms) of each nod
const NODS: Record<NodKind, { deg: [number, number]; ms: [number, number]; humps: number }> = {
  beat: { deg: [1.2, 2.4], ms: [320, 450], humps: 1 },
  short: { deg: [2.5, 4], ms: [420, 560], humps: 1 },
  double: { deg: [2, 3], ms: [750, 950], humps: 2 },
  long: { deg: [4, 6], ms: [850, 1150], humps: 1 }
}
// Head turn per unit of gaze, and how slowly it follows (the eyes lead, the head catches up)
const FOLLOW_YAW = 6 * DEG
const FOLLOW_PITCH = 3 * DEG
const FOLLOW_SECONDS = 0.35

export const createHeadMotion = (): HeadMotionState => ({ gestures: [], followYaw: 0, followPitch: 0, lastGestureAt: -Infinity })

/** Starts a nod, unless one started less than `minGapMs` ago. Returns whether it started. */
export const nod = (state: HeadMotionState, now: number, kind: NodKind, minGapMs = 700): boolean => {
  if (now - state.lastGestureAt < minGapMs) return false
  const { deg, ms, humps } = NODS[kind]
  state.gestures.push({ start: now, duration: rand(...ms), pitch: rand(...deg) * DEG, humps })
  state.lastGestureAt = now
  return true
}

/** Advances the gestures and returns the extra head rotation for this frame; `now` in ms, `delta` in s. */
export const updateHeadMotion = (state: HeadMotionState, now: number, delta: number, gaze: { x: number; y: number }): HeadPose => {
  const k = 1 - Math.exp(-delta / FOLLOW_SECONDS)
  state.followYaw += (gaze.x * FOLLOW_YAW - state.followYaw) * k
  state.followPitch += (-gaze.y * FOLLOW_PITCH - state.followPitch) * k

  let pitch = state.followPitch
  state.gestures = state.gestures.filter((g) => now - g.start < g.duration)
  for (const g of state.gestures) {
    const u = (now - g.start) / g.duration
    if (u < 0) continue
    // Down and back up; the second hump of a double nod is a little smaller
    const phase = u * g.humps
    const hump = Math.floor(phase)
    pitch += g.pitch * Math.sin((phase - hump) * Math.PI) ** 2 * (hump ? 0.7 : 1)
  }
  return { pitch, yaw: state.followYaw, roll: 0 }
}

interface RendererInternals {
  mixer?: { update: (delta: number) => unknown }
  viewer?: { skinModel?: { skeleton?: { bones: Bone[] } } }
}

/**
 * Applies `getPose()` to the head bone every frame, right after the renderer's animation mixer has
 * posed the skeleton (anything set earlier would be overwritten by the clips). Returns false if the
 * renderer doesn't expose what's needed, in which case the head just keeps its built-in motion.
 */
export const attachHeadMotion = (renderer: unknown, getPose: () => HeadPose): boolean => {
  const internals = renderer as RendererInternals
  const mixer = internals.mixer
  const head = internals.viewer?.skinModel?.skeleton?.bones.find((b) => b.name === 'head')
  if (!mixer || !head?.parent) return false

  const parentWorld = new Quaternion()
  const inParent = new Quaternion()
  const turn = new Quaternion()
  const step = new Quaternion()
  // The clip's own rotation and what we last wrote: three's mixer only writes a bone when the clip's
  // value changes, so on frames it leaves the bone alone we must undo our offset before adding the new one
  const clipRotation = head.quaternion.clone()
  const written = head.quaternion.clone()
  const axis = { x: new Vector3(1, 0, 0), y: new Vector3(0, 1, 0), z: new Vector3(0, 0, 1) }
  const original = mixer.update.bind(mixer)
  mixer.update = (delta: number) => {
    const result = original(delta)
    if (head.quaternion.equals(written)) head.quaternion.copy(clipRotation)
    clipRotation.copy(head.quaternion)
    const { pitch, yaw, roll } = getPose()
    if (pitch || yaw || roll) {
      // The turn is in world axes (the face looks down +z); move it into the head's parent space
      turn
        .setFromAxisAngle(axis.y, yaw)
        .multiply(step.setFromAxisAngle(axis.x, pitch))
        .multiply(step.setFromAxisAngle(axis.z, roll))
      head.parent!.updateWorldMatrix(true, false)
      head.parent!.getWorldQuaternion(parentWorld)
      inParent.copy(parentWorld).invert().multiply(turn).multiply(parentWorld)
      head.quaternion.premultiply(inParent)
    }
    written.copy(head.quaternion)
    return result
  }
  return true
}
