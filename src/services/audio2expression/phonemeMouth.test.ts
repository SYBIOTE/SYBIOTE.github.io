import { describe, expect, it } from 'vitest'

import { applyPhonemeMouth, parsePhones, withPhonemeMouth } from './phonemeMouth'
import { A2E_CHANNELS, A2E_FPS, CHANNELS } from './postprocess'

const at = (frames: Float32Array, seconds: number, name: (typeof A2E_CHANNELS)[number]) =>
  frames[Math.round(seconds * A2E_FPS) * CHANNELS + A2E_CHANNELS.indexOf(name)]

// "Bob, who": closure, open vowel, closure, silence, rounded
const PHONES = parsePhones('bmp 0.00 0.15;aei 0.15 0.20;bmp 0.35 0.15;sil 0.50 0.10;qw 0.60 0.10;o 0.70 0.25')

describe('phoneme-timed lips', () => {
  it('parses the header, and rejects malformed ones', () => {
    expect(PHONES).toHaveLength(6)
    expect(PHONES[1]).toEqual({ viseme: 'aei', start: 0.15, duration: 0.2 })
    expect(parsePhones(null)).toEqual([])
    expect(parsePhones('bmp zero 0.1')).toEqual([])
  })

  it('opens the jaw on vowels and holds the lips shut through m/b/p', () => {
    const frames = applyPhonemeMouth(new Float32Array(30 * CHANNELS), PHONES, 0)
    expect(at(frames, 0.21, 'jawOpen')).toBeGreaterThan(0.2)
    // Vowels hold their pose over the middle of the sound, 40ms early; closures hold almost throughout
    expect(at(frames, 0.05, 'jawOpen')).toBeLessThan(0.02)
    expect(at(frames, 0.4, 'jawOpen')).toBeLessThan(0.05)
    expect(at(frames, 0.4, 'mouthPressLeft')).toBeGreaterThan(0.25)
  })

  it('glides through quick consonants and word gaps instead of snapping the jaw at each one', () => {
    // "it's a" as Inworld times it: a vowel, two quick consonants, a zero-length word gap, a vowel
    const phones = parsePhones('aei 0.00 0.12;cdgknstxyz 0.12 0.05;cdgknstxyz 0.17 0.05;sil 0.22 0.00;aei 0.22 0.12')
    const frames = applyPhonemeMouth(new Float32Array(12 * CHANNELS), phones, 0)
    const jaw = Array.from({ length: 10 }, (_, f) => frames[f * CHANNELS + A2E_CHANNELS.indexOf('jawOpen')])
    // Between the two vowels the jaw dips only a little, rather than closing for each consonant
    expect(Math.min(...jaw.slice(2, 8))).toBeGreaterThan(0.15)
  })

  it('rounds the lips for o and w', () => {
    const frames = applyPhonemeMouth(new Float32Array(30 * CHANNELS), PHONES, 0)
    expect(at(frames, 0.8, 'mouthFunnel') + at(frames, 0.8, 'mouthPucker')).toBeGreaterThan(0.45)
    expect(at(frames, 0.25, 'mouthFunnel') + at(frames, 0.25, 'mouthPucker')).toBeLessThan(0.05)
  })

  it("keeps a fifth of the model's mouth motion (at the mouth's 0.7 strength), none of its upper-lip shrug, and all of the rest", () => {
    const frames = new Float32Array(30 * CHANNELS).fill(0.5)
    applyPhonemeMouth(frames, PHONES)
    expect(at(frames, 0.05, 'jawOpen')).toBeCloseTo(0.07, 2)
    expect(at(frames, 0.05, 'mouthShrugUpper')).toBe(0)
    expect(at(frames, 0.05, 'browInnerUp')).toBe(0.5)
    expect(at(frames, 0.05, 'mouthSmileLeft')).toBe(0.5)
  })

  it("makes the whole track from the phonemes when the audio model didn't run", () => {
    const clip = { duration: 1, sampleRate: 16000, getChannelData: () => new Float32Array(16000).fill(0.1) } as unknown as AudioBuffer
    const track = withPhonemeMouth(null, clip, PHONES)!
    expect(track.frameCount).toBe(30)
    expect(at(track.frames, 0.21, 'jawOpen')).toBeGreaterThan(0.2)
    expect(withPhonemeMouth(null, clip, [])).toBeNull()
  })
})
