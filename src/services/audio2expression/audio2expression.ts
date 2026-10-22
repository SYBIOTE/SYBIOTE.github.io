/**
 * Audio-driven facial animation (LAM Audio2Expression) for the avatar.
 *
 * Turns a TTS clip into ARKit face frames in a worker, so lipsync and co-speech expression follow
 * the actual voice instead of being estimated from text. Everything here is best-effort: on weak
 * devices, slow connections, or any failure it returns null and the text-based lipsync is used.
 */

import type { SpeechCues } from './coSpeech'
import { A2E_FPS, A2E_SAMPLE_RATE, CHANNELS } from './postprocess'

export interface ExpressionTrack {
  /** Flat [frameCount * 52] ARKit weights in A2E_CHANNELS order */
  frames: Float32Array
  frameCount: number
  fps: number
  /** Pauses, phrase starts and stressed moments, for the gaze, blinks and head to follow the voice */
  cues: SpeechCues
}

const MODEL_URL = import.meta.env.VITE_A2E_MODEL_URL || '/models/audio2exp-int8-matmul.onnx'

/** The model is ~146MB and needs a decent CPU: only use it where that's reasonable. */
export const deviceCanRunAudio2Expression = (): boolean => {
  if (typeof Worker === 'undefined' || typeof OfflineAudioContext === 'undefined') return false
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean; effectiveType?: string } }
  if (nav.connection?.saveData || /(^|-)2g$/.test(nav.connection?.effectiveType ?? '')) return false
  if (nav.deviceMemory !== undefined && nav.deviceMemory < 4) return false
  if ((nav.hardwareConcurrency ?? 4) < 4) return false
  return !/Android|iPhone|iPad|iPod/i.test(nav.userAgent)
}

let worker: Worker | null = null
let ready: Promise<boolean> | null = null
let nextId = 1
type Result = { frames: Float32Array; cues: SpeechCues } | null
const pending = new Map<number, (result: Result) => void>()

/** Starts downloading and initialising the model (no-op if unsupported or already started). */
export const preloadAudio2Expression = (): Promise<boolean> => {
  if (ready) return ready
  if (!deviceCanRunAudio2Expression()) return (ready = Promise.resolve(false))

  ready = new Promise<boolean>((resolve) => {
    try {
      worker = new Worker(new URL('./a2e.worker.ts', import.meta.url), { type: 'module' })
    } catch (error) {
      logger.warn('Audio2Expression: worker unavailable', error)
      resolve(false)
      return
    }
    worker.onmessage = (event: MessageEvent) => {
      const message = event.data
      if (message.type === 'loaded') resolve(true)
      else if (message.type === 'result') {
        pending.get(message.id)?.({ frames: message.frames, cues: message.cues })
        pending.delete(message.id)
      } else if (message.type === 'error') {
        logger.warn('Audio2Expression:', message.error)
        if (message.id === undefined) resolve(false)
        else {
          pending.get(message.id)?.(null)
          pending.delete(message.id)
        }
      }
    }
    worker.onerror = (error) => {
      logger.warn('Audio2Expression worker crashed', error)
      pending.forEach((done) => done(null))
      pending.clear()
      resolve(false)
    }
    worker.postMessage({ type: 'load', url: MODEL_URL })
  })
  return ready
}

/** Mixes down and resamples decoded audio to the model's 16kHz mono. */
export const toModelAudio = async (buffer: AudioBuffer): Promise<Float32Array> => {
  const length = Math.ceil(buffer.duration * A2E_SAMPLE_RATE)
  const offline = new OfflineAudioContext(1, length, A2E_SAMPLE_RATE)
  const source = offline.createBufferSource()
  source.buffer = buffer
  source.connect(offline.destination)
  source.start()
  const rendered = await offline.startRendering()
  return rendered.getChannelData(0).slice()
}

/** Face frames for a clip, or null if the model isn't available or fails. */
export const expressionTrackFor = async (buffer: AudioBuffer): Promise<ExpressionTrack | null> => {
  if (!(await preloadAudio2Expression()) || !worker) return null
  try {
    const audio = await toModelAudio(buffer)
    const id = nextId++
    const result = await new Promise<Result>((resolve) => {
      pending.set(id, resolve)
      worker!.postMessage({ type: 'run', id, audio }, [audio.buffer])
    })
    return result ? { ...result, frameCount: result.frames.length / CHANNELS, fps: A2E_FPS } : null
  } catch (error) {
    logger.warn('Audio2Expression: inference failed', error)
    return null
  }
}

/**
 * Preload the model while the visitor is in the waiting room, but only if the cloned voice is
 * configured (without it there's no audio to drive the face, so don't download 146MB).
 */
export const preloadIfVoiceConfigured = async (ttsUrl = import.meta.env.VITE_TTS_CLOUD_URL || '/api/tts') => {
  if (!deviceCanRunAudio2Expression()) return
  try {
    const response = await fetch(ttsUrl, { method: 'GET' })
    const { configured } = (await response.json()) as { configured?: boolean }
    if (configured) void preloadAudio2Expression()
  } catch {
    // status unknown: the first successful voice clip will start the download instead
  }
}

