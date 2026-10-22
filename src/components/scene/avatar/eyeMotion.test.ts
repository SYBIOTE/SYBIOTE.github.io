import { describe, expect, it } from 'vitest'

import { avertGaze, createEyeMotion, gazeToArkit, lookAtViewer, updateEyeMotion } from './eyeMotion'

const run = (mode: Parameters<typeof updateEyeMotion>[1], ms: number) => {
  const eyes = createEyeMotion()
  for (let t = 0; t <= ms; t += 16) updateEyeMotion(eyes, mode, t, 0.016)
  return eyes
}

describe('eyeMotion', () => {
  it('keeps eye contact (only micro-saccades) while listening', () => {
    for (let i = 0; i < 20; i++) {
      const eyes = run('Listening', 3000)
      expect(Math.abs(eyes.x)).toBeLessThanOrEqual(0.07)
      expect(Math.abs(eyes.y)).toBeLessThanOrEqual(0.06)
    }
  })

  it('glances up and to the side while thinking', () => {
    const eyes = run('Thinking', 500)
    expect(eyes.y).toBeGreaterThan(0.25)
    expect(Math.abs(eyes.x)).toBeGreaterThan(0.3)
  })

  it('breaks listening eye contact with a short glance every few seconds', () => {
    let glances = 0
    const eyes = createEyeMotion()
    let away = false
    for (let t = 0; t <= 30_000; t += 16) {
      updateEyeMotion(eyes, 'Listening', t, 0.016)
      const now = eyes.avertedUntil > t
      if (now && !away) glances++
      away = now
    }
    expect(glances).toBeGreaterThanOrEqual(3)
    expect(glances).toBeLessThanOrEqual(9)
  })

  it('holds an aversion until it ends, then returns to the viewer', () => {
    const eyes = createEyeMotion()
    avertGaze(eyes, 0, 'think')
    expect(eyes.targetY).toBeGreaterThan(0.1)
    for (let t = 0; t < 800; t += 16) updateEyeMotion(eyes, 'Responding', t, 0.016)
    expect(Math.abs(eyes.x)).toBeGreaterThan(0.2)
    lookAtViewer(eyes, 800)
    for (let t = 800; t < 1200; t += 16) updateEyeMotion(eyes, 'Responding', t, 0.016)
    expect(Math.abs(eyes.x)).toBeLessThan(0.07)
  })

  it('maps gaze onto opposite in/out shapes for each eye, all within 0..1', () => {
    const weights = gazeToArkit({ ...createEyeMotion(), x: 0.4, y: -0.2 })
    expect(weights.eyeLookOutLeft).toBeCloseTo(0.4)
    expect(weights.eyeLookInRight).toBeCloseTo(0.4)
    expect(weights.eyeLookOutRight).toBe(0)
    expect(weights.eyeLookDownLeft).toBeCloseTo(0.2)
    expect(Object.values(weights).every((v) => v! >= 0 && v! <= 1)).toBe(true)
  })
})
