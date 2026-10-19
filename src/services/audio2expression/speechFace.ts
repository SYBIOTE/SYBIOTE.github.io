/**
 * Hands the face frames of the clip that's playing right now to the avatar renderer.
 * Frames are indexed by playback time, so face and voice can't drift apart.
 */
import type { ExpressionTrack } from './audio2expression'
import { CHANNELS } from './postprocess'

let active: { track: ExpressionTrack; startedAt: number } | null = null

/** startedAt: performance.now() when the clip's audio began playing */
export const startSpeechFace = (track: ExpressionTrack, startedAt: number) => {
  active = { track, startedAt }
}

export const stopSpeechFace = () => {
  active = null
}

/** The 52 ARKit weights for `now`, or null when no audio-driven frames cover this moment. */
export const sampleSpeechFace = (now: number): Float32Array | null => {
  if (!active) return null
  const { track, startedAt } = active
  const frame = Math.floor(((now - startedAt) / 1000) * track.fps)
  if (frame < 0 || frame >= track.frameCount) return null
  return track.frames.subarray(frame * CHANNELS, (frame + 1) * CHANNELS)
}

// Dev-only: inspect from the console / tests
if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).__speechFace = { sample: sampleSpeechFace, isActive: () => active !== null }
}
