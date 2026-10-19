/**
 * Post-processing for LAM Audio2Expression output, ported from
 * aigc3d/LAM_Audio2Expression models/utils.py (Apache-2.0). Same order as the original:
 * silence mouth smoothing -> blend in from neutral -> Savitzky-Golay -> left/right symmetry.
 * The original's random eye blinks are left out: the avatar has its own blink system.
 *
 * Frames are a flat Float32Array of [frameCount * 52] in A2E_CHANNELS order.
 */

/** Output channel order of the model (LAM's ARKitBlendShape list). */
export const A2E_CHANNELS = [
  'browDownLeft', 'browDownRight', 'browInnerUp', 'browOuterUpLeft', 'browOuterUpRight', 'cheekPuff',
  'cheekSquintLeft', 'cheekSquintRight', 'eyeBlinkLeft', 'eyeBlinkRight', 'eyeLookDownLeft', 'eyeLookDownRight',
  'eyeLookInLeft', 'eyeLookInRight', 'eyeLookOutLeft', 'eyeLookOutRight', 'eyeLookUpLeft', 'eyeLookUpRight',
  'eyeSquintLeft', 'eyeSquintRight', 'eyeWideLeft', 'eyeWideRight', 'jawForward', 'jawLeft', 'jawOpen', 'jawRight',
  'mouthClose', 'mouthDimpleLeft', 'mouthDimpleRight', 'mouthFrownLeft', 'mouthFrownRight', 'mouthFunnel', 'mouthLeft',
  'mouthLowerDownLeft', 'mouthLowerDownRight', 'mouthPressLeft', 'mouthPressRight', 'mouthPucker', 'mouthRight',
  'mouthRollLower', 'mouthRollUpper', 'mouthShrugLower', 'mouthShrugUpper', 'mouthSmileLeft', 'mouthSmileRight',
  'mouthStretchLeft', 'mouthStretchRight', 'mouthUpperUpLeft', 'mouthUpperUpRight', 'noseSneerLeft', 'noseSneerRight',
  'tongueOut'
] as const

export const CHANNELS = A2E_CHANNELS.length // 52
export const A2E_FPS = 30
export const A2E_SAMPLE_RATE = 16000

const index = (name: string) => A2E_CHANNELS.indexOf(name as (typeof A2E_CHANNELS)[number])

const MOUTH_INDICES = [
  'mouthDimpleLeft', 'mouthDimpleRight', 'mouthFrownLeft', 'mouthFrownRight', 'mouthFunnel', 'mouthLeft',
  'mouthLowerDownLeft', 'mouthLowerDownRight', 'mouthPressLeft', 'mouthPressRight', 'mouthPucker', 'mouthRight',
  'mouthRollLower', 'mouthRollUpper', 'mouthShrugLower', 'mouthShrugUpper', 'mouthSmileLeft', 'mouthSmileRight',
  'mouthStretchLeft', 'mouthStretchRight', 'mouthUpperUpLeft', 'mouthUpperUpRight', 'jawForward', 'jawLeft', 'jawOpen',
  'jawRight', 'noseSneerLeft', 'noseSneerRight', 'cheekPuff'
].map(index)

const LEFT_RIGHT_PAIRS = [
  ['jawLeft', 'jawRight'], ['mouthLeft', 'mouthRight'], ['mouthSmileLeft', 'mouthSmileRight'],
  ['mouthFrownLeft', 'mouthFrownRight'], ['mouthDimpleLeft', 'mouthDimpleRight'], ['mouthStretchLeft', 'mouthStretchRight'],
  ['mouthPressLeft', 'mouthPressRight'], ['mouthLowerDownLeft', 'mouthLowerDownRight'], ['mouthUpperUpLeft', 'mouthUpperUpRight'],
  ['cheekSquintLeft', 'cheekSquintRight'], ['noseSneerLeft', 'noseSneerRight'], ['browDownLeft', 'browDownRight'],
  ['browOuterUpLeft', 'browOuterUpRight'], ['eyeBlinkLeft', 'eyeBlinkRight'], ['eyeLookDownLeft', 'eyeLookDownRight'],
  ['eyeLookInLeft', 'eyeLookInRight'], ['eyeLookOutLeft', 'eyeLookOutRight'], ['eyeLookUpLeft', 'eyeLookUpRight'],
  ['eyeSquintLeft', 'eyeSquintRight'], ['eyeWideLeft', 'eyeWideRight']
].map(([l, r]) => [index(l), index(r)] as const)

