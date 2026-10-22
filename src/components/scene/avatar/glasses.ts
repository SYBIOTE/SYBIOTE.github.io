/**
 * Puts a pair of glasses (a regular glTF mesh) on the LAM Gaussian head.
 *
 * The renderer draws its own three.js scene first and the splats over it, depth-tested but not
 * depth-writing. So anything we add there hides the splats behind it (the face behind the frame)
 * while splats in front of it still cover it (the head over the temple arms).
 *
 * The splats are skinned in the shader from the avatar's skeleton, which lives in that scene but is
 * hidden, and hidden parents hide their children. So the glasses sit at the scene root and follow
 * a frame built every frame from the eye and nose bones, keeping the offset they were fitted with.
 * (The bones' own world matrices carry the rig's centimetre scaling unevenly, but their positions
 * are clean, so the frame is built from positions.)
 *
 * The model is only the frame, so lenses are made here from the holes in its front. They're see-through,
 * and a see-through lens drawn before the splats would just be painted over by the face, so they're
 * kept on their own layer and drawn in an extra pass after the splats.
 *
 * Once the head's own fade-in has finished, the glasses materialise outward from the bridge with a
 * glowing edge and the lenses fade in. The frame is revealed by discarding pixels rather than fading
 * it, since a half-transparent frame drawn before the splats would punch holes in the face.
 */

import {
  AmbientLight,
  Box3,
  CanvasTexture,
  DirectionalLight,
  DoubleSide,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
  SRGBColorSpace,
  Vector3,
  type BufferGeometry,
  type Material,
  type Object3D
} from 'three'
import { DRACOLoader, GLTFLoader } from 'three/examples/jsm/Addons.js'

// Same decoder drei's useGLTF uses
const DRACO_DECODER_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.5/'

// Width across the front of the frame, as a multiple of the distance between the eyes
const WIDTH_PER_EYE_SPACING = 2.3
// Where the centre of the frame's front sits relative to the eye bones (eyeball centres, metres).
// It's raised since the model's bounds include the temples, which run along the top
const FORWARD_OF_EYES = 0.025
const ABOVE_EYES = 0.013
// The model is authored with the front facing +X and the temples running back along -X; turn it to face +Z
const MODEL_YAW = -Math.PI / 2

// Lenses: vertices this far behind the front (share of the model's length) count as the front of the frame
const FRONT_DEPTH = 0.08
// The lens plane sits this far behind the front, inside the rims
const LENS_INSET = 0.02
// Mask resolution across the front, and how many cells the lenses reach under the rims
const LENS_GRID = 320
const LENS_TUCK = 3
// Holes smaller than this share of the front are gaps in the mesh, not lens openings
const MIN_LENS_AREA = 0.02
// Layer the lenses live on, so the renderer's normal pass skips them
const LENS_LAYER = 5

// Appearing: how long the reveal takes, a short beat after the head has faded in (ms)
const REVEAL_DELAY = 150
const REVEAL_DURATION = 1100
// Start anyway after this long, in case the head's fade can't be read or never quite finishes (ms)
const REVEAL_FALLBACK = 10000
// Width of the glowing edge (model units, the front is ~1 wide) and its colour
const REVEAL_GLOW_WIDTH = 0.06
const REVEAL_GLOW_COLOR = new Vector3(0.55, 0.85, 1)
// Share of the reveal after which the lenses start fading in
const LENS_FADE_START = 0.55

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)

/**
 * Lets a frame material be revealed outward from a point, measured across the front (so the temples
 * appear along with the hinges they hang from): pixels beyond the radius are discarded and those just
 * inside it glow. Returns the uniforms to drive it.
 */
const addReveal = (material: Material, centre: Vector3) => {
  const uniforms = {
    revealRadius: { value: 0 },
    revealCentre: { value: centre },
    revealGlowWidth: { value: REVEAL_GLOW_WIDTH },
    revealGlowColor: { value: REVEAL_GLOW_COLOR }
  }
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRevealPosition;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRevealPosition = position;')
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vRevealPosition;
        uniform float revealRadius;
        uniform vec3 revealCentre;
        uniform float revealGlowWidth;
        uniform vec3 revealGlowColor;`
      )
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        float revealDistance = distance(vRevealPosition.yz, revealCentre.yz);
        if (revealDistance > revealRadius) discard;`
      )
      .replace(
        '#include <dithering_fragment>',
        `gl_FragColor.rgb += revealGlowColor * (1.0 - smoothstep(0.0, revealGlowWidth, revealRadius - revealDistance));
        #include <dithering_fragment>`
      )
  }
  material.customProgramCacheKey = () => 'glasses-reveal'
  material.needsUpdate = true
  return uniforms
}

