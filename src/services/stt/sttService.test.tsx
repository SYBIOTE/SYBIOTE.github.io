import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useSTTService } from './sttService'

// Rendering through act() outside a testing library
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

type Result = { transcript: string | string[]; final: boolean }

/** Stands in for SpeechRecognitionPhrase */
class FakePhrase {
  phrase: string
  boost: number
  constructor(phrase: string, boost: number) {
    this.phrase = phrase
    this.boost = boost
  }
}

/** Stands in for the browser's SpeechRecognition: sessions end when told to, like Chrome's do */
class FakeRecognition {
  static last: FakeRecognition
  lang = ''
  continuous = false
  interimResults = false
  maxAlternatives = 1
  phrases: unknown[] = []
  running = false
  starts = 0
  onstart: (() => void) | null = null
  onend: (() => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onresult: ((event: unknown) => void) | null = null

  constructor() {
    FakeRecognition.last = this
  }
  start() {
    if (this.running) throw new Error('InvalidStateError: already started')
    this.running = true
    this.starts++
    this.onstart?.()
  }
  stop() {
    // Ends a moment later, as the real one does
    setTimeout(() => this.end(), 50)
  }
  /** The browser ends the session (silence, a final result, or no reason at all) */
  end() {
    if (!this.running) return
    this.running = false
    this.onend?.()
  }
  error(error: string) {
    this.onerror?.({ error } as unknown as Event)
    this.end()
  }
  results(results: Result[], resultIndex = 0) {
    const list = results.map((r) =>
      Object.assign(
        [r.transcript].flat().map((transcript) => ({ transcript, confidence: 0.9 })),
        { isFinal: r.final }
      )
    )
    this.onresult?.({ resultIndex, results: list })
  }
}

let stt: ReturnType<typeof useSTTService>
const heard: { text: string; final: boolean }[] = []

const Harness = ({ language = 'en-US' }: { language?: string }) => {
  stt = useSTTService({
    config: { language },
    phrases: ['AssetHub', 'Three.js'],
    // Prefers an alternative that mentions AssetHub, like vocabulary.ts does with the real names
    chooseTranscript: (alternatives) => alternatives.find((a) => a.includes('asset hub')) ?? alternatives[0],
    onPerform: (r) => heard.push({ text: r.text, final: r.final })
  })
  return null
}

const run = async (fn: () => void) => act(async () => fn())

describe('speech recognition', () => {
  let root: ReturnType<typeof createRoot>

  beforeEach(async () => {
    vi.useFakeTimers()
    heard.length = 0
    ;(window as unknown as { webkitSpeechRecognition: unknown }).webkitSpeechRecognition = FakeRecognition
    root = createRoot(document.createElement('div'))
    await run(() => root.render(<Harness />))
  })

  afterEach(async () => {
    await run(() => root.unmount())
    vi.useRealTimers()
  })

  it('starts a new session whenever the browser ends one while listening is wanted', async () => {
    await run(() => stt.actions.setDesired(true))
    const rec = FakeRecognition.last
    expect(rec.starts).toBe(1)

    await run(() => rec.error('no-speech'))
    await run(() => vi.runOnlyPendingTimers())
    expect(rec.starts).toBe(2)
    expect(rec.running).toBe(true)

    await run(() => rec.end())
    await run(() => vi.runOnlyPendingTimers())
    expect(rec.starts).toBe(3)
  })

  it('stays stopped once listening is no longer wanted', async () => {
    await run(() => stt.actions.setDesired(true))
    const rec = FakeRecognition.last
    await run(() => stt.actions.setDesired(false))
    await run(() => vi.runAllTimers())
    expect(rec.running).toBe(false)
    expect(rec.starts).toBe(1)
  })

  it('picks up again if listening is wanted while the last session is still stopping', async () => {
    await run(() => stt.actions.setDesired(true))
    const rec = FakeRecognition.last
    await run(() => stt.actions.setDesired(false))
    await run(() => stt.actions.setDesired(true)) // before the stop has finished
    await run(() => vi.runAllTimers())
    expect(rec.running).toBe(true)
    expect(rec.starts).toBe(2)
  })

  it('reports every phrase of a continuous session, not just the first', async () => {
    await run(() => stt.actions.setDesired(true))
    const rec = FakeRecognition.last
    await run(() => rec.results([{ transcript: 'hello there', final: true }]))
    await run(() => rec.results([{ transcript: 'hello there', final: true }, { transcript: 'what do you build', final: false }], 1))
    await run(() => rec.results([{ transcript: 'hello there', final: true }, { transcript: 'what do you build', final: true }], 1))
    expect(heard).toEqual([
      { text: 'hello there', final: true },
      { text: 'what do you build', final: false },
      { text: 'what do you build', final: true }
    ])
  })

  it('asks for alternatives and lets the caller choose', async () => {
    await run(() => stt.actions.setDesired(true))
    const rec = FakeRecognition.last
    expect(rec.maxAlternatives).toBeGreaterThan(1)
    await run(() => rec.results([{ transcript: ['what is acid hub', 'what is asset hub'], final: true }]))
    expect(heard).toEqual([{ text: 'what is asset hub', final: true }])
  })

  it("boosts the site's names where the browser supports it, and drops them if the recognizer can't", async () => {
    ;(window as unknown as { SpeechRecognitionPhrase: unknown }).SpeechRecognitionPhrase = FakePhrase
    await run(() => root.unmount())
    root = createRoot(document.createElement('div'))
    await run(() => root.render(<Harness />))
    await run(() => stt.actions.setDesired(true))
    const rec = FakeRecognition.last
    expect((rec.phrases as FakePhrase[]).map((p) => p.phrase)).toEqual(['AssetHub', 'Three.js'])

    await run(() => rec.error('phrases-not-supported'))
    await run(() => vi.runOnlyPendingTimers())
    expect(rec.phrases).toEqual([])
    expect(rec.running).toBe(true)
    delete (window as unknown as { SpeechRecognitionPhrase?: unknown }).SpeechRecognitionPhrase
  })

  it('switches language mid-call by restarting the session', async () => {
    await run(() => stt.actions.setDesired(true))
    const rec = FakeRecognition.last
    expect(rec.lang).toBe('en-US')
    await run(() => root.render(<Harness language="hi-IN" />))
    await run(() => vi.runAllTimers())
    expect(rec.lang).toBe('hi-IN')
    expect(rec.starts).toBe(2)
    expect(rec.running).toBe(true)
  })

  it('gives up without looping when the microphone is blocked', async () => {
    await run(() => stt.actions.setDesired(true))
    const rec = FakeRecognition.last
    await run(() => rec.error('not-allowed'))
    await run(() => vi.runAllTimers())
    expect(rec.starts).toBe(1)
    expect(stt.state.allowed).toBe(false)
  })
})
