/**
 * onnxruntime-web (CPU / WebAssembly build), with its .wasm served from our own bundle
 * rather than a CDN. Single-threaded: multi-threading needs cross-origin isolation headers.
 */
import * as ort from 'onnxruntime-web/wasm'
import mjsUrl from 'onnxruntime-web/ort-wasm-simd-threaded.mjs?url'
import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url'

ort.env.wasm.wasmPaths = { wasm: wasmUrl, mjs: mjsUrl }
ort.env.wasm.numThreads = 1

/** Fetches a model, keeping a copy in Cache Storage so later visits load it instantly. */
export const fetchModel = async (url: string): Promise<ArrayBuffer> => {
  const cache = typeof caches !== 'undefined' ? await caches.open('onnx-models-v1').catch(() => null) : null
  const cached = await cache?.match(url)
  if (cached) return cached.arrayBuffer()
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Model download failed: ${response.status} ${url}`)
  await cache?.put(url, response.clone()).catch(() => undefined)
  return response.arrayBuffer()
}

export { ort }
