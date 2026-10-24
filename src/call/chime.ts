/**
 * Meeting join/leave chimes, synthesised with Web Audio (no audio files to ship).
 * Call primeAudio() inside a click so the browser allows playback later.
 */

import { getAudioContext, keepAudioUnlocked, unlockAudio } from '../services/tts/audioContext'

let context: AudioContext | null = null

/** Unlocks the shared context the chimes and the avatar's voice both play through */
export const primeAudio = () => {
  unlockAudio()
  keepAudioUnlocked()
  try {
    context = getAudioContext()
  } catch {
    context = null
  }
}

const NOTES = {
  join: [659.25, 880], // E5 -> A5, rising
  leave: [880, 587.33] // A5 -> D5, falling
}

export const playChime = (kind: keyof typeof NOTES) => {
  if (!context) return
  const start = context.currentTime + 0.02
  NOTES[kind].forEach((frequency, i) => {
    const osc = context!.createOscillator()
    const gain = context!.createGain()
    const at = start + i * 0.16
    osc.type = 'sine'
    osc.frequency.value = frequency
    gain.gain.setValueAtTime(0, at)
    gain.gain.linearRampToValueAtTime(0.12, at + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.45)
    osc.connect(gain).connect(context!.destination)
    osc.start(at)
    osc.stop(at + 0.5)
  })
}
