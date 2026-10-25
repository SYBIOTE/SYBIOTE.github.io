/**
 * Lips timed by the voice's own phonemes (Inworld returns them with each clip, see api/tts.ts).
 *
 * The audio model barely moves the jaw for this voice and hardly tells an "m" from an "ah": measured
 * on test phrases, the lips stayed ~3mm apart on m/b/p and opened only ~5mm on open vowels. So the
 * phonemes set the mouth's shape (jaw, closures, rounding) and the model's own mouth motion stays on
 * top at a fifth of its strength, for texture; everything else it drives (brows, cheeks, smile) is
 * left as it is. Same test phrases: lips meet on m/b/p (~0.8mm), vowels open ~8mm (up to 12mm), o/w
 * round clearly against ee, and the mouth opens and closes about once per syllable (~5 times a second).
 *
 * Without the model (phones, slower computers) the phonemes alone give the clip its face frames.
 */

import type { ExpressionTrack } from './audio2expression'
import { findCues } from './coSpeech'
import { A2E_CHANNELS, A2E_FPS, CHANNELS, frameVolume } from './postprocess'

export interface Phone {
  /** Inworld viseme: bmp, aei, o, ee, cdgknstxyz, th, l, r, qw, fv, or sil */
  viseme: string
  start: number
  duration: number
}

type Pose = Partial<Record<(typeof A2E_CHANNELS)[number], number>>

// Mouth pose per viseme, in ARKit weights. On the LAM head jawOpen parts the lips ~37mm per unit
const POSES: Record<string, Pose> = {
  sil: {},
  bmp: { mouthPressLeft: 0.45, mouthPressRight: 0.45, mouthRollLower: 0.15, mouthRollUpper: 0.1 },
  aei: { jawOpen: 0.34, mouthLowerDownLeft: 0.25, mouthLowerDownRight: 0.25, mouthStretchLeft: 0.1, mouthStretchRight: 0.1 },
  o: { jawOpen: 0.24, mouthFunnel: 0.45, mouthPucker: 0.35 },
  ee: { jawOpen: 0.15, mouthStretchLeft: 0.45, mouthStretchRight: 0.45, mouthSmileLeft: 0.12, mouthSmileRight: 0.12 },
  cdgknstxyz: { jawOpen: 0.12, mouthStretchLeft: 0.2, mouthStretchRight: 0.2 },
  th: { jawOpen: 0.13, mouthStretchLeft: 0.1, mouthStretchRight: 0.1 },
  l: { jawOpen: 0.18, mouthStretchLeft: 0.1, mouthStretchRight: 0.1 },
  r: { jawOpen: 0.12, mouthPucker: 0.3, mouthFunnel: 0.25 },
  qw: { jawOpen: 0.05, mouthPucker: 0.75, mouthFunnel: 0.3 },
  fv: { jawOpen: 0.05, mouthRollLower: 0.5, mouthUpperUpLeft: 0.15, mouthUpperUpRight: 0.15 }
}

// The channels the phonemes take over; the model keeps a share of its own motion on these
const MOUTH = [
  'jawOpen', 'mouthClose', 'mouthFunnel', 'mouthPucker', 'mouthLowerDownLeft', 'mouthLowerDownRight', 'mouthUpperUpLeft',
  'mouthUpperUpRight', 'mouthPressLeft', 'mouthPressRight', 'mouthRollLower', 'mouthRollUpper', 'mouthShrugLower',
  'mouthShrugUpper', 'mouthStretchLeft', 'mouthStretchRight'
] as const
const MOUTH_INDEX = MOUTH.map((name) => A2E_CHANNELS.indexOf(name))
// The shapes that part the lips, which a closure keeps down
const OPENING_INDEX = ['jawOpen', 'mouthLowerDownLeft', 'mouthLowerDownRight', 'mouthUpperUpLeft', 'mouthUpperUpRight', 'mouthFunnel', 'mouthPucker'].map((name) =>
  A2E_CHANNELS.indexOf(name as (typeof A2E_CHANNELS)[number])
)
const MODEL_SHARE = 0.2
// Overall strength of the mouth's movement (1 = the poses as tuned on the test phrases)
const MOUTH_STRENGTH = 0.7
// The model holds this one high all through speech, and on this head it parts the lips: none of it
const NO_MODEL_SHARE = new Set(['mouthShrugUpper'])
// Mouths take the shape of a sound slightly before it's heard
const LEAD_S = 0.04
// Share of each phone its pose is held over (m/b/p hold the closure almost throughout, so it shows)
const HOLD = [0.35, 0.65]
const CLOSURE_HOLD = [0.15, 0.85]
// Quick consonants get no pose of their own: the jaw glides through them from vowel to vowel, as real
// mouths do. Giving each one a target made the mouth open and close more often than there are syllables
const GLIDE_THROUGH = new Set(['cdgknstxyz', 'th', 'l', 'r'])
// Silences shorter than this (Inworld marks every word boundary with one) aren't a pause to rest the mouth for
const MIN_PAUSE_S = 0.08
// Smoothing of the mouth's motion (time constant), run forwards and backwards so it doesn't lag the voice
const SMOOTHING_S = 0.035

