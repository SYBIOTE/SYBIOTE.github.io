import { describe, expect, it } from 'vitest'

import { genderOf, pickMaleVoice } from './browserVoice'

const voice = (name: string, lang: string, localService = true) => ({ name, lang, localService, default: false, voiceURI: name }) as SpeechSynthesisVoice

describe('browser voice', () => {
  it('knows voices across platforms by name', () => {
    expect(genderOf(voice('Rishi', 'en-IN'))).toBe('male')
    expect(genderOf(voice('Daniel (Enhanced)', 'en-GB'))).toBe('male')
    expect(genderOf(voice('Samantha', 'en-US'))).toBe('female')
    expect(genderOf(voice('Google UK English Male', 'en-GB'))).toBe('male')
    expect(genderOf(voice('Google UK English Female', 'en-GB'))).toBe('female')
    expect(genderOf(voice('Android Speech Recognition and Synthesis from Google en-in-x-end-local', 'en_IN'))).toBe('male')
    expect(genderOf(voice('en-us-x-sfg-network', 'en-US'))).toBe('female')
    expect(genderOf(voice('English India', 'en_IN'))).toBe('unknown')
  })

  it('prefers a known male voice in any accent over an unknown one in the preferred accent', () => {
    const voices = [voice('English India', 'en_IN'), voice('Veena', 'en-IN'), voice('Daniel', 'en-GB'), voice('Samantha', 'en-US')]
    expect(pickMaleVoice(voices)?.name).toBe('Daniel')
  })

  it('takes the Indian English male voice when there is one', () => {
    const voices = [voice('Daniel', 'en-GB'), voice('Rishi', 'en-IN'), voice('Aaron', 'en-US')]
    expect(pickMaleVoice(voices)?.name).toBe('Rishi')
  })

  it('only ever picks a voice known to be male', () => {
    // Chrome on Android: one entry per language, gender unknown (often the phone's female default)
    expect(pickMaleVoice([voice('Samantha', 'en-US'), voice('English United States', 'en_US')])).toBeUndefined()
    expect(pickMaleVoice([voice('Samantha', 'en-US'), voice('Karen', 'en-AU')])).toBeUndefined()
  })

  it('honours a configured voice only if it is male', () => {
    const voices = [voice('Rishi', 'en-IN'), voice('Microsoft George - English (Great Britain)', 'en-GB'), voice('Samantha', 'en-US')]
    expect(pickMaleVoice(voices, 'Microsoft George - English (Great Britain)')?.name).toContain('George')
    expect(pickMaleVoice(voices, 'Samantha')?.name).toBe('Rishi')
    expect(pickMaleVoice([voice('English India', 'en_IN'), voice('Rishi', 'en-IN')], 'English India')?.name).toBe('Rishi')
  })
})
