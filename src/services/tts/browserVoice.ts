/**
 * Picks a male English voice for the browser's built-in speech (used until the cloned voice is set up).
 *
 * Browsers don't say which voices are male, so we go by name, from Readium's curated voice list
 * (voiceGenders.json): full names ("Google UK English Male", "Microsoft Ravi"), Android voice codes
 * ("en-in-x-end"), and the short names Apple voices start with ("Rishi", "Daniel (Enhanced)").
 * Only voices known to be male qualify: a voice we can't place may well be female (browsers' defaults
 * often are), and Rahul never speaks in a female voice. Without one, ttsService falls back to a male
 * voice that runs in the browser.
 *
 * Chrome on Android never qualifies: it lists one entry per language, which speaks with whatever
 * voice the phone is set to.
 */

import GENDERS from './voiceGenders.json'

type Gender = 'male' | 'female' | 'unknown'

const SETS = {
  male: { names: new Set(GENDERS.male.names), apple: GENDERS.male.apple },
  female: { names: new Set(GENDERS.female.names), apple: GENDERS.female.apple }
}
// Names that say so themselves, for voices missing from the list
const SAYS_FEMALE = /\bfemale\b|\bwoman\b/
const SAYS_MALE = /\bmale\b|\bman\b/

const lower = (name: string) => name.toLowerCase().trim()
const androidCode = (name: string) => /en-[a-z]{2}-x-[a-z]{3}/.exec(name)?.[0]
const appleName = (name: string, labels: string[]) => labels.some((l) => name === l || name.startsWith(`${l} (`) || name.startsWith(`${l} `))

export const genderOf = (voice: Pick<SpeechSynthesisVoice, 'name'>): Gender => {
  const name = lower(voice.name)
  const code = androidCode(name)
  for (const gender of ['male', 'female'] as const) {
    const set = SETS[gender]
    if (set.names.has(name) || (code && set.names.has(code)) || appleName(name, set.apple)) return gender
  }
  if (SAYS_FEMALE.test(name)) return 'female'
  if (SAYS_MALE.test(name)) return 'male'
  return 'unknown'
}

// Accent preference: Indian, then British, then American English, then any English
const ACCENTS = ['en-in', 'en-gb', 'en-us']
const accentScore = (lang: string) => {
  const tag = lang.toLowerCase().replace('_', '-')
  const i = ACCENTS.indexOf(tag.slice(0, 5))
  return i >= 0 ? ACCENTS.length - i : tag.startsWith('en') ? 0.5 : -10
}

const score = (voice: SpeechSynthesisVoice) => accentScore(voice.lang) + (voice.localService ? 0.25 : 0)

/** The configured voice if it's known to be male, else the best known male voice, else undefined. */
export const pickMaleVoice = (voices: SpeechSynthesisVoice[], preferred = ''): SpeechSynthesisVoice | undefined => {
  const male = voices.filter((v) => genderOf(v) === 'male')
  const wanted = lower(preferred)
  if (wanted) {
    const exact = male.find((v) => lower(v.name) === wanted)
    if (exact) return exact
  }
  let best: SpeechSynthesisVoice | undefined
  let bestScore = -Infinity
  for (const voice of male) {
    const s = score(voice)
    if (s > bestScore) {
      best = voice
      bestScore = s
    }
  }
  return best
}
