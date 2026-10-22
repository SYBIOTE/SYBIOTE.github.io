/**
 * Fades splats in and out with the blink, so closed eyes don't show the eye through the lid.
 *
 * LAM reconstructs the face with the eyes open, so the upper lid is made of faint splats and the
 * eye behind it stays fully drawn when the lid comes down. The renderer re-uploads every splat's
 * colour and opacity each frame from an array we can reach, so as each eye closes we:
 * - fade out the eye's own splats (the ones its gaze blendshapes move), late in the blink
 * - fade in the upper lid's splats (the ones its blink blendshape moves), turning them solid skin
 * Lashes keep their look, and so do long, stretched lid splats: made solid, their open-eye shape would
 * poke past the closed lid's outline as skin-coloured spikes at the corners. With the eyes open every
 * splat has its original colour and opacity.
 */

import type { ArkitFrame } from './arkitMapping'

// Closed-lid skin colour (sRGB bytes), sampled from this avatar's render between the crease and under the eye
const LID_TONE = [153, 112, 89] as const
// Opacity the lid's splats reach when the eye is fully closed
const LID_OPACITY = 235
// Blink range over which the lid turns solid, and over which the eye fades out (it starts later,
// once the lid already covers most of it, so the eye never vanishes ahead of the lid)
const LID_FADE = [0.3, 0.9] as const
const EYE_FADE = [0.55, 0.95] as const
// Only splats that travel at least this share of the lid edge's distance count as lid: ones that move less
// stay above the closed lid (crease, brow), where the lid tone would show as pale blotches
const LID_MIN_TRAVEL = 0.6
// Lid splats longer than this (2 sigma, metres) or more stretched than this stay faint, fading over the given ranges
const LID_MAX_LENGTH = [0.006, 0.0035] as const
const LID_MAX_STRETCH = [5, 2.5] as const
// Skip updates for changes smaller than this
const WEIGHT_EPSILON = 0.01

interface OpacityInternals {
  viewer?: {
    skinModel?: {
      morphTargetDictionary?: Record<string, number>
      geometry: { morphAttributes: { position?: { array: ArrayLike<number> }[] } }
    }
    splatMesh?: {
      getSplatCount: () => number
      splatDataTextures?: { baseData?: { colors?: Uint8Array; covariances?: Float32Array | Uint16Array } }
    }
  }
}

