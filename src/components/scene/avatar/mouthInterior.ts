/**
 * Gives the open mouth an inside, and keeps the lip corners together as the jaw drops.
 *
 * LAM reconstructs the face from a closed-mouth photo, so nothing inside the mouth was ever seen:
 * - the mesh just ends in a ring a centimetre or two behind the lips, so through the opening you
 *   see straight into the head (the neck's splats from behind)
 * - the inner lip surfaces between the lips and that ring got pale skin tones
 * - the jaw blendshape drops the lower lip evenly across its width, so the opening is a rectangle
 *   whose sides are stretched stubble rather than lips meeting at the corners
 *
 * So, once the splats have loaded:
 * - the jaw blendshape is reshaped so the lip corners come down part of the way with the jaw and the
 *   upper lip bends to meet them: one oval opening, corners joined. Below the lips the jaw moves as before
 * - the inner lip surfaces (everything reachable from the ring without facing the camera) are
 *   recoloured as the mouth opens: a soft shadow tone while it's slightly open, darker the deeper and the
 *   wider. The upper-teeth splats keep their colour; big blurry splats, which spill past the lips, keep
 *   theirs and fade out; and splats right at the lip edge only turn solid a few millimetres in, so the
 *   edge never shows as a line
 * - a soft shadow over the opening, drawn after the splats, darkens what shows through it (the neck from
 *   behind) without a solid shape: full in the middle and fading to nothing at the lips, so there's no
 *   edge anywhere. It's on its own layer and drawn in an extra pass, like the glasses' lenses
 */

import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  SRGBColorSpace,
  type Object3D
} from 'three'

import type { ArkitFrame } from './arkitMapping'

// Lip corners: half the mouth's width, as a multiple of the ring's half-width
const CORNER_SCALE = 1.1
// Below the mouth line, the corner easing fades out over this range (metres), so the chin moves as before
const CORNER_EASE_DEPTH = [0.006, 0.035] as const
// Past the corners (as a multiple of the half-width), the cheeks go back to their own motion
const CORNER_EASE_OUT = [1, 2.2] as const
// How the easing grows towards the corners (u^n, u from 0 at the centre to 1 at a corner)
const CORNER_PROFILE = 2
// Share of the jaw's pull the lip corners keep: they come down this far, and the upper lip with them
const CORNER_DROP = 0.35
// The lower lip edge: points the jaw moves at least this far (metres), within this band below the mouth line
const LOWER_LIP_MIN_TRAVEL = 0.004
const LIP_BAND = 0.012
const BIN_WIDTH = 0.002
// How far above the mouth line the upper lip bends down with the corners (metres)
const UPPER_LIP_REACH = 0.015

// Inner surfaces facing the camera more than this (normal's z) count as the outside of the lips
const INNER_MAX_FACING = 0.3
// Colour inside (sRGB bytes): deep in the mouth, nearer the lips, and the soft shadow tone it starts from
const DEEP = [22, 7, 8] as const
const NEAR = [58, 27, 29] as const
const SHADOW = [96, 62, 58] as const
// Distance from the ring (along the surface, metres) over which the colour goes from deep to near,
// and distance from the lip edge over which it takes over from the reconstructed lip colour
const DEPTH_SHADE = [0.004, 0.017] as const
const LIP_EDGE = [0.001, 0.005] as const
// Distance from the lip edge over which the inner splats turn solid (faint ones there would make a line)
const SOLID_FROM = [0.003, 0.008] as const
// Opacity the inner splats reach; ones longer than this range (2 sigma, metres) fade out instead
const INNER_OPACITY = 240
const INNER_MAX_LENGTH = [0.004, 0.008] as const
// The upper teeth are the few bright, solid splats on the inner surface that the jaw doesn't move
const TEETH_MIN_LUMA = 0.7
const TEETH_MIN_OPACITY = 150
const TEETH_MAX_TRAVEL = 0.008
// Jaw opening over which the inside appears, and over which it goes from the soft shadow tone to dark.
// Speech mostly sits below 0.3, so it stays soft there
const OPEN_RANGE = [0.06, 0.3] as const
const DARK_RANGE = [0.25, 0.6] as const
const WEIGHT_EPSILON = 0.01

