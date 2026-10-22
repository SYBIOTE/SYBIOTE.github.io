import { afterEach, describe, expect, it, vi } from 'vitest'

import { createPresence, updatePresence, type PresenceInput } from './presence'

const NO_CUES = { pause: false, phrase: false, accent: false, end: false }
const frame = (overrides: Partial<PresenceInput>): PresenceInput => ({
  mode: 'Idle',
  now: 0,
  delta: 0.016,
  speaking: false,
  voiceDrivesFace: false,
  visitorTalking: false,
  cues: NO_CUES,
  ...overrides
})

afterEach(() => vi.restoreAllMocks())

describe('presence', () => {
  it('nods when the visitor pauses', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    const p = createPresence()
    updatePresence(p, frame({ mode: 'Listening', now: 1000, visitorTalking: true }))
    updatePresence(p, frame({ mode: 'Listening', now: 2000, visitorTalking: false }))
    expect(p.head.gestures).toHaveLength(1)
  })

  it('looks away at a pause in its own speech and back at the end of the sentence', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    const p = createPresence()
    updatePresence(p, frame({ mode: 'Responding', now: 1000, speaking: true }))
    // The turn started with a thinking glance
    expect(p.eyes.avertedUntil).toBeGreaterThan(1000)
    updatePresence(p, frame({ mode: 'Responding', now: 5000, speaking: true, cues: { ...NO_CUES, pause: true } }))
    expect(Math.abs(p.eyes.targetX)).toBeGreaterThan(0.15)
    updatePresence(p, frame({ mode: 'Responding', now: 5600, speaking: true, cues: { ...NO_CUES, end: true } }))
    expect(Math.abs(p.eyes.targetX)).toBeLessThan(0.07)
  })

  it('keeps every weight it adds small and non-negative', () => {
    const p = createPresence()
    for (let t = 0; t < 20_000; t += 33) {
      const { extra, blink } = updatePresence(p, frame({ mode: 'Listening', now: t, delta: 0.033 }))
      for (const [name, v] of Object.entries(extra)) {
        expect(v).toBeGreaterThanOrEqual(0)
        if (!name.startsWith('eyeLook')) expect(v).toBeLessThan(0.3)
      }
      expect(blink).toBeGreaterThanOrEqual(0)
      expect(blink).toBeLessThanOrEqual(1)
    }
  })
})
