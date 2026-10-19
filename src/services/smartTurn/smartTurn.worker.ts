/// <reference lib="webworker" />
/**
 * Smart Turn worker: the visitor's turn audio (16kHz) in, probability that they've finished out.
 */
import { fetchModel, ort } from '../onnx/ort'
import { N_FRAMES, N_MELS, smartTurnFeatures } from './whisperFeatures'

type Request = { type: 'load'; url: string } | { type: 'run'; id: number; audio: Float32Array }

let session: ort.InferenceSession | null = null

const post = (message: unknown) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(message)

self.onmessage = async (event: MessageEvent<Request>) => {
  const message = event.data
  try {
    if (message.type === 'load') {
      if (!session) session = await ort.InferenceSession.create(await fetchModel(message.url), { executionProviders: ['wasm'] })
      post({ type: 'loaded' })
    } else {
      if (!session) throw new Error('Model not loaded')
      const input = new ort.Tensor('float32', smartTurnFeatures(message.audio), [1, N_MELS, N_FRAMES])
      // The output is named "logits" but is already a sigmoid probability
      const output = await session.run({ input_features: input })
      post({ type: 'result', id: message.id, probability: (output.logits.data as Float32Array)[0] })
    }
  } catch (error) {
    post({ type: 'error', id: message.type === 'run' ? message.id : undefined, error: String(error) })
  }
}