// The soft shadow: starts once the opening passes this share of OPEN_RANGE; its opacity in the middle while
// slightly open and when wide; the share of the opening it's full over before fading out to the lip edge,
// and how much of it reaches along the top (over the teeth)
const SHADOW_FROM = 0.15
const SHADOW_OPACITY = [0.75, 0.97] as const
const SHADOW_CORE = 0.45
const SHADOW_TOP = 0.45
const SHADOW_STEPS = 48
// Each direction's radius is averaged with this many neighbours on each side, so the outline stays smooth
const SHADOW_SMOOTHING = 4
// Layer the shadow lives on, so the renderer's normal pass skips it (the glasses' lenses use 5)
const SHADOW_LAYER = 6

interface MouthInternals {
  viewer?: {
    threeScene?: { add: (object: Object3D) => void }
    camera?: { layers: { mask: number } }
    render?: () => void
    renderer?: {
      properties: { get: (texture: unknown) => { __webglTexture?: unknown } | undefined }
      autoClear: boolean
      render: (scene: Object3D, camera: unknown) => void
    }
    skinModel?: {
      morphTargetDictionary?: Record<string, number>
      geometry: {
        index: { array: ArrayLike<number> } | null
        attributes: { position: { array: Float32Array } }
        morphAttributes: { position?: { array: Float32Array }[] }
      }
      skeleton?: { boneMatrices?: Float32Array }
    }
    splatMesh?: {
      getSplatCount: () => number
      matrixWorld: Matrix4
      bsWeight?: Record<string, number>
      visibleRegionFadeStartRadius?: number
      visibleRegionBufferRadius?: number
      material?: { uniforms?: { headBoneIndex?: { value: number } } }
      splatDataTextures?: {
        baseData?: { colors?: Uint8Array; covariances?: Float32Array | Uint16Array; centers?: Float32Array }
        flameModel?: { data: Uint32Array; texture: unknown; size: unknown }
      }
      updateDataTexture?: (...args: unknown[]) => void
    }
  }
}

