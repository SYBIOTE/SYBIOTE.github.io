/**
 * Keeps the LAM renderer's depth sort in step with the eyelid blendshapes.
 *
 * The renderer sorts splats back to front using centres it uploads once, in the rest (open-eye)
 * pose; blendshapes are only applied later, in the draw shader. So a closing eyelid is still
 * sorted behind the iris and the eye shows through it. Here we add the eyelid blendshape offsets
 * to those centres whenever their weights change and re-upload them, so the sort sees the lid
 * where it actually is. With the eyes open the centres are the rest ones and nothing changes.
 */

import type { ArkitFrame } from './arkitMapping'

// Only the shapes that move the lids over the eye change which splats are in front of which
const SORTED_SHAPES = ['eyeBlinkLeft', 'eyeBlinkRight', 'eyeSquintLeft', 'eyeSquintRight', 'eyeWideLeft', 'eyeWideRight'] as const
// Skip re-uploads for changes smaller than this
const WEIGHT_EPSILON = 0.01

interface SortInternals {
  viewer?: {
    skinModel?: {
      morphTargetDictionary?: Record<string, number>
      geometry: { morphAttributes: { position?: { array: ArrayLike<number> }[] } }
    }
    splatMesh?: {
      integerBasedDistancesComputation: boolean
      getSplatCount: () => number
      getFloatCenters: (start: number, end: number, padFour: boolean) => Float32Array
      getIntegerCenters: (start: number, end: number, padFour: boolean) => Int32Array | Uint32Array
      getDataForDistancesComputation: (start: number, end: number) => { centers: Float32Array | Int32Array | Uint32Array }
      updateGPUCentersBufferForDistancesComputation: (isUpdate: boolean, centers: ArrayBufferView, offsetSplats: number) => void
    }
  }
}

interface SparseShape {
  name: (typeof SORTED_SHAPES)[number]
  splats: Uint32Array
  offsets: Float32Array
}

/** Returns an update function to call with each frame's weights, or null if the renderer doesn't expose what's needed. */
export const createBlendshapeSort = (renderer: unknown) => {
  const viewer = (renderer as SortInternals).viewer
  const mesh = viewer?.splatMesh
  const skin = viewer?.skinModel
  const morphs = skin?.geometry.morphAttributes.position
  if (!mesh || !skin?.morphTargetDictionary || !morphs) return null

  const count = mesh.getSplatCount()
  if (count <= 0) return null
  const rest = mesh.getDataForDistancesComputation(0, count - 1).centers
  const integer = mesh.integerBasedDistancesComputation
  // Integer centres are the float ones scaled by a fixed factor; read it off the data
  let scale = 1
  if (integer) {
    const f = mesh.getFloatCenters(0, count - 1, true)
    const n = new Int32Array(mesh.getIntegerCenters(0, count - 1, true).buffer)
    let best = 0
    for (let i = 0; i < f.length && i < 4000; i++) if (Math.abs(f[i]) > Math.abs(f[best])) best = i
    scale = f[best] ? n[best] / f[best] : 1000
  }
  const restValues = integer ? new Int32Array(rest.buffer.slice(0)) : new Float32Array(rest.buffer.slice(0))
  const work = integer ? new Int32Array(restValues.length) : new Float32Array(restValues.length)

  // Splat i rides on mesh vertex i: keep each shape's non-zero offsets only
  const shapes: SparseShape[] = []
  for (const name of SORTED_SHAPES) {
    const index = skin.morphTargetDictionary[name]
    const delta = index === undefined ? undefined : morphs[index]?.array
    if (!delta) continue
    const splats: number[] = []
    const offsets: number[] = []
    for (let i = 0; i < count && i * 3 + 2 < delta.length; i++) {
      const x = delta[i * 3], y = delta[i * 3 + 1], z = delta[i * 3 + 2]
      if (Math.abs(x) + Math.abs(y) + Math.abs(z) < 1e-6) continue
      splats.push(i)
      offsets.push(x, y, z)
    }
    shapes.push({ name, splats: Uint32Array.from(splats), offsets: Float32Array.from(offsets) })
  }
  if (!shapes.length) return null

  const last = new Float32Array(shapes.length)
  return (frame: Partial<ArkitFrame>) => {
    let changed = false
    for (let s = 0; s < shapes.length; s++) if (Math.abs((frame[shapes[s].name] ?? 0) - last[s]) > WEIGHT_EPSILON) changed = true
    if (!changed) return
    work.set(restValues)
    for (let s = 0; s < shapes.length; s++) {
      const { splats, offsets, name } = shapes[s]
      const w = frame[name] ?? 0
      last[s] = w
      if (w < WEIGHT_EPSILON) continue
      const k = w * scale
      for (let j = 0; j < splats.length; j++) {
        const o = splats[j] * 4
        work[o] += offsets[j * 3] * k
        work[o + 1] += offsets[j * 3 + 1] * k
        work[o + 2] += offsets[j * 3 + 2] * k
      }
    }
    mesh.updateGPUCentersBufferForDistancesComputation(true, work, 0)
  }
}
