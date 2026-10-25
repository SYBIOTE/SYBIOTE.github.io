/**
 * Lets the visitor talk over Rahul the way they would with a person:
 * - as soon as they start speaking while he's talking, his voice dips
 * - once the speech recognition hears real words from them, he stops and lets them have the turn
 * - if it was only a backchannel ("yeah", "mm-hm", "right") or a cough, his voice comes back up
 *
 * Words that match what Rahul is saying are ignored: that's his own voice leaking into the mic on
 * setups where echo cancellation doesn't catch it all, and it mustn't make him interrupt himself.
 */

export interface BargeInOptions {
  /** Whether Rahul's voice is playing (or queued) right now */
  isSpeaking: () => boolean
  /** Sets his voice's volume as a share of normal */
  duck: (amount: number) => void
  /** Stop talking and give the visitor the turn */
  interrupt: () => void
  /** What he's said so far in this reply, including the sentence playing now */
  spokenText: () => string
}

// How far his voice dips while it's unclear whether the visitor is taking the turn
const DUCK_LEVEL = 0.3
// If no words come within this long (a cough, a laugh), bring his voice back
const MAX_DUCK_MS = 2500
// Real words needed before he stops: from an interim transcript, or a final one
const INTERIM_WORDS = 2
const FINAL_WORDS = 1
// Share of the heard words found in his own recent speech above which it's treated as echo
const ECHO_SHARE = 0.6
const ECHO_WINDOW_WORDS = 40

// Things listeners say to show they're following, not to take the turn
const BACKCHANNELS = new Set([
  'yeah', 'yea', 'yes', 'yep', 'yup', 'ok', 'okay', 'right', 'sure', 'mhm', 'mmhm', 'mm', 'mmm', 'hmm', 'hm', 'uh', 'huh',
  'uhhuh', 'um', 'ah', 'oh', 'wow', 'nice', 'cool', 'great', 'got', 'it', 'i', 'see', 'true', 'totally', 'exactly', 'ha', 'haha'
])

const words = (text: string) =>
  text
    .toLowerCase()
    .replace(/[-‐]/g, '')
    .split(/[^a-z0-9']+/)
    .filter(Boolean)

export class BargeIn {
  private ducked = false
  // The visitor's current speech began while he was talking: only that can interrupt him (a late
  // transcript of the question he's answering mustn't)
  private overlapping = false
  private timer: ReturnType<typeof setTimeout> | null = null
  private readonly options: BargeInOptions

  constructor(options: BargeInOptions) {
    this.options = options
  }

  /** Voice activity: the visitor started speaking */
  speechStart() {
    this.overlapping = this.options.isSpeaking()
    if (!this.overlapping) return
    this.ducked = true
    this.options.duck(DUCK_LEVEL)
    this.clearTimer()
    this.timer = setTimeout(() => this.release(), MAX_DUCK_MS)
  }

  /** Voice activity: the visitor stopped; if they never said anything real, carry on */
  speechEnd() {
    if (this.ducked) this.release()
  }

  /** A transcript of what the visitor is saying (interim while they talk, final at a pause) */
  transcript(text: string, final: boolean) {
    if (!this.overlapping || !this.options.isSpeaking()) {
      if (this.ducked) this.release()
      return
    }
    const heard = words(text)
    const real = heard.filter((w) => !BACKCHANNELS.has(w))
    if (real.length < (final ? FINAL_WORDS : INTERIM_WORDS)) return
    if (this.echoes(heard)) return
    this.clearTimer()
    this.ducked = false
    this.overlapping = false
    this.options.interrupt()
  }

  /** Whether `text` is mostly words the avatar just said: its own voice coming back through the mic */
  isEcho(text: string) {
    const heard = words(text)
    return heard.length > 0 && this.echoes(heard)
  }

  private echoes(heard: string[]) {
    const recent = new Set(words(this.options.spokenText()).slice(-ECHO_WINDOW_WORDS))
    if (!recent.size) return false
    return heard.filter((w) => recent.has(w)).length / heard.length >= ECHO_SHARE
  }

  private release() {
    this.clearTimer()
    this.ducked = false
    this.options.duck(1)
  }

  private clearTimer() {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
  }
}
