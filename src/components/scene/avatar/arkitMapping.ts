/**
 * ARKit adapter for blendshape-driven avatars (e.g. the LAM Gaussian head).
 *
 * The emote and viseme services already know how to drive "morph target" avatars:
 * they write values into `morphTargetInfluences[index]` using a name -> index dictionary.
 * We hand them a virtual rig (no mesh) that exposes every name they produce, then
 * convert those raw values into the 52 standard ARKit blendshape weights each frame.
 */

export const ARKIT_BLENDSHAPES = [
  'browDownLeft',
  'browDownRight',
  'browInnerUp',
  'browOuterUpLeft',
  'browOuterUpRight',
  'cheekPuff',
  'cheekSquintLeft',
  'cheekSquintRight',
  'eyeBlinkLeft',
  'eyeBlinkRight',
  'eyeLookDownLeft',
  'eyeLookDownRight',
  'eyeLookInLeft',
  'eyeLookInRight',
  'eyeLookOutLeft',
  'eyeLookOutRight',
  'eyeLookUpLeft',
  'eyeLookUpRight',
  'eyeSquintLeft',
  'eyeSquintRight',
  'eyeWideLeft',
  'eyeWideRight',
  'jawForward',
  'jawLeft',
  'jawOpen',
  'jawRight',
  'mouthClose',
  'mouthDimpleLeft',
  'mouthDimpleRight',
  'mouthFrownLeft',
  'mouthFrownRight',
  'mouthFunnel',
  'mouthLeft',
  'mouthLowerDownLeft',
  'mouthLowerDownRight',
  'mouthPressLeft',
  'mouthPressRight',
  'mouthPucker',
  'mouthRight',
  'mouthRollLower',
  'mouthRollUpper',
  'mouthShrugLower',
  'mouthShrugUpper',
  'mouthSmileLeft',
  'mouthSmileRight',
  'mouthStretchLeft',
  'mouthStretchRight',
  'mouthUpperUpLeft',
  'mouthUpperUpRight',
  'noseSneerLeft',
  'noseSneerRight',
  'tongueOut'
] as const

export type ArkitBlendshape = (typeof ARKIT_BLENDSHAPES)[number]
export type ArkitFrame = Record<ArkitBlendshape, number>

type Weights = Partial<Record<ArkitBlendshape, number>>

/** Composite (non-ARKit) names the emote service writes, expanded to ARKit shapes. */
const COMPOSITE_TARGETS: Record<string, Weights> = {
  mouthSmile: { mouthSmileLeft: 1, mouthSmileRight: 1 },
  mouthPress: { mouthPressLeft: 1, mouthPressRight: 1 },
  eyesClosed: { eyeBlinkLeft: 1, eyeBlinkRight: 1 },
  eyesLookDown: { eyeLookDownLeft: 1, eyeLookDownRight: 1 }
}

/**
 * Oculus visemes (what the lipsync produces) as ARKit mouth poses.
 * Tuned by eye for a natural look; scale with `visemeGain` if speech looks too strong/weak.
 */
