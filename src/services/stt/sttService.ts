/**
 * The browser's speech recognition (Web Speech API), switched on while the visitor is talking.
 *
 * Chrome ends a recognition session on its own: after a few seconds of silence, after an error, or
 * just because. So whenever a session ends while listening is still wanted, a new one starts. State
 * lives in refs, not in the recognizer's callbacks, so a restart always sees whether listening is
 * wanted *now* (reading it from the closure the recognizer was created with left it deaf).
 *
 * It asks for several alternatives per phrase so the caller can pick the one that fits the site
 * (see vocabulary.ts), boosts the site's names where the browser supports phrase biasing, and
 * switches language mid-call by restarting the session.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { defaultSTTConfig, type STTConfig } from './sttConfig'

interface STTPerformResult {
  text: string
  interrupt: number
  confidence: number
  spoken: boolean
  human: boolean
  comment: string
  rcounter: number
  bcounter: number
  final: boolean
  bargein: boolean
}

interface UseSTTServiceProps {
  config?: Partial<STTConfig>
  onPerform?: (result: STTPerformResult) => void
  onInterimTranscript?: (text: string) => void
  /** Picks one of the recognizer's alternatives for a phrase, most likely first (default: the first) */
  chooseTranscript?: (alternatives: string[]) => string
  /** Words to boost, where the browser supports it (SpeechRecognition.phrases) */
  phrases?: string[]
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
  length: number
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult
  length: number
}

interface SpeechRecognitionEventType {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface BaseSpeechRecognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  phrases?: unknown[]
  start(): void
  stop(): void
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: ((event: Event) => void) | null
  onresult: ((event: SpeechRecognitionEventType) => void) | null
}

interface WindowWithSpeech extends Window {
  SpeechRecognition?: { new (): BaseSpeechRecognition }
  webkitSpeechRecognition?: { new (): BaseSpeechRecognition }
  SpeechRecognitionPhrase?: { new (phrase: string, boost?: number): unknown }
}

const MAX_NETWORK_BACKOFF_MS = 10_000
const ALTERNATIVES = 4
// How strongly boosted phrases are favoured (the spec's range is 0-10)
const PHRASE_BOOST = 5

/** Boosts `phrases` if this browser's recognizer supports it; returns whether it did */
const boostPhrases = (recognition: BaseSpeechRecognition, phrases: string[]): boolean => {
  const Phrase = (window as WindowWithSpeech).SpeechRecognitionPhrase
  if (!Phrase || !('phrases' in recognition) || !phrases.length) return false
  try {
    recognition.phrases = phrases.map((p) => new Phrase(p, PHRASE_BOOST))
    return true
  } catch {
    return false
  }
}

