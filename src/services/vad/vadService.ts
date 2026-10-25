import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {  defaultVadConfig, type VADConfig, type VADResult } from './vadConfig'

// Type for VAD instance
interface VADInstance {
  start: () => void
  pause: () => void
  destroy?: () => void
}

interface VADProbs {
  isSpeech: number
}

// vad-web fetches its model, worklet and onnxruntime (its own 1.14, separate from ours) from these
// at start. Pinned to the installed versions (its default is @latest), and warmed by preloadVAD()
const VAD_ASSET_PATH = 'https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.24/dist/'
const VAD_ORT_WASM_PATH = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/'
// Without cross-origin isolation onnxruntime 1.14 runs single-threaded, which is the SIMD build
const VAD_FILES = [
  `${VAD_ASSET_PATH}silero_vad_v5.onnx`,
  `${VAD_ASSET_PATH}vad.worklet.bundle.min.js`,
  `${VAD_ORT_WASM_PATH}ort-wasm-simd.wasm`
]

let vadPreload: Promise<void> | null = null

/** Downloads the VAD code and its ~12MB of assets into the HTTP cache, so turning the mic on is quick. */
export const preloadVAD = (): Promise<void> => {
  vadPreload ??= Promise.all([
    import('@ricky0123/vad-web'),
    ...VAD_FILES.map((url) => fetch(url).then((response) => response.arrayBuffer()))
  ])
    .then(() => undefined)
    .catch((error) => logger.warn('VAD preload failed:', error))
  return vadPreload
}

interface UseVADServiceProps {
  config?: Partial<VADConfig>
  onVADResult?: (result: VADResult) => void
  onSpeechStart?: () => void
  onSpeechEnd?: (audio: ArrayBuffer) => void
  /** Speech started but was too short to count (a click, a breath) */
  onMisfire?: () => void
}

export const useVADService = ({
  config: configPartial = {},
  onVADResult,
  onSpeechStart,
  onSpeechEnd,
  onMisfire
}: UseVADServiceProps = {}) => {
  const config = useMemo(() => ({ ...defaultVadConfig, ...configPartial }), [configPartial])

  const [isListening, setIsListening] = useState(false)
  const [isDetecting, setIsDetecting] = useState(false)
  const vadRef = useRef<VADInstance | null>(null)
  const [vadInstance, setVadInstance] = useState<VADInstance | null>(null)


  useEffect(()=>{logger.log("set listening" , isListening)},[isListening])
  const handleVADResult = useCallback(
    (result: VADResult) => {
      // logger.log('VAD Result:', result)
      setIsDetecting(result.isSpeech)

      // Call callback if provided
      onVADResult?.(result)
    },
    [onVADResult]
  )

  const initializeVAD = useCallback(async () => {
    try {
      const originalWarn = logger.warn
      logger.warn = (...args: unknown[]) => {
        const firstArgStr = typeof args[0] === 'string' ? args[0] : ''
        if (
          firstArgStr.includes('onnxruntime') || 
          firstArgStr.includes('Removing initializer')
        ) {
          return // Suppress these warnings
        }
        originalWarn(...args)
      }

      // Loaded on first use so the VAD's onnxruntime stays out of the initial bundle
      const { MicVAD } = await import('@ricky0123/vad-web')
      const vad = await MicVAD.new({
        positiveSpeechThreshold: config.vadThreshold,
        minSpeechFrames: 5,
        preSpeechPadFrames: 10,
        // ~0.38s of silence ends a segment (default ~0.77s); Smart Turn then decides if the turn is over
        redemptionFrames: 12,
        model: 'v5',
        baseAssetPath: VAD_ASSET_PATH,
        onnxWASMBasePath: VAD_ORT_WASM_PATH,
        onFrameProcessed: (probs: VADProbs) => {
          if (probs.isSpeech && probs.isSpeech > config.vadThreshold) {
            handleVADResult({
              isSpeech: true,
              confidence: probs.isSpeech
            })
          }
        },
        // Too short to be speech (a click, a breath): it's over, so don't stay "detecting"
        onVADMisfire: () => {
          setIsDetecting(false)
          onMisfire?.()
        },
        onSpeechStart: () => {
          logger.log('Speech started')
          setIsDetecting(true)
          onSpeechStart?.()
        },
        onSpeechEnd: (audio: Float32Array) => {
          //   logger.log('Speech ended', audio)
          setIsDetecting(false)

          // Convert Float32Array to ArrayBuffer for compatibility
          const buffer = new ArrayBuffer(audio.length * 4)
          const view = new Float32Array(buffer)
          view.set(audio)

          handleVADResult({
            isSpeech: false,
            confidence: 1.0,
            audio: buffer
          })

          onSpeechEnd?.(buffer)
        }
      })
      logger.warn = originalWarn
      vadRef.current = vad
      setVadInstance(vad)
    } catch (error) {
      logger.error('Failed to initialize VAD:', error)
    }
  }, [config.vadThreshold, handleVADResult, onSpeechStart, onSpeechEnd, onMisfire])

  const startListening = useCallback(async () => {
    if (!vadInstance) {
      await initializeVAD()
    }

    if (vadRef.current) {
      try {
        vadRef.current.start()
        setIsListening(true)
      } catch (error) {
        logger.error('Failed to start VAD:', error)
      }
    }
  }, [vadInstance, initializeVAD])

  const stopListening = useCallback(() => {
    if (vadRef.current) {
      try {
        vadRef.current.pause()
        setIsListening(false)
        setIsDetecting(false)
        logger.log('VAD stopped listening')
      } catch (error) {
        logger.error('Failed to stop VAD:', error)
      }
    }
  }, [])

  // Auto-start/stop based on microphone enabled setting
  useEffect(() => {
    if (config.microphoneEnabled && config.vadEnabled) {
      startListening()
    } else {
      stopListening()
    }
  }, [config.microphoneEnabled, config.vadEnabled, startListening, stopListening])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (vadRef.current) {
        vadRef.current.pause()
      }
    }
  }, [])

  const actions = useMemo(
    () => ({
      startListening,
      stopListening,
      initializeVAD
    }),
    [startListening, stopListening, initializeVAD]
  )

  const state = useMemo(() => ({
    isListening,
    isDetecting
  }), [isListening, isDetecting])

  return useMemo(
    () => ({
      state,
      actions
    }),
    [state, actions]
  )
}
