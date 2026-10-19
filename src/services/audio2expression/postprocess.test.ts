import { describe, expect, it } from 'vitest'

import { ARKIT_BLENDSHAPES } from '../../components/scene/avatar/arkitMapping'
import fixture from './__fixtures__/postprocess.json'
import { A2E_CHANNELS, frameVolume, postprocess } from './postprocess'

// Reference values produced by the original Python (LAM_Audio2Expression models/utils.py)
describe('audio2expression postprocess (matches the Python reference)', () => {
  it('uses the same channel order as the avatar rig', () => {
    expect([...A2E_CHANNELS]).toEqual([...ARKIT_BLENDSHAPES])
  })

  it('computes per-frame volume like librosa rms', () => {
    const out = frameVolume(Float32Array.from(fixture.audioRmsCheck.samples))
    expect(out.length).toBe(fixture.audioRmsCheck.rms.length)
    out.forEach((v, i) => expect(v).toBeCloseTo(fixture.audioRmsCheck.rms[i], 5))
  })

  it('reproduces the full post-processing chain', () => {
    const out = postprocess(Float32Array.from(fixture.raw), Float32Array.from(fixture.volume))
    let maxErr = 0
    out.forEach((v, i) => (maxErr = Math.max(maxErr, Math.abs(v - fixture.expected[i]))))
    expect(out.length).toBe(fixture.expected.length)
    expect(maxErr).toBeLessThan(1e-4)
  })
})