interface Bone {
  name: string
  getWorldPosition: (target: Vector3) => Vector3
  updateWorldMatrix: (updateParents: boolean, updateChildren: boolean) => void
}

const _l = new Vector3()
const _r = new Vector3()
const _n = new Vector3()
const _x = new Vector3()
const _y = new Vector3()
const _z = new Vector3()

/** Rigid frame of the head: origin between the eyes, x across them, y towards the nose tip. */
const headFrame = (lEye: Bone, rEye: Bone, nose: Bone, target: Matrix4) => {
  lEye.getWorldPosition(_l)
  rEye.getWorldPosition(_r)
  nose.getWorldPosition(_n)
  _x.subVectors(_l, _r).normalize()
  const origin = _l.add(_r).multiplyScalar(0.5)
  _y.subVectors(_n, origin)
  _y.addScaledVector(_x, -_y.dot(_x)).normalize()
  _z.crossVectors(_x, _y)
  return target.makeBasis(_x, _y, _z).setPosition(origin)
}

/**
 * Flat lenses filling the openings in the frame's front. The front is rasterised looking down the
 * model's +X axis; empty cells that can't be reached from the edge are the openings.
 */
const makeLenses = (geometry: BufferGeometry) => {
  geometry.computeBoundingBox()
  const box = geometry.boundingBox!
  const position = geometry.attributes.position
  const frontX = box.max.x - (box.max.x - box.min.x) * FRONT_DEPTH
  const width = box.max.z - box.min.z
  const height = box.max.y - box.min.y
  const cols = LENS_GRID
  const rows = Math.max(8, Math.round((LENS_GRID * height) / width))
  // Looking at the front from +X, +Z is on the left
  const col = (z: number) => Math.min(cols - 1, Math.floor(((box.max.z - z) / width) * cols))
  const row = (y: number) => Math.min(rows - 1, Math.floor(((box.max.y - y) / height) * rows))

  // Frame cells, grown by one to close the gaps between vertices
  const frame = new Uint8Array(cols * rows)
  for (let i = 0; i < position.count; i++) {
    if (position.getX(i) < frontX) continue
    const c = col(position.getZ(i))
    const r = row(position.getY(i))
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr
        const cc = c + dc
        if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) frame[rr * cols + cc] = 1
      }
  }

  // Label the empty regions; the ones touching the edge are outside the frame
  const region = new Int32Array(cols * rows).fill(-1)
  const lens = new Uint8Array(cols * rows)
  const stack: number[] = []
  for (let start = 0; start < frame.length; start++) {
    if (frame[start] || region[start] >= 0) continue
    const cells: number[] = []
    let outside = false
    region[start] = start
    stack.push(start)
    while (stack.length) {
      const i = stack.pop()!
      cells.push(i)
      const r = Math.floor(i / cols)
      const c = i % cols
      if (r === 0 || c === 0 || r === rows - 1 || c === cols - 1) outside = true
      for (const j of [i - cols, i + cols, c > 0 ? i - 1 : -1, c < cols - 1 ? i + 1 : -1]) {
        if (j < 0 || j >= frame.length || frame[j] || region[j] >= 0) continue
        region[j] = start
        stack.push(j)
      }
    }
    if (!outside && cells.length > MIN_LENS_AREA * cols * rows) for (const i of cells) lens[i] = 1
  }

  // Draw the lenses: a faint tint with a soft diagonal sheen, reaching a little under the rims
  const canvas = document.createElement('canvas')
  canvas.width = cols
  canvas.height = rows
  const ctx = canvas.getContext('2d')!
  const sheen = ctx.createLinearGradient(0, 0, cols, rows)
  sheen.addColorStop(0, 'rgba(235, 245, 255, 0.06)')
  sheen.addColorStop(0.3, 'rgba(255, 255, 255, 0.22)')
  sheen.addColorStop(0.42, 'rgba(225, 238, 250, 0.06)')
  sheen.addColorStop(0.7, 'rgba(255, 255, 255, 0.15)')
  sheen.addColorStop(0.8, 'rgba(220, 235, 250, 0.05)')
  sheen.addColorStop(1, 'rgba(230, 240, 255, 0.08)')
  ctx.fillStyle = sheen
  ctx.fillRect(0, 0, cols, rows)
  const image = ctx.getImageData(0, 0, cols, rows)
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      let inside = false
      for (let dr = -LENS_TUCK; dr <= LENS_TUCK && !inside; dr++)
        for (let dc = -LENS_TUCK; dc <= LENS_TUCK && !inside; dc++) {
          const rr = r + dr
          const cc = c + dc
          inside = rr >= 0 && rr < rows && cc >= 0 && cc < cols && lens[rr * cols + cc] === 1
        }
      if (!inside) image.data[(r * cols + c) * 4 + 3] = 0
    }
  ctx.putImageData(image, 0, 0)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  const material = new MeshBasicMaterial({ map: texture, transparent: true, opacity: 0, depthWrite: false, side: DoubleSide })
  // A plane over the whole front, turned to face +X (its +X runs along -Z, matching the columns)
  const mesh = new Mesh(new PlaneGeometry(width, height), material)
  mesh.rotation.y = Math.PI / 2
  mesh.position.set(box.max.x - (box.max.x - box.min.x) * LENS_INSET, (box.min.y + box.max.y) / 2, (box.min.z + box.max.z) / 2)
  mesh.layers.set(LENS_LAYER)
  mesh.name = 'lenses'
  return mesh
}

