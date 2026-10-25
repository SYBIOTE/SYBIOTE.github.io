import { describe, expect, it } from 'vitest'

import { recognitionLanguage } from './recognitionLanguage'
import { pickTranscript, polishTranscript, RECOGNITION_PHRASES } from './vocabulary'

describe('recognition language', () => {
  it("uses the visitor's own accent of the UI language", () => {
    expect(recognitionLanguage('en', ['en-IN', 'hi-IN'])).toBe('en-IN')
    expect(recognitionLanguage('en', ['de-DE', 'en-GB'])).toBe('en-GB')
    expect(recognitionLanguage('hi', ['en-IN', 'hi-IN'])).toBe('hi-IN')
  })

  it('falls back to a default region', () => {
    expect(recognitionLanguage('en', ['fr-FR'])).toBe('en-US')
    expect(recognitionLanguage('ja', [])).toBe('ja-JP')
    expect(recognitionLanguage('de-AT', [])).toBe('de-DE')
  })
})

describe('vocabulary', () => {
  it("keeps the recognizer's best guess unless another names more of the site's topics", () => {
    expect(pickTranscript(['tell me about your work', 'tell me about you work'])).toBe('tell me about your work')
    expect(pickTranscript(['what is acid hub', 'what is asset hub'])).toBe('what is asset hub')
    expect(pickTranscript(['have you used three chairs', 'have you used three js'])).toBe('have you used three js')
  })

  it('spells the tech terms properly', () => {
    expect(polishTranscript('do you use three js or web gpu')).toBe('do you use Three.js or WebGPU')
    expect(polishTranscript('3 dot js and web xr')).toBe('Three.js and WebXR')
    expect(polishTranscript('how do gaussian splats work')).toBe('how do Gaussian splats work')
    expect(polishTranscript('three people')).toBe('three people')
  })

  it("boosts each project's and company's fullest name once", () => {
    expect(RECOGNITION_PHRASES).toContain('Three.js')
    expect(RECOGNITION_PHRASES).toContain('infinite reality engine')
    expect(new Set(RECOGNITION_PHRASES).size).toBe(RECOGNITION_PHRASES.length)
  })
})
