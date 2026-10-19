import { describe, expect, it } from 'vitest'

import fixture from './__fixtures__/features.json'
import { melFilters, N_FRAMES, N_MELS, smartTurnFeatures } from './whisperFeatures'

// Reference values from transformers' WhisperFeatureExtractor(chunk_length=8), as Smart Turn uses it
describe('Smart Turn whisper features (match the Python reference)', () => {
  it('builds the same mel filter bank', () => {
    const filters = melFilters()
    let maxErr = 0
    fixture.melFilters.forEach((row, k) => row.forEach((v, m) => (maxErr = Math.max(maxErr, Math.abs(filters[k][m] - v)))))
    expect(maxErr).toBeLessThan(1e-6)
  })

  it('produces the same [80, 800] log-mel features', () => {
    const features = smartTurnFeatures(Float32Array.from(fixture.audio))
    expect(fixture.shape).toEqual([N_MELS, N_FRAMES])
    expect(features.length).toBe(N_MELS * N_FRAMES)
    let maxErr = 0
    fixture.sampled.forEach((v, i) => (maxErr = Math.max(maxErr, Math.abs(features[i * fixture.step] - v))))
    expect(maxErr).toBeLessThan(2e-3)
    const mean = features.reduce((a, b) => a + b, 0) / features.length
    expect(mean).toBeCloseTo(fixture.mean, 3)
  })
})