interface GlassesInternals {
  viewer?: {
    threeScene?: { add: (object: Object3D) => void; remove: (object: Object3D) => void }
    skinModel?: { skeleton?: { bones: Bone[] } }
    splatMesh?: { visibleRegionFadeStartRadius?: number; visibleRegionBufferRadius?: number }
    camera?: { layers: { mask: number } }
    renderer?: {
      autoClear: boolean
      render: (scene: Object3D, camera: unknown) => void
    }
    render?: () => void
  }
}

/** Loads the glasses and fits them to the head. Returns a function that removes them again. */
export const attachGlasses = async (renderer: unknown, url: string) => {
  const viewer = (renderer as GlassesInternals).viewer
  const scene = viewer?.threeScene
  const bones = viewer?.skinModel?.skeleton?.bones
  const find = (name: string) => bones?.find((b) => b.name === name)
  const lEye = find('lEye')
  const rEye = find('rEye')
  const nose = find('Nose')
  if (!scene || !lEye || !rEye || !nose) throw new Error('avatar has no eye and nose bones')

  const draco = new DRACOLoader().setDecoderPath(DRACO_DECODER_PATH)
  const loader = new GLTFLoader().setDRACOLoader(draco)
  const gltf = await loader.loadAsync(url).finally(() => draco.dispose())
  const model = gltf.scene
  const frames: Mesh[] = []
  model.traverse((object) => {
    if ((object as Mesh).isMesh) frames.push(object as Mesh)
  })
  const lenses: MeshBasicMaterial[] = []
  const reveals: { radius: number; uniforms: ReturnType<typeof addReveal> }[] = []
  for (const frame of frames) {
    const lens = makeLenses(frame.geometry)
    frame.add(lens)
    lenses.push(lens.material)
    // Reveal outward from the bridge, out to the corners of the front
    const box = frame.geometry.boundingBox!
    const centre = new Vector3(box.max.x, (box.min.y + box.max.y) / 2, (box.min.z + box.max.z) / 2)
    const radius = Math.hypot(box.max.y - centre.y, box.max.z - centre.z) + REVEAL_GLOW_WIDTH
    for (const material of Array.isArray(frame.material) ? frame.material : [frame.material])
      reveals.push({ radius, uniforms: addReveal(material, centre) })
  }

  // Put the centre of the frame's front face at the origin, and make the front 1 unit wide
  const box = new Box3().setFromObject(model)
  const width = box.max.z - box.min.z
  model.position.set(-box.max.x, -(box.min.y + box.max.y) / 2, -(box.min.z + box.max.z) / 2).divideScalar(width)
  model.scale.setScalar(1 / width)

  // Fit in world space from the eyes: across them, facing the camera, upright
  lEye.updateWorldMatrix(true, false)
  rEye.updateWorldMatrix(true, false)
  nose.updateWorldMatrix(true, false)
  const left = lEye.getWorldPosition(new Vector3())
  const right = rEye.getWorldPosition(new Vector3())
  const spacing = left.distanceTo(right)
  const across = left.clone().sub(right).normalize()
  const forward = across.clone().cross(new Vector3(0, 1, 0)).normalize()
  const up = forward.clone().cross(across)
  const rotation = new Quaternion()
    .setFromRotationMatrix(new Matrix4().makeBasis(across, up, forward))
    .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), MODEL_YAW))
  const position = left
    .add(right)
    .multiplyScalar(0.5)
    .addScaledVector(forward, FORWARD_OF_EYES)
    .addScaledVector(up, ABOVE_EYES)
  const scale = spacing * WIDTH_PER_EYE_SPACING
  const fitted = new Matrix4().compose(position, rotation, new Vector3(scale, scale, scale))
  const offset = headFrame(lEye, rEye, nose, new Matrix4()).invert().multiply(fitted)

  // Follow the head: the skeleton is added to the scene before us, so its world matrices are
  // already current for this frame when ours are updated
  const frame = new Matrix4()
  const glasses = new Group()
  glasses.name = 'glasses'
  glasses.matrixAutoUpdate = false
  glasses.add(model)
  const updateMatrixWorld = glasses.updateMatrixWorld.bind(glasses)
  // Appear once the head has faded in (straight away if the visitor prefers less motion)
  const attachedAt = performance.now()
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  let revealStart: number | null = null
  let revealed = false
  const headFadedIn = () => {
    const splats = viewer.splatMesh
    const buffer = splats?.visibleRegionBufferRadius ?? 0
    return buffer > 0 && (splats?.visibleRegionFadeStartRadius ?? 0) / buffer > 0.99
  }
  const updateReveal = (now: number) => {
    if (revealed) return
    if (revealStart === null) {
      if (reducedMotion) revealStart = -Infinity
      else if (headFadedIn() || now - attachedAt > REVEAL_FALLBACK) revealStart = now + REVEAL_DELAY
      else return
    }
    const t = Math.min(Math.max((now - revealStart) / REVEAL_DURATION, 0), 1)
    const shown = easeInOutCubic(t)
    for (const { radius, uniforms } of reveals) uniforms.revealRadius.value = shown * radius
    const lensShown = Math.min(Math.max((t - LENS_FADE_START) / (1 - LENS_FADE_START), 0), 1)
    for (const lens of lenses) lens.opacity = lensShown
    revealed = t >= 1
  }

  glasses.updateMatrixWorld = (force?: boolean) => {
    updateReveal(performance.now())
    glasses.matrix.multiplyMatrices(headFrame(lEye, rEye, nose, frame), offset)
    glasses.matrixWorldNeedsUpdate = true
    updateMatrixWorld(force)
  }

  // The renderer's scene has no lights of its own
  const ambient = new AmbientLight(0xffffff, 1.2)
  const key = new DirectionalLight(0xffffff, 2)
  key.position.set(0.5, 1, 2)

  scene.add(glasses)
  scene.add(ambient)
  scene.add(key)

  // Draw the lenses over the splats, depth-tested against the frame so the rims stay in front
  const render = viewer.render
  const gl = viewer.renderer
  const camera = viewer.camera
  if (render && gl && camera) {
    viewer.render = function (this: unknown) {
      render.call(this)
      const mask = camera.layers.mask
      const autoClear = gl.autoClear
      camera.layers.mask = 1 << LENS_LAYER
      gl.autoClear = false
      gl.render(scene as unknown as Object3D, camera)
      camera.layers.mask = mask
      gl.autoClear = autoClear
    }
  }

  return () => {
    if (render) viewer.render = render
    scene.remove(glasses)
    scene.remove(ambient)
    scene.remove(key)
  }
}
