import { describe, expect, it } from 'vitest'

import { ARKIT_BLENDSHAPES, createVirtualRig, rigToArkit } from './arkitMapping'

const set = (rig: ReturnType<typeof createVirtualRig>, name: string, value: number) => {
  rig.morphs[0].morphTargetInfluences[rig.dictionary[name][0]] = value
}

describe('arkitMapping', () => {
  it('always returns all 52 ARKit shapes', () => {
    const frame = rigToArkit(createVirtualRig())
    expect(Object.keys(frame).sort()).toEqual([...ARKIT_BLENDSHAPES].sort())
    expect(Object.values(frame).every((v) => v === 0)).toBe(true)
  })

  it('expands composite emote targets', () => {
    const rig = createVirtualRig()
    set(rig, 'mouthSmile', 0.6)
    const frame = rigToArkit(rig)
    expect(frame.mouthSmileLeft).toBeCloseTo(0.6)
    expect(frame.mouthSmileRight).toBeCloseTo(0.6)
  })

  it('maps visemes to mouth poses and respects gain', () => {
    const rig = createVirtualRig()
    set(rig, 'viseme_aa', 1)
    expect(rigToArkit(rig).jawOpen).toBeCloseTo(0.6)
    expect(rigToArkit(rig, { visemeGain: 0.5 }).jawOpen).toBeCloseTo(0.3)
  })

  it('combines emotion and speech, clamped to 1', () => {
    const rig = createVirtualRig()
    set(rig, 'mouthSmile', 0.6)
    set(rig, 'viseme_I', 1)
    set(rig, 'jawOpen', 0.9)
    set(rig, 'viseme_aa', 1)
    const frame = rigToArkit(rig)
    expect(frame.mouthSmileLeft).toBeCloseTo(0.8)
    expect(frame.jawOpen).toBe(1)
  })

  it('takes blinks as the max of per-eye and both-eyes values', () => {
    const rig = createVirtualRig()
    set(rig, 'eyeBlinkLeft', 1)
    set(rig, 'eyesClosed', 1)
    const frame = rigToArkit(rig, { emoteGain: 0.5 })
    expect(frame.eyeBlinkLeft).toBe(1)
    expect(frame.eyeBlinkRight).toBe(1)
  })
  it('applies extra weights then per-shape gains, still clamped', () => {
    const rig = createVirtualRig()
    set(rig, 'mouthSmile', 0.5)
    const frame = rigToArkit(rig, { shapeGains: { mouthSmileLeft: 1.5 }, extra: { eyeLookUpLeft: 0.3, mouthSmileLeft: 0.4 } })
    expect(frame.mouthSmileLeft).toBe(1) // (0.5 + 0.4) * 1.5 clamped
    expect(frame.mouthSmileRight).toBeCloseTo(0.5)
    expect(frame.eyeLookUpLeft).toBeCloseTo(0.3)
  })
})
