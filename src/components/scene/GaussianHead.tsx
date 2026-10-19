/**
 * Photoreal talking head rendered with LAM Gaussian splats.
 *
 * The renderer owns its own canvas and calls our callbacks every frame:
 * - getExpressionData: we run the existing viseme + emote services against a virtual
 *   ARKit rig and return 52 blendshape weights
 * - getChatState: Idle / Listening / Thinking / Responding, which drives the avatar's
 *   built-in head motion clips
 */

import { memo, useEffect, useRef, useState, type CSSProperties } from 'react'
import type { ChatState, GaussianSplatRenderer } from 'gaussian-splat-renderer-for-lam'
import { Vector3 } from 'three'

import { createVirtualRig, rigToArkit, type ArkitBlendshape, type ArkitMappingOptions } from './avatar/arkitMapping'
import { createEyeMotion, gazeToArkit, updateEyeMotion } from './avatar/eyeMotion'
import { A2E_CHANNELS } from '../../services/audio2expression/postprocess'
import { sampleSpeechFace } from '../../services/audio2expression/speechFace'
import { useAgentActions, useAgentState } from './avatar/AgentContext'

const WELCOME_LINE = "Oh hey there! Welcome to my website! I'm Rahul, ask me anything about my work and projects!"

// The renderer is a singleton bound to one canvas, so load it once per page.
let rendererPromise: Promise<GaussianSplatRenderer | undefined> | null = null

// LAM avatars' expression shapes are subtle on camera: boost the ones that carry emotion,
// and the jaw slightly so speech reads
const DEFAULT_SHAPE_GAINS: Partial<Record<ArkitBlendshape, number>> = {
  mouthSmileLeft: 1.5,
  mouthSmileRight: 1.5,
  cheekSquintLeft: 1.3,
  cheekSquintRight: 1.3,
  browInnerUp: 1.3,
  browDownLeft: 1.3,
  browDownRight: 1.3,
  browOuterUpLeft: 1.3,
  browOuterUpRight: 1.3,
  jawOpen: 1.15
}

// Audio-driven frames cover mouth, jaw, cheeks and brows; blinks and gaze stay with the avatar's
// own systems so the eyes keep their natural behaviour
const SPEECH_FACE_CHANNELS = A2E_CHANNELS.map((name, i) => [name, i] as const).filter(
  ([name]) => !name.startsWith('eyeBlink') && !name.startsWith('eyeLook')
)

// Framing: the frame runs from just above the hair down to where the bust's splats end, so the
// reconstruction's cut-off sits exactly on the tile's bottom edge and nothing looks chopped off
// Headroom above the hair as a share of the frame, so the built-in nods don't clip it
const HEADROOM = 0.06
// Narrowest visible width (metres), so tall phone tiles still show the cheeks and ears. Tall tiles
// get the extra height above the hair, so the cut-off always stays on the bottom edge
const MIN_VISIBLE_WIDTH = 0.18
// Push the frame's bottom just past the cut-off, so the head's nods and breathing don't lift it into view
const CUT_MARGIN = 0.012
// Fallbacks when splat positions aren't available: crown above the brow, cut below the chin
const CROWN_ABOVE_BROW = 0.11
const CUT_BELOW_CHIN = 0.05
// Vertical field of view (degrees), like an ~85mm portrait lens. The renderer's default 50° puts the
// camera ~30cm from the face to fill the tile, which reads as a selfie: bigger nose, narrower cheeks
const PORTRAIT_FOV = 16
// How far above eye level the camera sits (degrees), like a laptop webcam on top of the screen
const CAMERA_ELEVATION = 9
// The hair top and the neck sit roughly this far behind the eyes (metres), for fitting the frame
const BEHIND_EYES = 0.04

interface RendererInternals {
  viewer?: {
    camera?: {
      fov: number
      position: Vector3
      lookAt: (x: number, y: number, z: number) => void
      updateProjectionMatrix: () => void
      setViewOffset: (fullWidth: number, fullHeight: number, x: number, y: number, width: number, height: number) => void
    }
    skinModel?: { skeleton?: { bones: { name: string; getWorldPosition: (target: Vector3) => Vector3 }[] } }
    splatMesh?: { morphedMesh?: Float32Array }
  }
}

