/**
 * Co-speech cues taken from the voice's loudness, on top of the model's face frames.
 *
 * - Brow raises on stressed words, ported from aigc3d/LAM_Audio2Expression models/utils.py
 *   apply_random_brow_movement (Apache-2.0): two brow curves captured from a real face, one per
 *   ~5s of speech, peaking on the loudest moment of a loud stretch.
 * - Pauses: where the voice goes quiet, so the avatar can blink there like people do.
 *
 * Frames are a flat Float32Array of [frameCount * 52] in A2E_CHANNELS order.
 */

import { A2E_CHANNELS, A2E_FPS, CHANNELS } from './postprocess'

// Upstream's curves, 30fps, columns: browDownLeft, browDownRight, browInnerUp, browOuterUpLeft, browOuterUpRight
const BROW_LONG = [
  [0.056, 0.057, 0.08, 0, 0], [0.008, 0.009, 0.122, 0, 0], [0, 0, 0.149, 0.045, 0.043], [0, 0, 0.18, 0.09, 0.087],
  [0, 0, 0.205, 0.128, 0.125], [0, 0, 0.211, 0.137, 0.133], [0, 0, 0.209, 0.139, 0.136], [0, 0, 0.204, 0.14, 0.137],
  [0, 0, 0.197, 0.141, 0.138], [0, 0, 0.203, 0.173, 0.17], [0, 0, 0.22, 0.202, 0.198], [0, 0, 0.239, 0.219, 0.215],
  [0, 0, 0.257, 0.238, 0.234], [0, 0, 0.341, 0.279, 0.277], [0, 0, 0.453, 0.35, 0.349], [0, 0, 0.481, 0.369, 0.368],
  [0, 0, 0.478, 0.364, 0.361], [0, 0, 0.462, 0.339, 0.336], [0, 0, 0.453, 0.332, 0.329], [0, 0, 0.41, 0.296, 0.295],
  [0, 0, 0.356, 0.234, 0.232], [0, 0, 0.309, 0.178, 0.176], [0, 0, 0.253, 0.107, 0.106], [0, 0, 0.187, 0.033, 0.032],
  [0.023, 0.024, 0.157, 0, 0]
]
const BROW_FLICK = [
  [0, 0, 0.098, 0.059, 0.05], [0, 0, 0.098, 0.077, 0.016], [0, 0, 0.111, 0.103, 0.042], [0, 0, 0.269, 0.159, 0.158],
  [0, 0, 0.422, 0.27, 0.27], [0, 0, 0.34, 0.216, 0.216], [0, 0, 0.273, 0.172, 0.171], [0, 0, 0.26, 0.157, 0.156],
  [0, 0, 0.229, 0.118, 0.118], [0, 0, 0.145, 0.064, 0.064]
]
const BROW_COLUMNS = ['browDownLeft', 'browDownRight', 'browInnerUp', 'browOuterUpLeft', 'browOuterUpRight'].map((name) =>
  A2E_CHANNELS.indexOf(name as (typeof A2E_CHANNELS)[number])
)
const OUTER_LEFT = 3
const OUTER_RIGHT = 4

// One raise per this many frames (upstream's FRAME_SEGMENT, 5s)
const SEGMENT = 150
// Loud stretches shorter than this get no raise; longer than HOLD_FROM get the long raise, held
const MIN_REGION = 6
const HOLD_FROM = 10
// Cap on the hold, so a long loud phrase doesn't leave the brows parked up
const MAX_HOLD = 20
const STRENGTH = [0.7, 1.3] as const
// Upstream uses a fixed loudness (0.08 RMS) on its own recordings; TTS voices vary in level, so
// "loud" here is relative: this share of the clip's 90th-percentile loudness
const LOUD_SHARE = 0.75
// The two brows don't rise exactly together on a real face: outer brows differ by up to this share
const ASYMMETRY = 0.12

// Pauses: quieter than this share of the 90th-percentile loudness, for at least MIN_PAUSE frames
const QUIET_SHARE = 0.12
const MIN_PAUSE = 5
// Stressed moments closer together than this (frames) count as one
const MIN_ACCENT_GAP = 15

const rand = (random: () => number, min: number, max: number) => min + random() * (max - min)

const percentile = (values: Float32Array, q: number) => {
  const sorted = Float32Array.from(values).sort()
  return sorted.length ? sorted[Math.floor(q * (sorted.length - 1))] : 0
}

/** Runs of frames where `test` holds, as [start, end] (inclusive). */
const runs = (count: number, test: (f: number) => boolean): [number, number][] => {
  const out: [number, number][] = []
  for (let f = 0; f < count; f++) {
    if (!test(f)) continue
    const start = f
    while (f + 1 < count && test(f + 1)) f++
    out.push([start, f])
  }
  return out
}