export const VISEME_TO_ARKIT: Record<string, Weights> = {
  viseme_PP: { mouthPressLeft: 0.5, mouthPressRight: 0.5, mouthRollLower: 0.3, mouthRollUpper: 0.3, mouthClose: 0.2 },
  viseme_FF: { mouthRollLower: 0.6, mouthUpperUpLeft: 0.2, mouthUpperUpRight: 0.2, jawOpen: 0.08, mouthFunnel: 0.1 },
  viseme_TH: { jawOpen: 0.15, tongueOut: 0.3, mouthStretchLeft: 0.1, mouthStretchRight: 0.1 },
  viseme_DD: { jawOpen: 0.2, mouthStretchLeft: 0.15, mouthStretchRight: 0.15 },
  viseme_kk: { jawOpen: 0.25, mouthStretchLeft: 0.2, mouthStretchRight: 0.2 },
  viseme_CH: { jawOpen: 0.15, mouthFunnel: 0.4, mouthPucker: 0.2 },
  viseme_SS: { jawOpen: 0.08, mouthStretchLeft: 0.35, mouthStretchRight: 0.35, mouthSmileLeft: 0.1, mouthSmileRight: 0.1 },
  viseme_nn: { jawOpen: 0.15, mouthClose: 0.1, mouthStretchLeft: 0.1, mouthStretchRight: 0.1 },
  viseme_RR: { jawOpen: 0.15, mouthFunnel: 0.3, mouthPucker: 0.3 },
  viseme_aa: { jawOpen: 0.6, mouthLowerDownLeft: 0.25, mouthLowerDownRight: 0.25, mouthStretchLeft: 0.1, mouthStretchRight: 0.1 },
  viseme_E: { jawOpen: 0.35, mouthStretchLeft: 0.4, mouthStretchRight: 0.4, mouthSmileLeft: 0.1, mouthSmileRight: 0.1 },
  viseme_I: { jawOpen: 0.25, mouthStretchLeft: 0.5, mouthStretchRight: 0.5, mouthSmileLeft: 0.2, mouthSmileRight: 0.2 },
  viseme_O: { jawOpen: 0.45, mouthFunnel: 0.6, mouthPucker: 0.3 },
  viseme_U: { jawOpen: 0.2, mouthPucker: 0.8, mouthFunnel: 0.4 }
}

export interface VirtualRig {
  /** Pass as the `morphs` array to setupEmotesForMorphTargets / setupVisemesForMorphTargets */
  morphs: { morphTargetInfluences: number[] }[]
  /** name -> [index] dictionary for the same calls */
  dictionary: Record<string, number[]>
}

export const createVirtualRig = (): VirtualRig => {
  const names = [...ARKIT_BLENDSHAPES, ...Object.keys(COMPOSITE_TARGETS), ...Object.keys(VISEME_TO_ARKIT)]
  const dictionary: Record<string, number[]> = {}
  names.forEach((name, index) => {
    dictionary[name] = [index]
  })
  return { morphs: [{ morphTargetInfluences: new Array(names.length).fill(0) }], dictionary }
}

export interface ArkitMappingOptions {
  /** Multiplier for lipsync mouth shapes */
  visemeGain?: number
  /** Multiplier for emotion / blink / brow shapes */
  emoteGain?: number
  /** Per-shape multipliers applied last, for avatars whose shapes are subtler or stronger */
  shapeGains?: Partial<Record<ArkitBlendshape, number>>
  /** Extra weights added on top (e.g. procedural eye gaze) */
  extra?: Partial<Record<ArkitBlendshape, number>>
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** Converts the virtual rig's raw values into a full ARKit frame (all 52 keys, clamped 0..1). */
export const rigToArkit = (rig: VirtualRig, options: ArkitMappingOptions = {}): ArkitFrame => {
  const { visemeGain = 1, emoteGain = 1, shapeGains, extra } = options
  const values = rig.morphs[0].morphTargetInfluences
  const read = (name: string) => values[rig.dictionary[name][0]] || 0

  const frame = {} as ArkitFrame
  for (const name of ARKIT_BLENDSHAPES) frame[name] = read(name) * emoteGain

  const add = (weights: Weights, amount: number) => {
    if (!amount) return
    for (const [name, weight] of Object.entries(weights) as [ArkitBlendshape, number][]) {
      frame[name] += weight * amount
    }
  }

  for (const [name, weights] of Object.entries(COMPOSITE_TARGETS)) add(weights, read(name) * emoteGain)
  for (const [name, weights] of Object.entries(VISEME_TO_ARKIT)) add(weights, read(name) * visemeGain)

  // Blinks are absolute (eyes either close or not), so take them as-is rather than summing
  frame.eyeBlinkLeft = Math.max(read('eyeBlinkLeft'), read('eyesClosed'))
  frame.eyeBlinkRight = Math.max(read('eyeBlinkRight'), read('eyesClosed'))

  if (extra) for (const [name, value] of Object.entries(extra) as [ArkitBlendshape, number][]) frame[name] += value
  if (shapeGains) for (const [name, gain] of Object.entries(shapeGains) as [ArkitBlendshape, number][]) frame[name] *= gain

  for (const name of ARKIT_BLENDSHAPES) frame[name] = clamp01(frame[name])
  return frame
}
