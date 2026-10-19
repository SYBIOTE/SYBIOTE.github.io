/**
 * Smart Turn v3 (pipecat-ai/smart-turn, BSD-2): an 8MB audio model that tells whether the visitor
 * has finished their turn or just paused mid-thought ("so I was wondering... um"). Best-effort:
 * if it can't load, endOfTurnProbability returns null and the caller falls back to silence timing.
 */

const MODEL_URL = import.meta.env.VITE_SMART_TURN_MODEL_URL || '/models/smart-turn-v3.2-cpu.onnx'

let worker: Worker | null = null
let ready: Promise<boolean> | null = null
let nextId = 1
const pending = new Map<number, (probability: number | null) => void>()

export const preloadSmartTurn = (): Promise<boolean> => {
  if (ready) return ready
  if (typeof Worker === 'undefined') return (ready = Promise.resolve(false))

  ready = new Promise<boolean>((resolve) => {
    try {
      worker = new Worker(new URL('./smartTurn.worker.ts', import.meta.url), { type: 'module' })
    } catch (error) {
      logger.warn('Smart Turn: worker unavailable', error)
      resolve(false)
      return
    }
    worker.onmessage = (event: MessageEvent) => {
      const message = event.data
      if (message.type === 'loaded') resolve(true)
      else if (message.type === 'result') {
        pending.get(message.id)?.(message.probability)
        pending.delete(message.id)
      } else if (message.type === 'error') {
        logger.warn('Smart Turn:', message.error)
        if (message.id === undefined) resolve(false)
        else {
          pending.get(message.id)?.(null)
          pending.delete(message.id)
        }
      }
    }
    worker.onerror = (error) => {
      logger.warn('Smart Turn worker crashed', error)
      pending.forEach((done) => done(null))
      pending.clear()
      resolve(false)
    }
    worker.postMessage({ type: 'load', url: MODEL_URL })
  })
  return ready
}

/** Probability (0..1) that the turn in this 16kHz audio is complete, or null if unavailable. */
export const endOfTurnProbability = async (audio: Float32Array): Promise<number | null> => {
  if (!(await preloadSmartTurn()) || !worker) return null
  const id = nextId++
  return new Promise<number | null>((resolve) => {
    pending.set(id, resolve)
    worker!.postMessage({ type: 'run', id, audio })
  })
}