/** Adds brow raises on stressed words, in place. `volume` is per-frame RMS (frameVolume). */
export const addBrowRaises = (frames: Float32Array, volume: Float32Array, random: () => number = Math.random) => {
  const frameCount = Math.min(Math.floor(frames.length / CHANNELS), volume.length)
  const loud = LOUD_SHARE * percentile(volume.subarray(0, frameCount), 0.9)
  if (!(loud > 0)) return frames

  const add = (frame: number, row: number[], strength: number, left: number, right: number) => {
    for (let c = 0; c < BROW_COLUMNS.length; c++) {
      const side = c === OUTER_LEFT ? left : c === OUTER_RIGHT ? right : 1
      const i = frame * CHANNELS + BROW_COLUMNS[c]
      frames[i] = Math.min(1, frames[i] + row[c] * strength * side)
    }
  }

  for (let segStart = 0; segStart < frameCount; segStart += SEGMENT) {
    const segEnd = Math.min(segStart + SEGMENT, frameCount)
    const regions = runs(segEnd - segStart, (f) => volume[segStart + f] > loud).filter(([s, e]) => e - s + 1 >= MIN_REGION)
    if (!regions.length) continue
    const [start, end] = regions[Math.floor(random() * regions.length)]
    const length = end - start + 1
    const strength = rand(random, ...STRENGTH)
    const tilt = rand(random, -ASYMMETRY, ASYMMETRY)
    const left = 1 + tilt
    const right = 1 - tilt
    const curve = random() < 0.5 ? BROW_LONG : BROW_FLICK

    if (length > HOLD_FROM) {
      // Long stretch: rise so the peak lands on the loudest frame, hold while it stays loud, then ease back down
      const peak = curve.reduce((best, row, i) => (row[2] > curve[best][2] ? i : best), 0)
      let loudest = start
      for (let f = start; f <= end; f++) if (volume[segStart + f] > volume[segStart + loudest]) loudest = f
      const peakFrame = segStart + loudest
      const hold = Math.min(MAX_HOLD, Math.max(0, end - loudest))
      let f = Math.max(segStart, peakFrame - peak)
      const rows = [...curve.slice(0, peak + 1), ...Array<number[]>(hold).fill(curve[peak]), ...curve.slice(peak + 1)]
      for (const row of rows.slice(f - (peakFrame - peak))) {
        if (f >= segEnd) break
        add(f++, row, strength, left, right)
      }
    } else {
      // Short stretch: the whole curve, centred on it
      const at = Math.max(segStart, Math.min(segStart + start + Math.floor((length - curve.length) / 2), segEnd - curve.length))
      if (at + curve.length <= segEnd) curve.forEach((row, i) => add(at + i, row, strength, left, right))
    }
  }
  return frames
}

export interface SpeechCues {
  /** Where the voice goes quiet mid-clip (not the silence before the first word) */
  pauses: number[]
  /** Where each phrase starts: the first word, and wherever the voice resumes after a pause */
  phrases: number[]
  /** Stressed moments: loudness peaks, at least MIN_ACCENT_GAP apart */
  accents: number[]
  /** The clip's length */
  end: number
}

/** Timing cues in seconds from the clip's start, for the gaze, blinks and head to follow the voice. */
export const findCues = (volume: Float32Array): SpeechCues => {
  const ref = percentile(volume, 0.9)
  const quiet = QUIET_SHARE * ref
  const silences = runs(volume.length, (f) => volume[f] <= quiet)
  const gaps = silences.filter(([start, end]) => start > 0 && end - start + 1 >= MIN_PAUSE && end < volume.length - 1)
  const firstWord = volume.findIndex((v) => v > quiet)
  const phrases = firstWord < 0 ? [] : [firstWord, ...gaps.map(([, end]) => end + 1)]

  // Peaks of the loudness, smoothed over ~100ms so single syllables don't each count
  const smooth = volume.map((_, f) => (volume[Math.max(0, f - 1)] + volume[f] + volume[Math.min(volume.length - 1, f + 1)]) / 3)
  const accents: number[] = []
  const loud = LOUD_SHARE * ref
  for (let f = 1; f + 1 < smooth.length; f++) {
    if (smooth[f] < loud || smooth[f] < smooth[f - 1] || smooth[f] <= smooth[f + 1]) continue
    const last = accents[accents.length - 1]
    if (last !== undefined && f - last < MIN_ACCENT_GAP) {
      if (smooth[f] > smooth[last]) accents[accents.length - 1] = f
      continue
    }
    accents.push(f)
  }

  const toSeconds = (f: number) => f / A2E_FPS
  return {
    pauses: gaps.map(([start]) => toSeconds(start)),
    phrases: phrases.map(toSeconds),
    accents: accents.map(toSeconds),
    end: toSeconds(volume.length)
  }
}