const smooth = (x: number, a: number, b: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// Blendshapes already reshaped, so a second set-up (the renderer refreshing its data) doesn't apply it twice
const reshaped = new WeakSet<Float32Array>()

/** Returns an update function to call with each frame's weights, or null if the renderer doesn't expose what's needed. */
export const createMouthInterior = (renderer: unknown) => {
  const viewer = (renderer as MouthInternals).viewer
  const mesh = viewer?.splatMesh
  const skin = viewer?.skinModel
  const dict = skin?.morphTargetDictionary
  const morphs = skin?.geometry.morphAttributes.position
  const index = skin?.geometry.index?.array
  const colors = mesh?.splatDataTextures?.baseData?.colors
  const jaw = dict && morphs?.[dict.jawOpen]?.array
  if (!mesh || !skin || !dict || !morphs || !index || !colors || !jaw) return null
  const count = mesh.getSplatCount()
  const rest = skin.geometry.attributes.position.array
  if (count <= 0 || rest.length < count * 3) return null
  const x = (i: number) => rest[i * 3]
  const y = (i: number) => rest[i * 3 + 1]
  const z = (i: number) => rest[i * 3 + 2]

  // Edges, vertex normals and neighbours (splat i rides on mesh vertex i)
  const normals = new Float32Array(count * 3)
  const neighbours: number[][] = Array.from({ length: count }, () => [])
  const edgeUse = new Map<number, number>()
  for (let k = 0; k + 2 < index.length; k += 3) {
    const a = index[k], b = index[k + 1], c = index[k + 2]
    const ux = x(b) - x(a), uy = y(b) - y(a), uz = z(b) - z(a)
    const vx = x(c) - x(a), vy = y(c) - y(a), vz = z(c) - z(a)
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx
    for (const q of [a, b, c]) {
      normals[q * 3] += nx
      normals[q * 3 + 1] += ny
      normals[q * 3 + 2] += nz
    }
    for (const [p, q] of [[a, b], [b, c], [c, a]]) {
      neighbours[p].push(q)
      neighbours[q].push(p)
      const key = p < q ? p * count + q : q * count + p
      edgeUse.set(key, (edgeUse.get(key) ?? 0) + 1)
    }
  }
  const facing = (i: number) => normals[i * 3 + 2] / (Math.hypot(normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]) || 1)

  // The mouth's ring: edges used by one face form the mesh's open borders; the mouth's is the one
  // the jaw pulls apart (the neck's cut doesn't move, the eyes are closed shells)
  const borderNext = new Map<number, number[]>()
  for (const [key, uses] of edgeUse) {
    if (uses !== 1) continue
    const p = Math.floor(key / count), q = key % count
    borderNext.set(p, [...(borderNext.get(p) ?? []), q])
    borderNext.set(q, [...(borderNext.get(q) ?? []), p])
  }
  const jawTravel = (i: number) => Math.hypot(jaw[i * 3], jaw[i * 3 + 1], jaw[i * 3 + 2])
  let ring: number[] = []
  let ringScore = 0
  const seen = new Set<number>()
  for (const start of borderNext.keys()) {
    if (seen.has(start)) continue
    const loop = [start]
    seen.add(start)
    for (let prev = -1, at = start; ; ) {
      const next = borderNext.get(at)!.find((q) => q !== prev && !seen.has(q))
      if (next === undefined) break
      loop.push(next)
      seen.add(next)
      prev = at
      at = next
    }
    // Both lips: the lower one moves with the jaw and the upper one barely does
    let most = 0, least = Infinity
    for (const q of loop) {
      most = Math.max(most, jawTravel(q))
      least = Math.min(least, jawTravel(q))
    }
    const score = most - least
    if (score > ringScore) {
      ring = loop
      ringScore = score
    }
  }
  if (ring.length < 8) return null

  let minX = Infinity, maxX = -Infinity, ringY = 0
  for (const q of ring) {
    minX = Math.min(minX, x(q))
    maxX = Math.max(maxX, x(q))
    ringY += y(q)
  }
  ringY /= ring.length
  const centreX = (minX + maxX) / 2
  const halfWidth = ((maxX - minX) / 2) * CORNER_SCALE

  // Keep the lip corners together, the way a mouth opens: the corners come down part of the way with the
  // jaw and the upper lip bends down to meet them, so the opening is one oval rather than a wide slit with
  // a trough in the middle. Below the lips the jaw moves as before
  if (!reshaped.has(jaw)) {
    reshaped.add(jaw)
    const flame = mesh.splatDataTextures?.flameModel
    const texel = flame ? new Float32Array(flame.data.buffer) : null
    const block = Object.keys(dict).indexOf('jawOpen')
    // The renderer keeps blendshapes in its texture in the dictionary's key order, weighted by dictionary index
    const textureMatches = Object.keys(dict).every((name, i) => dict[name] === i)
    const before = jaw.slice()
    // How far towards a corner a point is: 0 at the centre, 1 at the corner, back to 0 out on the cheeks
    const towardsCorner = (i: number) => {
      const u = Math.abs(x(i) - centreX) / halfWidth
      return u <= 1 ? u ** CORNER_PROFILE : 1 - smooth(u, CORNER_EASE_OUT[0], CORNER_EASE_OUT[1])
    }
    // The lower lip edge's pull at each point across the mouth, which the upper lip's corners follow
    const bins = new Map<number, number[]>()
    for (let i = 0; i < count; i++) {
      if (jawTravel(i) < LOWER_LIP_MIN_TRAVEL || y(i) > ringY || y(i) < ringY - LIP_BAND) continue
      const key = Math.round(x(i) / BIN_WIDTH)
      const sum = bins.get(key) ?? [0, 0, 0, 0]
      for (let c = 0; c < 3; c++) sum[c] += before[i * 3 + c]
      sum[3]++
      bins.set(key, sum)
    }
    const lowerPull = (i: number) => {
      const key = Math.round(x(i) / BIN_WIDTH)
      for (let reach = 0; reach < 4; reach++)
        for (const k of [key - reach, key + reach]) {
          const sum = bins.get(k)
          if (sum) return [sum[0] / sum[3], sum[1] / sum[3], sum[2] / sum[3]]
        }
      return null
    }
    for (let i = 0; i < count; i++) {
      const corner = towardsCorner(i)
      if (corner <= 0) continue
      const delta = [before[i * 3], before[i * 3 + 1], before[i * 3 + 2]]
      if (jawTravel(i) >= LOWER_LIP_MIN_TRAVEL) {
        // Lower lip: the corners keep part of the jaw's pull
        const nearLips = 1 - smooth(ringY - y(i), CORNER_EASE_DEPTH[0], CORNER_EASE_DEPTH[1])
        const scale = 1 - (1 - CORNER_DROP) * corner * nearLips
        for (let c = 0; c < 3; c++) delta[c] *= scale
      } else if (y(i) > ringY - LIP_BAND / 3 && y(i) < ringY + UPPER_LIP_REACH) {
        // Upper lip: near the corners it comes down with the lower lip's corner
        const pull = lowerPull(i)
        const nearLips = 1 - smooth(y(i) - ringY, 0, UPPER_LIP_REACH)
        if (pull) for (let c = 0; c < 3; c++) delta[c] += pull[c] * CORNER_DROP * corner * nearLips
      } else continue
      for (let c = 0; c < 3; c++) {
        jaw[i * 3 + c] = delta[c]
        if (texel && textureMatches) texel[(block * count + i) * 4 + c] = delta[c]
      }
    }
    // Send the changed blendshape to the GPU
    const props = flame && viewer.renderer?.properties.get(flame.texture)
    if (flame && textureMatches && props?.__webglTexture && mesh.updateDataTexture)
      mesh.updateDataTexture(flame.data, flame.texture, flame.size, props, 4, 4, 4, block * count, block * count + count - 1)
    else if (flame && textureMatches) (flame.texture as { needsUpdate: boolean }).needsUpdate = true
  }

  // Inner surfaces: walk out from the ring over everything that doesn't face the camera, noting how far along the surface each point is
  const walk = (starts: number[], allowed: (i: number) => boolean) => {
    const reached = new Float32Array(count).fill(Infinity)
    const queue = [...starts]
    for (const q of starts) reached[q] = 0
    while (queue.length) {
      let best = 0
      for (let k = 1; k < queue.length; k++) if (reached[queue[k]] < reached[queue[best]]) best = k
      const at = queue[best]
      queue[best] = queue[queue.length - 1]
      queue.pop()
      for (const q of neighbours[at]) {
        if (!allowed(q)) continue
        const d = reached[at] + Math.hypot(x(q) - x(at), y(q) - y(at), z(q) - z(at))
        if (d < reached[q]) {
          reached[q] = d
          queue.push(q)
        }
      }
    }
    return reached
  }
  const distance = walk(ring, (q) => facing(q) <= INNER_MAX_FACING)

  // The lip edges, where the inner surfaces turn to face the camera: the opening as seen
  const lipEdge: number[] = []
  for (let i = 0; i < count; i++) {
    if (distance[i] === Infinity || Math.abs(x(i) - centreX) > halfWidth * 1.2 || Math.abs(y(i) - ringY) > 0.03) continue
    if (neighbours[i].some((q) => distance[q] === Infinity && facing(q) > INNER_MAX_FACING)) lipEdge.push(i)
  }
  if (lipEdge.length < 8) return null
  const fromEdge = walk(lipEdge, (q) => distance[q] < Infinity)

  let original = colors.slice(0, count * 4)
  const cov = mesh.splatDataTextures?.baseData?.covariances
  const length = (i: number) =>
    cov instanceof Float32Array && cov.length >= (i + 1) * 6 ? 2 * Math.sqrt(Math.max(cov[i * 6], cov[i * 6 + 3], cov[i * 6 + 5], 0)) : 0
  const inner: number[] = [], innerShade: number[] = [], innerKeep: number[] = [], innerSize: number[] = [], innerSolid: number[] = []
  for (let i = 0; i < count; i++) {
    if (distance[i] === Infinity) continue
    const o = i * 4
    const luma = (0.299 * original[o] + 0.587 * original[o + 1] + 0.114 * original[o + 2]) / 255
    if (luma > TEETH_MIN_LUMA && original[o + 3] > TEETH_MIN_OPACITY && jawTravel(i) < TEETH_MAX_TRAVEL) continue
    inner.push(i)
    innerShade.push(smooth(distance[i], DEPTH_SHADE[0], DEPTH_SHADE[1]))
    innerKeep.push(1 - smooth(fromEdge[i], LIP_EDGE[0], LIP_EDGE[1]))
    innerSize.push(smooth(length(i), INNER_MAX_LENGTH[0], INNER_MAX_LENGTH[1]))
    innerSolid.push(smooth(fromEdge[i], SOLID_FROM[0], SOLID_FROM[1]))
  }

  // The shadow: the opening's outline around its centre in angular steps, as a ring at the lip edge (clear),
  // an inner ring (full) and a centre point (full), in the mesh's rest space. Its colour carries the alpha
  const steps = SHADOW_STEPS
  const positions = new Float32Array((steps * 2 + 1) * 3)
  const alphas = new Float32Array((steps * 2 + 1) * 4).fill(1)
  const faces: number[] = []
  for (let k = 0; k < steps; k++) {
    const a = k, b = (k + 1) % steps
    faces.push(a, b, a + steps, b, b + steps, a + steps, 2 * steps, b, a)
  }
  const geometry = new BufferGeometry()
  const positionAttribute = new BufferAttribute(positions, 3)
  const alphaAttribute = new BufferAttribute(alphas, 4)
  geometry.setAttribute('position', positionAttribute)
  geometry.setAttribute('color', alphaAttribute)
  geometry.setIndex(faces)
  const material = new MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: DoubleSide,
    toneMapped: false
  })
  const shadow = new Mesh(geometry, material)
  shadow.name = 'mouth-shadow'
  shadow.frustumCulled = false
  shadow.matrixAutoUpdate = false
  shadow.visible = false
  shadow.layers.set(SHADOW_LAYER)
  const toColour = (rgb: readonly number[]) => new Color().setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, SRGBColorSpace)
  const shadowTone = toColour(SHADOW), deepTone = toColour(DEEP)

  // Each lip-edge point's offset per blendshape, so the outline follows the lips
  const shapes = Object.entries(dict)
    .map(([name, i]) => ({ name, delta: Float32Array.from(lipEdge.flatMap((q) => [0, 1, 2].map((c) => morphs[i]?.array[q * 3 + c] ?? 0))) }))
    .filter(({ delta }) => delta.some((v) => v !== 0))
  const edge = new Float32Array(lipEdge.length * 3)
  const outline = new Float32Array(steps)
  const smoothed = new Float32Array(steps)
  const headMatrix = new Matrix4()
  const headFadedIn = () => {
    const buffer = mesh.visibleRegionBufferRadius ?? 0
    return buffer > 0 && (mesh.visibleRegionFadeStartRadius ?? 0) / buffer > 0.99
  }
  let opening = 0
  let darkness = 0

  // Rebuild the shadow for this frame's weights and follow the head like the splats do: they're all
  // moved by the head bone's skinning matrix, which the skeleton has packed before the scene renders
  const updateMatrixWorld = shadow.updateMatrixWorld.bind(shadow)
  shadow.updateMatrixWorld = (force?: boolean) => {
    shadow.visible = opening > SHADOW_FROM && headFadedIn()
    const bone = mesh.material?.uniforms?.headBoneIndex?.value ?? -1
    const packed = skin.skeleton?.boneMatrices
    if (shadow.visible && packed && bone >= 0 && packed.length >= (bone + 1) * 16) {
      const weights = mesh.bsWeight ?? {}
      for (let k = 0; k < lipEdge.length; k++) for (let c = 0; c < 3; c++) edge[k * 3 + c] = rest[lipEdge[k] * 3 + c]
      for (const { name, delta } of shapes) {
        const w = weights[name] ?? 0
        if (w) for (let j = 0; j < edge.length; j++) edge[j] += w * delta[j]
      }
      let cx = 0, cy = 0, cz = 0
      for (let k = 0; k < lipEdge.length; k++) {
        cx += edge[k * 3] / lipEdge.length
        cy += edge[k * 3 + 1] / lipEdge.length
        cz += edge[k * 3 + 2] / lipEdge.length
      }
      // The opening's radius in each direction: the nearest lip edge that way, so the shadow stays inside it
      outline.fill(Infinity)
      for (let k = 0; k < lipEdge.length; k++) {
        const dx = edge[k * 3] - cx, dy = edge[k * 3 + 1] - cy
        const step = Math.floor(((Math.atan2(dy, dx) / (2 * Math.PI) + 1) % 1) * steps) % steps
        outline[step] = Math.min(outline[step], Math.hypot(dx, dy))
      }
      // Directions no edge point falls in take their neighbours' radius
      const known = outline.findIndex((r) => r < Infinity)
      for (let n = 1, prev = outline[known]; known >= 0 && n <= steps; n++) {
        const k = (known + n) % steps
        if (outline[k] === Infinity) outline[k] = prev
        else prev = outline[k]
      }
      smoothed.fill(0)
      for (let k = 0; k < steps; k++)
        for (let n = -SHADOW_SMOOTHING; n <= SHADOW_SMOOTHING; n++) smoothed[k] += outline[(k + n + steps) % steps] / (2 * SHADOW_SMOOTHING + 1)
      // Denser as the mouth opens wide, lighter along the top where it only shades the teeth
      const full = (SHADOW_OPACITY[0] + (SHADOW_OPACITY[1] - SHADOW_OPACITY[0]) * darkness) * smooth(opening, SHADOW_FROM, 1)
      for (let ring = 0; ring < 2; ring++) {
        const spread = ring ? 1 : SHADOW_CORE
        for (let k = 0; k < steps; k++) {
          const angle = ((k + 0.5) / steps) * 2 * Math.PI
          const v = ring * steps + k
          positions[v * 3] = cx + Math.cos(angle) * smoothed[k] * spread
          positions[v * 3 + 1] = cy + Math.sin(angle) * smoothed[k] * spread
          positions[v * 3 + 2] = cz
          alphas[v * 4 + 3] = ring ? 0 : full * (SHADOW_TOP + (1 - SHADOW_TOP) * smooth(-Math.sin(angle), -0.3, 0.3))
        }
      }
      positions.set([cx, cy, cz], steps * 2 * 3)
      alphas[steps * 2 * 4 + 3] = full
      positionAttribute.needsUpdate = true
      alphaAttribute.needsUpdate = true
      material.color.copy(shadowTone).lerp(deepTone, darkness)
      headMatrix.fromArray(packed, bone * 16)
      shadow.matrix.multiplyMatrices(mesh.matrixWorld, headMatrix)
      shadow.matrixWorldNeedsUpdate = true
    } else shadow.visible = false
    updateMatrixWorld(force)
  }
  viewer.threeScene?.add(shadow)

  // Draw the shadow over the splats
  const render = viewer.render
  const gl = viewer.renderer
  const camera = viewer.camera
  const scene = viewer.threeScene
  if (render && gl && camera && scene) {
    viewer.render = function (this: unknown) {
      render.call(this)
      if (!shadow.visible && opening <= SHADOW_FROM) return
      const mask = camera.layers.mask
      const autoClear = gl.autoClear
      camera.layers.mask = 1 << SHADOW_LAYER
      gl.autoClear = false
      gl.render(scene as unknown as Object3D, camera)
      camera.layers.mask = mask
      gl.autoClear = autoClear
    }
  }

  let last = -1
  let current = colors
  return (frame: Partial<ArkitFrame>) => {
    const jawOpen = frame.jawOpen ?? 0
    opening = smooth(jawOpen, OPEN_RANGE[0], OPEN_RANGE[1])
    darkness = smooth(jawOpen, DARK_RANGE[0], DARK_RANGE[1])
    // If the renderer rebuilt its colour data, start again from the fresh copy
    const fresh = mesh.splatDataTextures?.baseData?.colors
    if (!fresh) return
    if (fresh !== current) {
      current = fresh
      original = fresh.slice(0, count * 4)
      last = -1
    }
    const state = opening + darkness
    if (Math.abs(state - last) <= WEIGHT_EPSILON && !(state === 0 && last !== 0)) return
    last = state
    for (let j = 0; j < inner.length; j++) {
      const o = inner[j] * 4
      const t = opening * (1 - innerKeep[j])
      // Big blurry splats keep their colour and fade out, rather than turning into dark smudges on the skin
      const tc = t * (1 - innerSize[j])
      for (let c = 0; c < 3; c++) {
        const cavity = DEEP[c] + (NEAR[c] - DEEP[c]) * innerShade[j]
        const tone = SHADOW[c] + (cavity - SHADOW[c]) * darkness
        current[o + c] = Math.round(original[o + c] + (tone - original[o + c]) * tc)
      }
      // The rest turn solid only away from the lip edge
      const opacity = innerSize[j] > 0 ? original[o + 3] * (1 - innerSize[j]) : original[o + 3] + Math.max(0, INNER_OPACITY - original[o + 3]) * innerSolid[j]
      current[o + 3] = Math.round(original[o + 3] + (opacity - original[o + 3]) * t)
    }
  }
}