export const useSTTService = ({
  config: configPartial = {},
  onPerform,
  onInterimTranscript,
  chooseTranscript,
  phrases
}: UseSTTServiceProps = {}) => {
  const config = { ...defaultSTTConfig, ...configPartial }
  const [isListening, setIsListening] = useState(false)
  const [allowed, setAllowed] = useState(true)
  const [desired, setDesired] = useState(false)

  const recognitionRef = useRef<BaseSpeechRecognition | null>(null)
  // Mirrors of the state above, read by the recognizer's callbacks
  const desiredRef = useRef(false)
  const allowedRef = useRef(true)
  // A session is starting or running (between start() and onend)
  const sessionRef = useRef(false)
  const networkFailuresRef = useRef(0)
  const restartTimerRef = useRef<number | undefined>(undefined)
  const rcounterRef = useRef(1)
  const bcounterRef = useRef(1)
  // The caller passes new callbacks on every render
  const onPerformRef = useRef(onPerform)
  const onInterimRef = useRef(onInterimTranscript)
  const chooseRef = useRef(chooseTranscript)
  onPerformRef.current = onPerform
  onInterimRef.current = onInterimTranscript
  chooseRef.current = chooseTranscript

  const wanted = () => desiredRef.current && allowedRef.current

  const startSession = useCallback(() => {
    const recognition = recognitionRef.current
    if (!recognition || sessionRef.current || !wanted()) return
    window.clearTimeout(restartTimerRef.current)
    sessionRef.current = true
    try {
      recognition.start()
    } catch (error) {
      // Already running (a stop() still finishing): its onend starts the next session
      logger.warn('STT: start failed', error)
    }
  }, [])

  const stopSession = useCallback(() => {
    window.clearTimeout(restartTimerRef.current)
    if (!recognitionRef.current || !sessionRef.current) return
    try {
      // stop(), not abort(): what was already heard still comes through as a final result
      recognitionRef.current.stop()
    } catch {
      // not running
    }
  }, [])

  const initRecognition = useCallback(() => {
    if (recognitionRef.current) return
    const windowWithSpeech = window as WindowWithSpeech
    const SpeechRecognitionClass = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition
    if (!SpeechRecognitionClass) {
      logger.error('STT: Speech recognition not supported in this browser')
      return
    }

    const recognition = new SpeechRecognitionClass()
    recognition.lang = config.language
    recognition.continuous = config.continuous
    recognition.interimResults = true
    recognition.maxAlternatives = ALTERNATIVES
    boostPhrases(recognition, phrases ?? [])
    let restartDelayMs = 0

    recognition.onstart = () => {
      sessionRef.current = true
      networkFailuresRef.current = 0
      setIsListening(true)
    }

    recognition.onerror = (event: Event) => {
      const error = (event as unknown as { error?: string }).error
      switch (error) {
        case 'not-allowed':
        case 'service-not-allowed':
        case 'audio-capture':
          // No permission or no microphone: stop for good rather than loop
          logger.error('STT: microphone unavailable', error)
          allowedRef.current = false
          setAllowed(false)
          break
        case 'network':
          networkFailuresRef.current = Math.min(networkFailuresRef.current + 1, 6)
          restartDelayMs = Math.min(200 * 2 ** networkFailuresRef.current, MAX_NETWORK_BACKOFF_MS)
          logger.warn('STT: network error, retrying in', restartDelayMs)
          break
        case 'phrases-not-supported':
          // Supported by the API but not by this recognizer: carry on without them
          recognition.phrases = []
          break
        case 'no-speech':
        case 'aborted':
          // Routine: the session ends and the next one starts
          break
        default:
          logger.warn('STT: recognition error', error)
      }
    }

    recognition.onend = () => {
      sessionRef.current = false
      setIsListening(false)
      if (!wanted()) return
      const delay = restartDelayMs
      restartDelayMs = 0
      if (!navigator.onLine) {
        window.addEventListener('online', () => startSession(), { once: true })
        return
      }
      restartTimerRef.current = window.setTimeout(startSession, delay)
    }

    recognition.onresult = (event: SpeechRecognitionEventType) => {
      // Every result that changed: a continuous session keeps adding phrases after the first
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const data = event.results[i]
        const alternatives = Array.from({ length: data.length }, (_, k) => data[k].transcript.trim())
        const text = chooseRef.current?.(alternatives) ?? alternatives[0]
        const final = data.isFinal
        onPerformRef.current?.({
          text,
          interrupt: performance.now(),
          confidence: data[0].confidence || 1,
          spoken: true,
          human: true,
          comment: `User vocalization ${bcounterRef.current} final ${final}`,
          rcounter: rcounterRef.current,
          bcounter: bcounterRef.current,
          final,
          bargein: true
        })
        if (final) {
          onInterimRef.current?.('')
          rcounterRef.current++
          bcounterRef.current = 1
        } else {
          onInterimRef.current?.(text)
          bcounterRef.current++
        }
      }
    }

    recognitionRef.current = recognition
    // Created once; the language follows config.language below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startSession])

  // The visitor switched language mid-call: restart the session in the new one
  useEffect(() => {
    const recognition = recognitionRef.current
    if (!recognition || recognition.lang === config.language) return
    recognition.lang = config.language
    if (sessionRef.current) stopSession()
  }, [config.language, stopSession])

  const update = useCallback(() => {
    if (wanted()) {
      initRecognition()
      startSession()
    } else {
      stopSession()
    }
  }, [initRecognition, startSession, stopSession])

  const setAllowedState = useCallback(
    (state: boolean) => {
      allowedRef.current = state
      setAllowed(state)
      update()
    },
    [update]
  )

  const setDesiredState = useCallback(
    (state: boolean) => {
      desiredRef.current = state
      setDesired(state)
      update()
    },
    [update]
  )

  useEffect(
    () => () => {
      desiredRef.current = false
      window.clearTimeout(restartTimerRef.current)
      try {
        recognitionRef.current?.stop()
      } catch {
        // not running
      }
    },
    []
  )

  const state = useMemo(() => ({ isListening, allowed, desired }), [isListening, allowed, desired])

  const actions = useMemo(
    () => ({
      setAllowed: setAllowedState,
      setDesired: setDesiredState,
      startListening: () => setDesiredState(true),
      stopListening: () => setDesiredState(false)
    }),
    [setAllowedState, setDesiredState]
  )

  return useMemo(() => ({ state, actions }), [state, actions])
}
