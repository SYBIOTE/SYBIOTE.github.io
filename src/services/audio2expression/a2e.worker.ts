/// <reference lib="webworker" />
/**
 * Audio2Expression worker: 16kHz speech in, ARKit face frames (30fps, 52 channels) out.
 * Runs the exported LAM Audio2Expression ONNX model window by window, then post-processes.
 */
import { fetchModel, ort } from '../onnx/ort'
import { CHANNELS, frameVolume, postprocess } from './postprocess'
import { streamWindows, WINDOW_FRAMES, WINDOW_SAMPLES } from './windows'

type Request = { type: 'load'; url: string } | { type: 'run'; id: number; audio: Float32Array }

let session: ort.InferenceSession | null = null

const post = (message: unknown, transfer: Transferable[] = []) =>
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(message, transfer)

const run = async (audio: Float32Array): Promise<Float32Array> => {
  if (!session) throw new Error('Model not loaded')
  const chunks: Float32Array[] = []
  for (const window of streamWindows(audio)) {
    const input = new ort.Tensor('float32', window.audio, [1, WINDOW_SAMPLES])
    const output = await session.run({ audio: input })
    const data = output.expression.data as Float32Array
    chunks.push(data.slice(window.start * CHANNELS, WINDOW_FRAMES * CHANNELS))
  }
  const raw = new Float32Array(chunks.reduce((n, c) => n + c.length, 0))
  let offset = 0
  for (const c of chunks) {
    raw.set(c, offset)
    offset += c.length
  }
  return postprocess(raw, frameVolume(audio, undefined, raw.length / CHANNELS))
}

self.onmessage = async (event: MessageEvent<Request>) => {
  const message = event.data
  try {
    if (message.type === 'load') {
      if (!session) session = await ort.InferenceSession.create(await fetchModel(message.url), { executionProviders: ['wasm'] })
      post({ type: 'loaded' })
    } else {
      const frames = await run(message.audio)
      post({ type: 'result', id: message.id, frames }, [frames.buffer])
    }
  } catch (error) {
    post({ type: 'error', id: message.type === 'run' ? message.id : undefined, error: String(error) })
  }
}