/** Vertical extent of the bust from its splat centres (x, y, z per splat), ignoring stray splats. */
const measureBust = (centres: Float32Array | undefined) => {
  const count = centres ? Math.floor(centres.length / 3) : 0
  if (!centres || count < 100) return null
  const ys = new Float32Array(count)
  for (let i = 0; i < count; i++) ys[i] = centres[i * 3 + 1]
  ys.sort()
  const at = (q: number) => ys[Math.floor(q * (count - 1))]
  return { cut: at(0.02), crown: at(0.998) }
}

/**
 * The renderer's default camera shows ~1m of height, so the head floats small in the frame.
 * Re-aim it from the avatar's own eye bones: eyes on the upper third, head and shoulders filling
 * the frame. Works for any LAM avatar since it reads the skeleton.
 */
const frameLikeWebcam = (renderer: GaussianSplatRenderer, aspect: number) => {
  const viewer = (renderer as unknown as RendererInternals).viewer
  const camera = viewer?.camera
  const bones = viewer?.skinModel?.skeleton?.bones
  if (!camera || !bones || !(aspect > 0)) return

  const centreOf = (names: string[]) => {
    const found = bones.filter((b) => names.includes(b.name))
    if (!found.length) return null
    const c = new Vector3()
    for (const bone of found) c.add(bone.getWorldPosition(new Vector3()))
    return c.divideScalar(found.length)
  }
  const eyes = centreOf(['lEye', 'rEye'])
  if (!eyes) return
  const brow = centreOf(['CenterBrow']) ?? eyes.clone().setY(eyes.y + 0.02)
  const chin = centreOf(['Chin']) ?? eyes.clone().setY(eyes.y - 0.09)

  // Frame from the hair down to the bust's cut-off (measured from the splats when possible)
  const measured = measureBust(viewer?.splatMesh?.morphedMesh)
  // Only trust it once the splats are posed (before the first frame they can still be all zeros)
  const bust = measured && measured.crown > eyes.y && measured.cut < chin.y && measured.cut > chin.y - 0.3 ? measured : null
  const crown = bust?.crown ?? brow.y + CROWN_ABOVE_BROW
  const cut = (bust?.cut ?? chin.y - CUT_BELOW_CHIN) + CUT_MARGIN

  let height = (crown - cut) / (1 - HEADROOM)
  let top = crown + height * HEADROOM
  // Tall tiles: grow the frame upwards so the face isn't cropped at the sides
  const needed = MIN_VISIBLE_WIDTH / aspect
  if (needed > height) {
    top += needed - height
    height = needed
  }
  const bottom = top - height
  const distance = height / 2 / Math.tan(((PORTRAIT_FOV / 2) * Math.PI) / 180)
  // Sit slightly above the eyes and aim at them, like a laptop webcam: aiming at the frame's centre
  // from below looks up at the face and shows the underside of the chin
  const elevation = (CAMERA_ELEVATION * Math.PI) / 180
  camera.position.set(eyes.x, eyes.y + distance * Math.sin(elevation), eyes.z + distance * Math.cos(elevation))
  camera.lookAt(eyes.x, eyes.y, eyes.z)

  // Fit the frame (hair to bust cut-off) by angle from the camera's axis, then shift the lens so it
  // sits there without re-aiming. The hair and neck are a few cm behind the eyes
  const forward = new Vector3(0, -Math.sin(elevation), -Math.cos(elevation))
  const up = new Vector3(0, Math.cos(elevation), -Math.sin(elevation))
  const tangentOf = (y: number) => {
    const v = new Vector3(eyes.x, y, eyes.z - BEHIND_EYES).sub(camera.position)
    return v.dot(up) / v.dot(forward)
  }
  const tTop = tangentOf(top)
  const tBottom = tangentOf(bottom)
  const half = (tTop - tBottom) / 2
  camera.fov = (2 * Math.atan(half) * 180) / Math.PI
  const FULL = 1000
  camera.setViewOffset(FULL * aspect, FULL, 0, (-(tTop + tBottom) / 2 / (2 * half)) * FULL, FULL * aspect, FULL)
  camera.updateProjectionMatrix()
}

