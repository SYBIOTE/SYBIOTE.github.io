import { A2E_FPS, A2E_SAMPLE_RATE } from './postprocess'

/** One fixed model window: 64 frames of context = 34133 samples at 16kHz (same maths as the original). */
export const WINDOW_FRAMES = 64
export const WINDOW_SAMPLES = Math.floor((A2E_SAMPLE_RATE * WINDOW_FRAMES) / A2E_FPS)

export interface StreamWindow {
  /** Model input, always WINDOW_SAMPLES long */
  audio: Float32Array
  /** First output frame that belongs to this chunk (earlier frames are context) */
  start: number
}

/**
 * Port of LAM's infer_streaming_audio windowing: walk the audio in 1s chunks, each fed with the
 * preceding audio as left context (zeros for the first chunk), keeping only the chunk's own frames.
 */
export function* streamWindows(audio: Float32Array): Generator<StreamWindow> {
  let previous: Float32Array | null = null
  const chunks = Math.floor(audio.length / A2E_SAMPLE_RATE) + 1
  for (let i = 0; i < chunks; i++) {
    const chunk = audio.subarray(i * A2E_SAMPLE_RATE, (i + 1) * A2E_SAMPLE_RATE)
    if (chunk.length === 0) break
    const start = Math.trunc(WINDOW_FRAMES - (chunk.length / A2E_SAMPLE_RATE) * A2E_FPS)
    const window = new Float32Array(WINDOW_SAMPLES)
    const contextLength = WINDOW_SAMPLES - chunk.length
    if (previous) window.set(previous.subarray(previous.length - contextLength), 0)
    window.set(chunk, contextLength)
    previous = window
    yield { audio: window, start }
  }
}
