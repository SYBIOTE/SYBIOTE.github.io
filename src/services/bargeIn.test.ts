import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { BargeIn } from './bargeIn'

const setup = (spoken = 'I built a WebXR museum tour that runs in the browser') => {
  let speaking = true
  const duck = vi.fn()
  const interrupt = vi.fn(() => {
    speaking = false
  })
  const bargeIn = new BargeIn({ isSpeaking: () => speaking, duck, interrupt, spokenText: () => spoken })
  return { bargeIn, duck, interrupt, stopSpeaking: () => (speaking = false), startSpeaking: () => (speaking = true) }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('BargeIn', () => {
  it('dips the voice when the visitor starts talking, and stops once they say real words', () => {
    const { bargeIn, duck, interrupt } = setup()
    bargeIn.speechStart()
    expect(duck).toHaveBeenLastCalledWith(0.3)
    bargeIn.transcript('actually', false)
    expect(interrupt).not.toHaveBeenCalled()
    bargeIn.transcript('actually can you', false)
    expect(interrupt).toHaveBeenCalledOnce()
  })

  it('carries on after a backchannel or a cough', () => {
    const { bargeIn, duck, interrupt } = setup()
    bargeIn.speechStart()
    bargeIn.transcript('yeah', false)
    bargeIn.transcript('mm-hm okay', true)
    bargeIn.speechEnd()
    expect(interrupt).not.toHaveBeenCalled()
    expect(duck).toHaveBeenLastCalledWith(1)
    // A cough: speech with no words, and the VAD never reports its end
    bargeIn.speechStart()
    vi.advanceTimersByTime(3000)
    expect(duck).toHaveBeenLastCalledWith(1)
  })

  it('ignores its own voice leaking into the mic', () => {
    const { bargeIn, interrupt } = setup()
    bargeIn.speechStart()
    bargeIn.transcript('museum tour that runs in the browser', false)
    expect(interrupt).not.toHaveBeenCalled()
  })

  it('ignores transcripts of speech that started before he began talking', () => {
    const { bargeIn, interrupt, stopSpeaking, startSpeaking } = setup()
    stopSpeaking()
    bargeIn.speechStart()
    bargeIn.speechEnd()
    // He starts answering, then the transcript of the question arrives late
    startSpeaking()
    bargeIn.transcript('what projects have you done', true)
    expect(interrupt).not.toHaveBeenCalled()
  })

  it('does nothing while he is silent', () => {
    const { bargeIn, duck, interrupt, stopSpeaking } = setup()
    stopSpeaking()
    bargeIn.speechStart()
    bargeIn.transcript('tell me about your work', true)
    expect(duck).not.toHaveBeenCalled()
    expect(interrupt).not.toHaveBeenCalled()
  })
})
