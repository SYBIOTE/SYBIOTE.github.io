import { describe, expect, it, vi } from 'vitest'

import { createBlinkMotion, cueBlink, updateBlinkMotion } from './blinkMotion'

describe('blinkMotion', () => {
  it('shuts fast and reopens slower, within ~230ms', () => {
    const state = createBlinkMotion()
    cueBlink(state, 10_000, 'Idle', 1)
    const curve = Array.from({ length: 16 }, (_, i) => updateBlinkMotion(state, 10_000 + i * 16, 'Idle'))
    const top = curve.indexOf(Math.max(...curve))
    expect(Math.max(...curve)).toBeGreaterThan(0.7)
    expect(top).toBeLessThan(16 - top)
    expect(updateBlinkMotion(state, 10_240, 'Idle')).toBe(0)
  })

  it('ignores cues right after a blink', () => {
    const state = createBlinkMotion()
    cueBlink(state, 10_000, 'Idle', 1)
    cueBlink(state, 10_300, 'Idle', 1)
    expect(state.start).toBe(10_000)
    cueBlink(state, 10_800, 'Idle', 1)
    expect(state.start).toBe(10_800)
  })

  it('blinks on its own every couple of seconds', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const state = createBlinkMotion()
    let blinks = 0
    let shut = false
    for (let t = 0; t < 60_000; t += 16) {
      const w = updateBlinkMotion(state, t, 'Responding')
      if (w > 0.5 && !shut) blinks++
      shut = w > 0.5
    }
    vi.restoreAllMocks()
    expect(blinks).toBeGreaterThan(12)
    expect(blinks).toBeLessThan(30)
  })
})