/** Per-frame RMS like librosa.feature.rms(frame_length=hop=sr/30, center=True, pad_mode="constant"). */
export const frameVolume = (audio: Float32Array, sampleRate = A2E_SAMPLE_RATE, frames?: number): Float32Array => {
  const frameLength = Math.min(Math.floor(sampleRate / A2E_FPS), audio.length)
  const hop = Math.floor(sampleRate / A2E_FPS)
  const pad = Math.floor(frameLength / 2)
  const total = 1 + Math.floor((audio.length + 2 * pad - frameLength) / hop)
  const count = frames === undefined ? total : Math.min(total, frames)
  const out = new Float32Array(count)
  for (let f = 0; f < count; f++) {
    let sum = 0
    const start = f * hop - pad
    for (let i = 0; i < frameLength; i++) {
      const s = start + i
      const v = s >= 0 && s < audio.length ? audio[s] : 0
      sum += v * v
    }
    out[f] = Math.sqrt(sum / frameLength)
  }
  return out
}

const lerpFrame = (frames: Float64Array, target: number, from: Float64Array, weight: number) => {
  for (let c = 0; c < CHANNELS; c++) {
    frames[target * CHANNELS + c] = from[c] * (1 - weight) + frames[target * CHANNELS + c] * weight
  }
}
const frameAt = (frames: Float64Array, f: number) => frames.slice(f * CHANNELS, (f + 1) * CHANNELS)

/** Contiguous runs of frames below `threshold`, at least `minLength` long (find_low_value_regions). */
const lowRegions = (signal: Float32Array, threshold: number, minLength: number): number[][] => {
  const low: number[] = []
  signal.forEach((v, i) => v < threshold && low.push(i))
  const regions: number[][] = []
  let start = 0
  let length = 0
  for (let i = 1; i < low.length; i++) {
    if (low[i] !== low[i - 1] + 1) {
      if (length >= minLength) regions.push(low.slice(start, i))
      start = i
      length = 0
    }
    length++
  }
  if (length >= minLength) regions.push(low.slice(start))
  return regions
}

/** Mutes mouth shapes during silences, blending in and out of each silent region. */
const smoothMouth = (frames: Float64Array, frameCount: number, volume: Float32Array) => {
  for (const region of lowRegions(volume, 0.001, 7)) {
    for (const f of region) for (const c of MOUTH_INDICES) frames[f * CHANNELS + c] *= 0.1
    const first = region[0]
    const last = region[region.length - 1]
    const startLength = Math.min(3, first)
    if (startLength > 0) {
      const pre = frameAt(frames, first - 1)
      for (let i = 0; i < startLength; i++) lerpFrame(frames, first + i, pre, (i + 1) / (startLength + 1))
    }
    const endLength = Math.min(3, frameCount - last - 1)
    if (endLength > 0) {
      const post = frameAt(frames, last + 1)
      for (let i = 0; i < endLength; i++) lerpFrame(frames, last - i, post, (i + 1) / (endLength + 1))
    }
  }
}

/** Eases the first frames in from a neutral face (apply_frame_blending with nothing processed yet). */
const blendFromNeutral = (frames: Float64Array, frameCount: number) => {
  const length = Math.min(3, frameCount)
  const neutral = new Float64Array(CHANNELS)
  for (let i = 0; i < length; i++) lerpFrame(frames, i, neutral, (i + 1) / (length + 1))
}

/** Savitzky-Golay, window 5, polynomial order 2, scipy "mirror" edges. */
const savitzkyGolay = (frames: Float64Array, frameCount: number): Float64Array => {
  if (frameCount < 5) return frames
  const k = [-3 / 35, 12 / 35, 17 / 35, 12 / 35, -3 / 35]
  const mirror = (i: number) => (i < 0 ? -i : i >= frameCount ? 2 * (frameCount - 1) - i : i)
  const out = new Float64Array(frames.length)
  for (let f = 0; f < frameCount; f++) {
    for (let c = 0; c < CHANNELS; c++) {
      let v = 0
      for (let j = -2; j <= 2; j++) v += k[j + 2] * frames[mirror(f + j) * CHANNELS + c]
      // The filter can overshoot; the original clips back into 0..1
      out[f * CHANNELS + c] = Math.min(1, Math.max(0, v))
    }
  }
  return out
}

const symmetrize = (frames: Float64Array, frameCount: number) => {
  for (let f = 0; f < frameCount; f++) {
    for (const [l, r] of LEFT_RIGHT_PAIRS) {
      const avg = (frames[f * CHANNELS + l] + frames[f * CHANNELS + r]) / 2
      frames[f * CHANNELS + l] = avg
      frames[f * CHANNELS + r] = avg
    }
  }
}

/** Full post-processing for one utterance's raw model output. */
export const postprocess = (raw: Float32Array, volume: Float32Array): Float32Array => {
  const frameCount = Math.floor(raw.length / CHANNELS)
  let frames = Float64Array.from(raw)
  smoothMouth(frames, frameCount, volume)
  blendFromNeutral(frames, frameCount)
  frames = savitzkyGolay(frames, frameCount)
  symmetrize(frames, frameCount)
  return Float32Array.from(frames)
}
