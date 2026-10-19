/**
 * Decides when the visitor has finished speaking, so Rahul doesn't jump in on a mid-sentence pause.
 *
 * Speech recognition hands over final transcripts whenever it hears a pause; the gate holds them
 * until Smart Turn (run on the turn's audio from the VAD) says the turn is complete. If it says
 * "not yet" and the visitor stays quiet, the turn is committed anyway after a short wait.
 */

import { N_SAMPLES } from './whisperFeatures'

export interface TurnGateOptions {
  /** Probability of turn completion, or null if the model is unavailable */
  classify: (audio: Float32Array) => Promise<number | null>
  onCommit: (text: string) => void
  /** Text held while waiting, for showing as an interim transcript */
  onPending?: (text: string) => void
  threshold?: number
  /** How long to wait after an "incomplete" verdict before committing anyway */
  incompleteWaitMs?: number
  /** Upper bound on holding a transcript (e.g. if the VAD never reports the end of speech) */
  maxHoldMs?: number
}

export class TurnGate {
  private pending = ''
  private audio: Float32Array[] = []
  private complete = false
  private sawSpeech = false
  private generation = 0
  private waitTimer: ReturnType<typeof setTimeout> | null = null
  private holdTimer: ReturnType<typeof setTimeout> | null = null
  private readonly threshold: number
  private readonly incompleteWaitMs: number
  private readonly maxHoldMs: number
  private readonly options: TurnGateOptions

  constructor(options: TurnGateOptions) {
    this.options = options
    this.threshold = options.threshold ?? 0.5
    this.incompleteWaitMs = options.incompleteWaitMs ?? 2500
    this.maxHoldMs = options.maxHoldMs ?? 5000
  }

  /** Transcript held until the turn is complete */
  get pendingText() {
    return this.pending
  }

  speechStart() {
    this.generation++
    this.sawSpeech = true
    this.complete = false
    this.clearWait()
  }

  /** One VAD speech segment (16kHz mono) */
  async speechEnd(segment: Float32Array) {
    this.sawSpeech = true
    this.audio.push(segment)
    this.trimAudio()
    const generation = ++this.generation
    const probability = await this.options.classify(this.turnAudio()).catch(() => null)
    if (generation !== this.generation) return // they started speaking again meanwhile

    if (probability === null || probability >= this.threshold) {
      this.complete = true
      this.tryCommit()
    } else {
      this.clearWait()
      this.waitTimer = setTimeout(() => {
        this.complete = true
        this.tryCommit()
      }, this.incompleteWaitMs)
    }
  }

  transcript(text: string) {
    const t = text.trim()
    if (!t) return
    this.pending = this.pending ? `${this.pending} ${t}` : t
    // Without VAD audio there's nothing to judge by: behave like plain speech recognition
    if (!this.sawSpeech) this.complete = true
    if (this.tryCommit()) return
    this.options.onPending?.(this.pending)
    if (!this.holdTimer) this.holdTimer = setTimeout(() => this.commit(), this.maxHoldMs)
  }

  /** Drop everything (e.g. microphone turned off) */
  reset() {
    this.generation++
    this.pending = ''
    this.audio = []
    this.complete = false
    this.sawSpeech = false
    this.clearWait()
    if (this.holdTimer) clearTimeout(this.holdTimer)
    this.holdTimer = null
  }

  private tryCommit(): boolean {
    if (!this.complete || !this.pending) return false
    this.commit()
    return true
  }

  private commit() {
    const text = this.pending
    this.reset()
    if (text) this.options.onCommit(text)
  }

  private clearWait() {
    if (this.waitTimer) clearTimeout(this.waitTimer)
    this.waitTimer = null
  }

  private turnAudio(): Float32Array {
    const out = new Float32Array(this.audio.reduce((n, a) => n + a.length, 0))
    let offset = 0
    for (const a of this.audio) {
      out.set(a, offset)
      offset += a.length
    }
    return out
  }

  /** Smart Turn only looks at the last 8s */
  private trimAudio() {
    let total = this.audio.reduce((n, a) => n + a.length, 0)
    while (this.audio.length > 1 && total - this.audio[0].length >= N_SAMPLES) total -= this.audio.shift()!.length
  }
}
