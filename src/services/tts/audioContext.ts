/**
 * The one AudioContext all playback shares: the avatar's voice and the call chimes.
 *
 * Mobile browsers (iOS Safari above all) only let a context play if it was created or resumed
 * inside a tap. A context first made later, e.g. once a TTS clip has downloaded, stays suspended:
 * clips "play" silently and never end. So unlockAudio() runs inside the join click, and again on
 * any later tap in case the OS suspended the context meanwhile (backgrounding, a phone call).
 */

let context: AudioContext | null = null

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext }
type AudioSessionNavigator = Navigator & { audioSession?: { type: string } }

export const getAudioContext = (): AudioContext => {
  if (!context) {
    const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext!
    context = new Ctor()
  }
  if (context.state !== 'running') void context.resume().catch(() => {})
  return context
}

/** Call inside a user gesture. Safe to call repeatedly. */
export const unlockAudio = () => {
  try {
    // iOS 17+: play through the ring/silent switch, like a video would. Without this, Web Audio is
    // muted whenever the phone is on silent
    const nav = navigator as AudioSessionNavigator
    if (nav.audioSession && nav.audioSession.type !== 'play-and-record') nav.audioSession.type = 'playback'

    const ctx = getAudioContext()
    // Older iOS only unlocks once something actually starts inside the gesture: a one-sample silence
    const silence = ctx.createBufferSource()
    silence.buffer = ctx.createBuffer(1, 1, ctx.sampleRate)
    silence.connect(ctx.destination)
    silence.start(0)
  } catch {
    // Web Audio unavailable
  }
}

let listening = false
/** Re-unlocks on every tap or key press, so a context the OS suspended comes back on next touch. */
export const keepAudioUnlocked = () => {
  if (listening) return
  listening = true
  const relock = () => {
    if (context?.state !== 'running') unlockAudio()
  }
  for (const type of ['pointerdown', 'touchend', 'keydown'] as const) {
    window.addEventListener(type, relock, { capture: true, passive: true })
  }
}
