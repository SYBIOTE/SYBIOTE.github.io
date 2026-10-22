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

export interface SpeechCueHits {
  /** The voice went quiet mid-clip */
  pause: boolean
  /** A phrase started (the first word, or speech resuming after a pause) */
  phrase: boolean
  /** A stressed moment */
  accent: boolean
  /** The clip finished */
  end: boolean
}

const NO_CUES: SpeechCueHits = { pause: false, phrase: false, accent: false, end: false }

/** Which of the playing clip's cues fell between `since` and `now` (performance.now() ms). */
export const speechCuesBetween = (since: number, now: number): SpeechCueHits => {
  if (!active) return NO_CUES
  const from = (since - active.startedAt) / 1000
  const to = (now - active.startedAt) / 1000
  const hit = (t: number) => t > from && t <= to
  const { cues } = active.track
  return {
    pause: cues.pauses.some(hit),
    phrase: cues.phrases.some(hit),
    accent: cues.accents.some(hit),
    end: hit(cues.end)
  }
}

// Dev-only: inspect from the console / tests
if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).__speechFace = { sample: sampleSpeechFace, isActive: () => active !== null }
}