/** Parses the X-Phones header ("bmp 0.00 0.13;ee 0.13 0.04;..."); [] if missing or malformed */
export const parsePhones = (header: string | null): Phone[] => {
  if (!header) return []
  const phones: Phone[] = []
  for (const entry of header.split(';')) {
    const [viseme, start, duration] = entry.trim().split(' ')
    const s = Number(start), d = Number(duration)
    if (!viseme || !Number.isFinite(s) || !Number.isFinite(d)) return []
    phones.push({ viseme, start: s, duration: d })
  }
  return phones
}

interface Key {
  t: number
  pose: Pose
}

const keysFor = (phones: Phone[]): Key[] =>
  phones.flatMap((p) => {
    if (GLIDE_THROUGH.has(p.viseme) || (p.viseme === 'sil' && p.duration < MIN_PAUSE_S)) return []
    const pose = POSES[p.viseme] ?? POSES.cdgknstxyz
    return (p.viseme === 'bmp' ? CLOSURE_HOLD : HOLD).map((h) => ({ t: p.start + p.duration * h - LEAD_S, pose }))
  })

/** Zero-phase exponential smoothing of one channel, in place */
const smoothChannel = (frames: Float32Array, frameCount: number, channel: number) => {
  // Share of the way each frame moves towards its target
  const a = 1 - Math.exp(-1 / (A2E_FPS * SMOOTHING_S))
  for (let f = 1; f < frameCount; f++) {
    const prev = frames[(f - 1) * CHANNELS + channel]
    frames[f * CHANNELS + channel] = prev + a * (frames[f * CHANNELS + channel] - prev)
  }
  for (let f = frameCount - 2; f >= 0; f--) {
    const next = frames[(f + 1) * CHANNELS + channel]
    frames[f * CHANNELS + channel] = next + a * (frames[f * CHANNELS + channel] - next)
  }
}

/**
 * Overwrites the mouth channels of `frames` ([frameCount * 52], A2E order, 30fps) with the phonemes'
 * poses, keeping MODEL_SHARE of what was there. Pass zeroed frames to get the phonemes alone.
 */
export const applyPhonemeMouth = (frames: Float32Array, phones: Phone[], modelShare = MODEL_SHARE) => {
  const keys = keysFor(phones)
  if (!keys.length) return frames
  const frameCount = Math.floor(frames.length / CHANNELS)
  let next = 0
  for (let f = 0; f < frameCount; f++) {
    const t = f / A2E_FPS
    while (next < keys.length && keys[next].t <= t) next++
    const a = keys[Math.max(0, next - 1)]
    const b = keys[Math.min(keys.length - 1, next)]
    const u = a === b ? 0 : Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t)))
    const s = u * u * (3 - 2 * u)
    for (let m = 0; m < MOUTH.length; m++) {
      const name = MOUTH[m]
      const c = f * CHANNELS + MOUTH_INDEX[m]
      const pose = (a.pose[name] ?? 0) * (1 - s) + (b.pose[name] ?? 0) * s
      const model = NO_MODEL_SHARE.has(name) ? 0 : modelShare * frames[c]
      frames[c] = Math.min(1, (pose + model) * MOUTH_STRENGTH)
    }
  }
  // Smooth, but never at the expense of m/b/p: through each closure the lips stay at least as shut as unsmoothed
  const unsmoothed = frames.slice()
  for (const channel of MOUTH_INDEX) smoothChannel(frames, frameCount, channel)
  for (const p of phones) {
    if (p.viseme !== 'bmp') continue
    const from = Math.max(0, Math.floor((p.start + p.duration * CLOSURE_HOLD[0] - LEAD_S) * A2E_FPS))
    const to = Math.min(frameCount - 1, Math.ceil((p.start + p.duration * CLOSURE_HOLD[1] - LEAD_S) * A2E_FPS))
    for (let f = from; f <= to; f++)
      for (const channel of OPENING_INDEX) frames[f * CHANNELS + channel] = Math.min(frames[f * CHANNELS + channel], unsmoothed[f * CHANNELS + channel])
  }
  return frames
}

/**
 * The clip's face frames with phoneme-timed lips: on top of the audio model's track when there is
 * one, else from the phonemes alone (cues for gaze, blinks and nods from the clip's loudness).
 */
export const withPhonemeMouth = (track: ExpressionTrack | null, clip: AudioBuffer, phones: Phone[]): ExpressionTrack | null => {
  if (!phones.length) return track
  if (track) return { ...track, frames: applyPhonemeMouth(Float32Array.from(track.frames), phones) }
  const frameCount = Math.ceil(clip.duration * A2E_FPS)
  const volume = frameVolume(clip.getChannelData(0), clip.sampleRate, frameCount)
  return {
    frames: applyPhonemeMouth(new Float32Array(frameCount * CHANNELS), phones, 0),
    frameCount,
    fps: A2E_FPS,
    cues: findCues(volume)
  }
}