interface GaussianHeadProps {
  /** URL of the LAM avatar .zip */
  avatarUrl: string
  mapping?: ArkitMappingOptions
  /** Called if the avatar can't be loaded, so the caller can fall back */
  onError?: () => void
  /** Say the welcome line once loaded. Hold it until the visitor has interacted, or the browser blocks the audio */
  greet?: boolean
  /** Line spoken when greeting (defaults to a generic welcome) */
  greeting?: string
  /** Render captions over the head (off when the surrounding layout shows its own) */
  showSubtitle?: boolean
  /** Show the built-in loading bar (off when the surrounding layout shows its own state) */
  showLoading?: boolean
  /** Called once the head has loaded and is rendering */
  onReady?: () => void
}

const GaussianHeadComponent = ({
  avatarUrl,
  mapping,
  onError,
  greet = true,
  greeting = WELCOME_LINE,
  showSubtitle = true,
  showLoading = true,
  onReady
}: GaussianHeadProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const [ready, setReady] = useState(false)

  const actions = useAgentActions()
  const state = useAgentState()

  // The renderer's callbacks are created once, so read the latest agent data through refs
  const actionsRef = useRef(actions)
  const stateRef = useRef(state)
  const mappingRef = useRef(mapping)
  actionsRef.current = actions
  stateRef.current = state
  mappingRef.current = mapping

  const rigRef = useRef(createVirtualRig())
  const eyesRef = useRef(createEyeMotion())
  const [failed, setFailed] = useState(false)
  const onErrorRef = useRef(onError)
  const onReadyRef = useRef(onReady)
  onErrorRef.current = onError
  onReadyRef.current = onReady

  // Tell the caller once the head is actually rendering
  useEffect(() => {
    if (ready && !failed) onReadyRef.current?.()
  }, [ready, failed])

  // Dev-only handle for tuning expressions from the console: __gaussianHead.set('viseme_aa', 1)
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const rig = rigRef.current
    ;(window as unknown as Record<string, unknown>).__gaussianHead = {
      rig,
      set: (name: string, value: number) => {
        rig.morphs[0].morphTargetInfluences[rig.dictionary[name][0]] = value
      },
      frame: () => rigToArkit(rig, mappingRef.current)
    }
  }, [])

  // Point the emote and viseme services at the virtual rig
  const { setupEmotesForMorphTargets, setupVisemesForMorphTargets } = actions
  useEffect(() => {
    const rig = rigRef.current
    setupEmotesForMorphTargets(rig.morphs, rig.dictionary)
    setupVisemesForMorphTargets(rig.morphs, rig.dictionary)
  }, [setupEmotesForMorphTargets, setupVisemesForMorphTargets])

  useEffect(() => {
    const container = containerRef.current
    if (!container || rendererPromise) return

    let lastFrame = performance.now()

    const getExpressionData = () => {
      const now = performance.now()
      const delta = Math.min((now - lastFrame) / 1000, 0.25)
      lastFrame = now

      // Never throw from here: an exception would stop the renderer's frame loop
      try {
        const a = actionsRef.current
        const rig = rigRef.current
        a.updateVisemes(delta)
        a.applyVisemesToRig(delta)
        a.updateEmotes(delta)
        a.applyEmotesToMorphTargets(rig.morphs, rig.dictionary)
        updateEyeMotion(eyesRef.current, getChatState(), now, delta)
        const extra = gazeToArkit(eyesRef.current)
        // When the voice's own face frames cover this moment they drive the mouth, replacing the
        // text-estimated visemes; emotions from the rig still layer on top
        const speech = sampleSpeechFace(now)
        if (speech) for (const [name, i] of SPEECH_FACE_CHANNELS) extra[name] = (extra[name] ?? 0) + speech[i]
        return rigToArkit(rig, {
          shapeGains: DEFAULT_SHAPE_GAINS,
          ...mappingRef.current,
          ...(speech ? { visemeGain: 0 } : {}),
          extra
        })
      } catch (error) {
        logger.warn('GaussianHead: expression update failed', error)
        return {}
      }
    }

    const getChatState = (): ChatState => {
      const s = stateRef.current
      if (s?.ttsIsSpeaking) return 'Responding'
      if (s?.llmThinking) return 'Thinking'
      if (s?.vadIsDetecting || s?.currentTranscript) return 'Listening'
      return 'Idle'
    }

    rendererPromise = import('gaussian-splat-renderer-for-lam').then(({ GaussianSplatRenderer }) =>
      GaussianSplatRenderer.getInstance(container, avatarUrl, {
        getExpressionData,
        getChatState,
        backgroundColor: '0x000000',
        alpha: 0,
        downloadProgress: (p) => setProgress(p * 0.8),
        loadProgress: (p) => {
          setProgress(0.8 + p * 0.2)
          if (p >= 1) setReady(true)
        }
      })
    )

    rendererPromise
      .then((renderer) => {
        if (!renderer) throw new Error('Gaussian head failed to load')
        // Re-frame whenever the tile changes shape (sharing, transcript, rotation)
        const reframe = () => {
          const { width, height } = container.getBoundingClientRect()
          if (width && height) frameLikeWebcam(renderer, width / height)
        }
        reframe()
        new ResizeObserver(reframe).observe(container)
        container.querySelector('canvas')?.addEventListener('webglcontextlost', () => {
          logger.warn('GaussianHead: WebGL context lost')
          setFailed(true)
          onErrorRef.current?.()
        })
        if (import.meta.env.DEV) {
          const handle = (window as unknown as Record<string, Record<string, unknown>>).__gaussianHead
          if (handle) handle.renderer = renderer
        }
      })
      .catch((error) => {
        logger.error('GaussianHead:', error)
        rendererPromise = null
        setFailed(true)
        onErrorRef.current?.()
      })
    // Loaded once for the lifetime of the page (renderer is a singleton)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Greet once the head is visible (and the caller allows it)
  const greetedRef = useRef(false)
  useEffect(() => {
    if (!ready || !greet || greetedRef.current) return
    greetedRef.current = true
    actionsRef.current.performEmotionAction({ emotion: 'happy', relaxTime: 3000 })
    actionsRef.current.speak(greeting)
    // greeting is read once, when the greet fires
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, greet])

  return (
    <div style={styles.root}>
      <div ref={containerRef} style={styles.canvasHost} />
      {showLoading && !ready && !failed && (
        <div style={styles.loading}>
          <div style={styles.loadingTrack}>
            <div style={{ ...styles.loadingBar, width: `${Math.round(progress * 100)}%` }} />
          </div>
        </div>
      )}
      {showSubtitle && <Subtitle text={state.llmThinking ? 'Thinking…' : state.currentSubtitle} />}
    </div>
  )
}

const Subtitle = memo(({ text }: { text?: string }) =>
  text ? (
    <div style={styles.subtitleWrap}>
      <div style={styles.subtitle}>{text}</div>
    </div>
  ) : null
)
Subtitle.displayName = 'Subtitle'

const styles: Record<string, CSSProperties> = {
  root: { position: 'absolute', inset: 0, overflow: 'hidden' },
  canvasHost: { position: 'absolute', inset: 0 },
  loading: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none'
  },
  loadingTrack: {
    width: 'min(240px, 60%)',
    height: 4,
    borderRadius: 999,
    background: 'rgba(255,255,255,0.12)',
    overflow: 'hidden'
  },
  loadingBar: { height: '100%', background: 'rgba(255,255,255,0.8)', transition: 'width 0.2s ease-out' },
  subtitleWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '12%',
    display: 'flex',
    justifyContent: 'center',
    padding: '0 16px',
    pointerEvents: 'none'
  },
  subtitle: {
    maxWidth: 640,
    padding: '10px 16px',
    borderRadius: 14,
    background: 'rgba(15,17,19,0.55)',
    border: '1px solid rgba(255,255,255,0.12)',
    backdropFilter: 'blur(12px)',
    color: '#fff',
    fontSize: 16,
    lineHeight: 1.45,
    textAlign: 'center'
  }
}

export const GaussianHead = memo(GaussianHeadComponent)
