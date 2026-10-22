/**
 * The head's non-verbal behaviour in conversation: where it looks, when it blinks, when it nods, and
 * the small life in the face. It ties the eye, blink, head and face modules to what's happening:
 *
 * While speaking (timed to the voice's cues when its face frames are available):
 * - a glance away as a phrase starts, and aside during pauses to hold the floor; back to the viewer
 *   as a sentence ends, handing the turn over (Andrist et al., IVA 2013)
 * - a small beat nod on some stressed words
 * - blinks at pauses and sentence ends
 * While the visitor speaks:
 * - nods when they pause (short, double or a slow acknowledgement), sometimes with a warm smile,
 *   and the odd small nod through long stretches; eye contact broken by short glances
 */

import { cueBlink, type BlinkMotionState, createBlinkMotion, updateBlinkMotion } from './blinkMotion'
import { avertGaze, createEyeMotion, gazeToArkit, lookAtViewer, updateEyeMotion, type EyeMotionState, type GazeMode } from './eyeMotion'
import { createFaceDrift, updateFaceDrift, warmSmile, type FaceDriftState } from './faceDrift'
import { createHeadMotion, nod, updateHeadMotion, type HeadMotionState, type HeadPose, type NodKind } from './headMotion'
import type { ArkitBlendshape } from './arkitMapping'
import type { SpeechCueHits } from '../../../services/audio2expression/speechFace'

// A glance at least this big (gaze units) brings a blink this often; so do pauses and sentence ends
const GLANCE_BLINK_FROM = 0.25
const GLANCE_BLINK_CHANCE = 0.5
const PAUSE_BLINK_CHANCE = 0.6
// Speaking
const FIRST_PHRASE_AVERT = 0.7
const PHRASE_AVERT = 0.35
const PAUSE_AVERT = 0.5
const SENTENCE_END_CONTACT = 0.75
const BEAT_NOD_CHANCE = 0.45
const BEAT_NOD_GAP_MS = 900
// Listening
const PAUSE_NOD_CHANCE = 0.65
const PAUSE_NOD_KINDS: [NodKind, number][] = [['short', 0.5], ['double', 0.25], ['long', 0.25]]
const NOD_SMILE_CHANCE = 0.35
const LONG_TALK_NOD_MS = [3500, 6500] as const
const LONG_TALK_NOD_CHANCE = 0.5

export interface PresenceState {
  eyes: EyeMotionState
  blinks: BlinkMotionState
  head: HeadMotionState
  face: FaceDriftState
  wasSpeaking: boolean
  wasVisitorTalking: boolean
  nextTalkNodAt: number
}

export interface PresenceInput {
  mode: GazeMode
  /** performance.now() ms */
  now: number
  /** seconds since the previous frame */
  delta: number
  /** The head's voice is playing */
  speaking: boolean
  /** The voice's face frames cover this moment (the model drives the face) */
  voiceDrivesFace: boolean
  /** The visitor is talking (voice activity) */
  visitorTalking: boolean
  /** Cues from the playing clip since the previous frame */
  cues: SpeechCueHits
}

export interface PresenceFrame {
  /** Gaze and face drift, to add to the frame */
  extra: Partial<Record<ArkitBlendshape, number>>
  /** Eyelid closure from blinking, 0..1 */
  blink: number
  /** Extra head rotation */
  head: HeadPose
}

export const createPresence = (): PresenceState => ({
  eyes: createEyeMotion(),
  blinks: createBlinkMotion(),
  head: createHeadMotion(),
  face: createFaceDrift(),
  wasSpeaking: false,
  wasVisitorTalking: false,
  nextTalkNodAt: Infinity
})

const pick = <T>(options: [T, number][]): T => {
  let r = Math.random()
  for (const [option, weight] of options) if ((r -= weight) < 0) return option
  return options[options.length - 1][0]
}

export const updatePresence = (p: PresenceState, input: PresenceInput): PresenceFrame => {
  const { mode, now, delta, speaking, visitorTalking, cues } = input
  const chance = (c: number) => Math.random() < c
  const glance = (jump: number) => jump > GLANCE_BLINK_FROM && cueBlink(p.blinks, now, mode, GLANCE_BLINK_CHANCE)
  const averted = () => p.eyes.avertedUntil > now

  // Speaking: the turn starts with a thinking glance; it ends back on the viewer
  if (speaking && !p.wasSpeaking && chance(FIRST_PHRASE_AVERT)) glance(avertGaze(p.eyes, now, 'think'))
  if (!speaking && p.wasSpeaking) glance(lookAtViewer(p.eyes, now))
  if (speaking) {
    if (cues.phrase && !averted() && chance(PHRASE_AVERT)) glance(avertGaze(p.eyes, now, 'think'))
    if (cues.pause) {
      if (!averted() && chance(PAUSE_AVERT)) glance(avertGaze(p.eyes, now, 'hold'))
      cueBlink(p.blinks, now, mode, PAUSE_BLINK_CHANCE)
    }
    if (cues.accent && chance(BEAT_NOD_CHANCE)) nod(p.head, now, 'beat', BEAT_NOD_GAP_MS)
  }
  if (cues.end) {
    if (chance(SENTENCE_END_CONTACT)) glance(lookAtViewer(p.eyes, now))
    cueBlink(p.blinks, now, mode, PAUSE_BLINK_CHANCE)
  }

  // Listening: nod when the visitor pauses, and now and then through a long stretch
  if (visitorTalking && !p.wasVisitorTalking) p.nextTalkNodAt = now + LONG_TALK_NOD_MS[0] + Math.random() * (LONG_TALK_NOD_MS[1] - LONG_TALK_NOD_MS[0])
  if (!visitorTalking && p.wasVisitorTalking && !speaking) {
    p.nextTalkNodAt = Infinity
    if (chance(PAUSE_NOD_CHANCE) && nod(p.head, now, pick(PAUSE_NOD_KINDS)) && chance(NOD_SMILE_CHANCE)) warmSmile(p.face, now)
  }
  if (visitorTalking && now >= p.nextTalkNodAt) {
    if (chance(LONG_TALK_NOD_CHANCE)) nod(p.head, now, 'short')
    p.nextTalkNodAt = now + LONG_TALK_NOD_MS[0] + Math.random() * (LONG_TALK_NOD_MS[1] - LONG_TALK_NOD_MS[0])
  }
  p.wasSpeaking = speaking
  p.wasVisitorTalking = visitorTalking

  glance(updateEyeMotion(p.eyes, mode, now, delta))
  const extra = gazeToArkit(p.eyes)
  for (const [name, value] of Object.entries(updateFaceDrift(p.face, mode, now, delta, input.voiceDrivesFace))) {
    extra[name as ArkitBlendshape] = (extra[name as ArkitBlendshape] ?? 0) + value
  }
  return { extra, blink: updateBlinkMotion(p.blinks, now, mode), head: updateHeadMotion(p.head, now, delta, p.eyes) }
}
