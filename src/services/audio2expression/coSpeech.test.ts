import { describe, expect, it } from 'vitest'

import { addBrowRaises, findCues } from './coSpeech'
import { A2E_CHANNELS, CHANNELS } from './postprocess'

const INNER = A2E_CHANNELS.indexOf('browInnerUp')
const OUTER_L = A2E_CHANNELS.indexOf('browOuterUpLeft')

// 10s at 30fps: words (loud) separated by short gaps, one stressed stretch per sentence
const speech = () => {
  const volume = new Float32Array(300)
  for (let f = 0; f < 300; f++) {
    const word = f % 15 < 11 ? 0.05 : 0.0005
    volume[f] = f % 150 >= 40 && f % 150 < 60 ? 0.12 : word
  }
  return volume
}

const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646

describe('co-speech brow raises', () => {
  it('raises the brows once per 5s, peaking on the stressed stretch', () => {
    const volume = speech()
    const frames = addBrowRaises(new Float32Array(volume.length * CHANNELS), volume, seeded(7))
    const inner = (f: number) => frames[f * CHANNELS + INNER]
    for (const seg of [0, 150]) {
      let peak = seg
      for (let f = seg; f < seg + 150; f++) if (inner(f) > inner(peak)) peak = f
      expect(peak - seg).toBeGreaterThanOrEqual(35)
      expect(peak - seg).toBeLessThan(70)
      expect(inner(peak)).toBeGreaterThan(0.25)
      // Settled again before the next raise
      expect(inner(seg + 120)).toBe(0)
    }
  })

  it('stays within 0..1 and leaves quiet clips alone', () => {
    const volume = speech()
    const frames = addBrowRaises(new Float32Array(volume.length * CHANNELS).fill(0.9), volume, seeded(3))
    expect(frames.every((v) => v >= 0 && v <= 1)).toBe(true)
    const silent = addBrowRaises(new Float32Array(30 * CHANNELS), new Float32Array(30))
    expect(silent.every((v) => v === 0)).toBe(true)
    expect(frames[OUTER_L]).toBeCloseTo(0.9)
  })
})

describe('speech cues', () => {
  it('finds gaps between phrases, where phrases resume, and the stressed stretches', () => {
    const volume = speech()
    for (let f = 95; f < 110; f++) volume[f] = 0.0005
    const cues = findCues(volume)
    // Gaps between words (4 frames) aren't pauses
    expect(cues.pauses).toHaveLength(1)
    expect(cues.pauses[0]).toBeCloseTo(95 / 30, 1)
    expect(cues.phrases[0]).toBe(0)
    expect(cues.phrases[1]).toBeCloseTo(110 / 30, 1)
    expect(cues.end).toBeCloseTo(10)
    // One accent per stressed stretch (frames 40-60 and 190-210)
    expect(cues.accents).toHaveLength(2)
    expect(cues.accents[0] * 30).toBeGreaterThanOrEqual(39)
    expect(cues.accents[0] * 30).toBeLessThanOrEqual(61)
  })
})