const smooth = (x: number, a: number, b: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

interface EyeSplats {
  blink: 'eyeBlinkLeft' | 'eyeBlinkRight'
  lid: Uint32Array
  lidWeight: Float32Array
  eye: Uint32Array
}

/** Returns an update function to call with each frame's weights, or null if the renderer doesn't expose what's needed. */
export const createBlendshapeOpacity = (renderer: unknown) => {
  const viewer = (renderer as OpacityInternals).viewer
  const mesh = viewer?.splatMesh
  let colors = mesh?.splatDataTextures?.baseData?.colors
  const skin = viewer?.skinModel
  const morphs = skin?.geometry.morphAttributes.position
  const dict = skin?.morphTargetDictionary
  if (!mesh || !colors || !morphs || !dict) return null
  const count = mesh.getSplatCount()
  if (count <= 0) return null
  let original = colors.slice(0, count * 4)
  // The renderer keeps each splat's shape as a covariance (xx, xy, xz, yy, yz, zz); its axis lengths
  // are the square roots of the eigenvalues
  const cov = mesh.splatDataTextures?.baseData?.covariances
  const axes = (i: number) => {
    const o = i * 6
    const a = cov![o], b = cov![o + 1], c = cov![o + 2], d = cov![o + 3], e = cov![o + 4], f = cov![o + 5]
    const off = b * b + c * c + e * e, q = (a + d + f) / 3
    if (off < 1e-30) return [a, d, f].map((v) => Math.sqrt(Math.max(v, 0))).sort((x, y) => x - y)
    const p = Math.sqrt(((a - q) ** 2 + (d - q) ** 2 + (f - q) ** 2 + 2 * off) / 6)
    const [A, B, C, D, E, F] = [(a - q) / p, b / p, c / p, (d - q) / p, e / p, (f - q) / p]
    const r = Math.min(1, Math.max(-1, (A * (D * F - E * E) - B * (B * F - E * C) + C * (B * E - D * C)) / 2))
    const phi = Math.acos(r) / 3
    const e1 = q + 2 * p * Math.cos(phi), e3 = q + 2 * p * Math.cos(phi + (2 * Math.PI) / 3)
    return [e3, 3 * q - e1 - e3, e1].map((v) => Math.sqrt(Math.max(v, 0)))
  }
  // How compact a splat is: 1 for short, round ones, 0 for long or needle-like ones
  const compactness = (i: number) => {
    if (!(cov instanceof Float32Array) || cov.length < (i + 1) * 6) return 1
    const s = axes(i)
    return smooth(2 * s[2], LID_MAX_LENGTH[0], LID_MAX_LENGTH[1]) * smooth(s[2] / Math.max(s[1], 1e-9), LID_MAX_STRETCH[0], LID_MAX_STRETCH[1])
  }

  // Per-splat travel of a blendshape (splat i rides on mesh vertex i)
  const travel = (name: string) => {
    const index = dict[name]
    const delta = index === undefined ? undefined : morphs[index]?.array
    const out = new Float32Array(count)
    if (!delta) return out
    for (let i = 0; i < count && i * 3 + 2 < delta.length; i++) out[i] = Math.hypot(delta[i * 3], delta[i * 3 + 1], delta[i * 3 + 2])
    return out
  }
  const maxOf = (a: Float32Array) => a.reduce((m, v) => (v > m ? v : m), 0)

  const eyes: EyeSplats[] = []
  for (const side of ['Left', 'Right'] as const) {
    const blink = travel(`eyeBlink${side}`)
    const look = travel(`eyeLookOut${side}`)
    const blinkMax = maxOf(blink), lookMax = maxOf(look)
    if (!blinkMax || !lookMax) continue
    const lid: number[] = [], lidWeight: number[] = [], eye: number[] = []
    for (let i = 0; i < count; i++) {
      const r = blink[i] / blinkMax
      const o = i * 4
      const luma = (0.299 * original[o] + 0.587 * original[o + 1] + 0.114 * original[o + 2]) / 255
      // The lashes keep their look, and the skin right at the lid edge among them only goes partly solid:
      // fully solid it covers the lash line, fully faint the background shows through once the eye fades
      const lash = r > 0.6 && luma < 0.3
      const w = lash ? 0 : smooth(r, LID_MIN_TRAVEL, LID_MIN_TRAVEL + 0.3) * (1 - 0.6 * smooth(r, 0.8, 0.97)) * compactness(i)
      if (w > 0.02) {
        lid.push(i)
        lidWeight.push(w)
      } else if (r < 0.1 && look[i] / lookMax > 0.5) eye.push(i)
    }
    eyes.push({ blink: `eyeBlink${side}`, lid: Uint32Array.from(lid), lidWeight: Float32Array.from(lidWeight), eye: Uint32Array.from(eye) })
  }
  if (!eyes.length) return null

  const last = new Float32Array(eyes.length)
  return (frame: Partial<ArkitFrame>) => {
    // If the renderer rebuilt its colour data, start again from the fresh copy
    const current = mesh.splatDataTextures?.baseData?.colors
    if (!current) return
    if (current !== colors) {
      colors = current
      original = current.slice(0, count * 4)
      last.fill(0)
    }
    for (let e = 0; e < eyes.length; e++) {
      const { blink, lid, lidWeight, eye } = eyes[e]
      const b = frame[blink] ?? 0
      if (Math.abs(b - last[e]) <= WEIGHT_EPSILON && !(b === 0 && last[e] !== 0)) continue
      last[e] = b
      const lidT = smooth(b, LID_FADE[0], LID_FADE[1])
      const eyeKeep = 1 - smooth(b, EYE_FADE[0], EYE_FADE[1])
      for (let j = 0; j < lid.length; j++) {
        const o = lid[j] * 4, t = lidWeight[j] * lidT
        for (let c = 0; c < 3; c++) colors[o + c] = Math.round(original[o + c] + (LID_TONE[c] - original[o + c]) * t)
        colors[o + 3] = Math.round(original[o + 3] + Math.max(0, LID_OPACITY - original[o + 3]) * t)
      }
      for (let j = 0; j < eye.length; j++) {
        const o = eye[j] * 4
        colors[o + 3] = Math.round(original[o + 3] * eyeKeep)
      }
    }
  }
}
