import { useCallback, useEffect, useMemo, useRef } from 'react'


import { expressionTrackFor, type ExpressionTrack } from '../audio2expression/audio2expression'
import { startSpeechFace, stopSpeechFace } from '../audio2expression/speechFace'
import { cleanText } from './textUtils'
import { approximateWhisperDataFromText } from './whisperDataGenerator'
import { type TTSConfig, type WhisperData, defaultTTSConfig } from './ttsConfig'

// Workerized TTS using vits-web library
const createTTSWorker = (): Worker => {
  const ttsWorkerString = `
import * as tts from 'https://cdn.jsdelivr.net/npm/@diffusionstudio/vits-web@1.0.3/+esm'
self.addEventListener('message', async (e) => {
  const id = e.data.id
  const text = e.data.text || 'please supply some text'
  const voiceId = e.data.voice || 'en_GB-hfc_male-medium'
  logger.log('TTS Worker received message:', { id, text, voiceId })
  tts.predict({text, voiceId}).then(audio => {
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(reader.error)
      reader.readAsArrayBuffer(audio)
    }).then(audio => {
      self.postMessage({ audio, id })
    }).catch(error => {
      logger.error('TTS Worker Error:', error)
      self.postMessage({ error: error.message, id })
    })
  })
})
`
  return new Worker(URL.createObjectURL(new Blob([ttsWorkerString], { type: 'text/javascript' })), { type: 'module' })
}

interface TTSServiceOptions {
  config?: Partial<TTSConfig>
  onSpeechStart?: (text: string, whisperData: WhisperData) => void
  onSpeechEnd?: () => void
  /** Called after each queued message finishes playing (onSpeechEnd only fires once the queue is empty) */
  onUtteranceEnd?: () => void
}

interface QueuedMessage {
  id: number
  text: string
  status: 'pending' | 'generating' | 'ready' | 'playing' | 'completed' | 'error'
  audio?: ArrayBuffer
  /** Cloud mode: decoded clip, and its audio-driven face frames (resolves null if unavailable) */
  decoded?: AudioBuffer
  track?: Promise<ExpressionTrack | null>
  /** Cloud mode couldn't produce this clip: speak it with the browser voice instead */
  useBrowser?: boolean
  whisperData?: WhisperData
  error?: string
}

let globalId = 0

// How long a clip may wait for its face frames before playing with text-based lipsync. Only the
// first clip of a reply usually waits (later ones are processed while earlier ones play), and a
// reply already takes about a second to start, so a short extra wait buys audio-accurate lipsync.
const TRACK_WAIT_MS = 1200

// One AudioContext for all playback (creating one per clip leaks, and a single graph lets the
// browser's echo cancellation see what the avatar is saying)
let sharedAudioContext: AudioContext | null = null
const getAudioContext = () => {
  sharedAudioContext ??= new AudioContext()
  if (sharedAudioContext.state === 'suspended') void sharedAudioContext.resume()
  return sharedAudioContext
}

// Set once /api/tts reports it isn't configured: stop asking for the rest of the session
let cloudUnavailable = false

export const useTTSService = (options: TTSServiceOptions = {}) => {
  const { config: configPartial = {}, onSpeechStart, onSpeechEnd, onUtteranceEnd } = options
  const config = useMemo(() => ({ ...defaultTTSConfig, ...configPartial }), [configPartial])
  const isProcessing = useRef(false)
  const messageQueue = useRef<QueuedMessage[]>([])
  const nextExpectedId = useRef(0)
  const workerRef = useRef<Worker | null>(null)
  const currentResolveRef = useRef<(() => void) | null>(null)
  // Speed multiplier that makes the lipsync estimate match the browser voice; the text-based
  // estimate runs slow for most voices, so start a little faster and refine after each sentence
  const browserRateCalibration = useRef(1.25)

  // Initialize worker for local TTS
  const getOrCreateWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = createTTSWorker()
    }
    return workerRef.current
  }, [])

  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null)

  /** Plays a decoded clip; onStart gets the performance.now() time playback began. */
  const playDecoded = useCallback(
    (decoded: AudioBuffer, onStart?: (startedAt: number) => void): Promise<void> =>
      new Promise((resolve) => {
        const audioContext = getAudioContext()
        const source = audioContext.createBufferSource()
        const gainNode = audioContext.createGain()
        // Use global volume if available, otherwise use config volume
        gainNode.gain.value = (window as Window & { globalTTSVolume?: number }).globalTTSVolume ?? config.volume
        source.buffer = decoded
        source.connect(gainNode)
        gainNode.connect(audioContext.destination)
        source.onended = () => {
          if (currentSourceRef.current === source) currentSourceRef.current = null
          currentResolveRef.current = null
          resolve()
        }
        currentSourceRef.current = source
        currentResolveRef.current = resolve
        source.start(0)
        onStart?.(performance.now() + audioContext.outputLatency * 1000)
      }),
    [config.volume]
  )

  const playAudioBuffer = useCallback(
    async (audioBuffer: ArrayBuffer): Promise<void> => {
      try {
        await playDecoded(await getAudioContext().decodeAudioData(audioBuffer.slice(0)))
      } catch (error) {
        logger.error('Audio decode error:', error)
        throw error
      }
    },
    [playDecoded]
  )

  // Generate audio using browser speech synthesis
  const generateBrowserAudio = useCallback(async (_message: QueuedMessage) => {
    if (!('speechSynthesis' in window)) {
      throw new Error('Speech synthesis not supported')
    }

    // For browser mode, we don't pre-generate audio, we play it directly during playback
    // Just mark as ready
    return Promise.resolve()
  }, [])

  // Generate audio using local worker
  const generateLocalAudio = useCallback(
    async (message: QueuedMessage) => {
      return new Promise<void>((resolve, reject) => {
        const worker = getOrCreateWorker()

        const handleWorkerMessage = (event: MessageEvent) => {
          const { audio, id, error } = event.data
          if (error) {
            reject(new Error(error))
            return
          }
          if (id === message.id) {
            message.audio = audio
            worker.removeEventListener('message', handleWorkerMessage)
            worker.removeEventListener('error', handleWorkerError)
            resolve()
          }
        }

        const handleWorkerError = (error: ErrorEvent) => {
          worker.removeEventListener('message', handleWorkerMessage)
          worker.removeEventListener('error', handleWorkerError)
          reject(new Error(`Worker Error: ${error.message}`))
        }

        worker.addEventListener('message', handleWorkerMessage)
        worker.addEventListener('error', handleWorkerError)

        worker.postMessage({
          id: message.id,
          text: message.text,
          voice: config.voice
        })
      })
    },
    [getOrCreateWorker, config.voice]
  )

  // Generate audio using remote API
  const generateRemoteAudio = useCallback(
    async (message: QueuedMessage) => {
      if (!config.apiKey) {
        throw new Error('API key required for remote TTS')
      }

      const url = config.url || 'https://api.openai.com/v1/audio/speech'

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`
      }

      // OpenAI TTS API payload format
      const requestBody = {
        input: message.text,
        model: config.model || 'tts-1',
        voice: config.voice || 'shimmer',
        response_format: 'mp3',
        speed: config.speed || 1.0
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`Remote TTS API error: ${response.status} ${response.statusText}`)
      }

      message.audio = await response.arrayBuffer()
    },
    [config.apiKey, config.url, config.model, config.voice, config.speed]
  )

  // Generate audio with Rahul's cloned voice via /api/tts; any failure falls back to the browser voice
  const generateCloudAudio = useCallback(
    async (message: QueuedMessage) => {
      if (cloudUnavailable) {
        message.useBrowser = true
        return
      }
      try {
        const response = await fetch(config.cloudUrl || '/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: message.text })
        })
        if (response.status === 503) cloudUnavailable = true
        if (!response.ok) throw new Error(`TTS ${response.status}`)
        message.decoded = await getAudioContext().decodeAudioData(await response.arrayBuffer())
        // Face frames are computed in the background while earlier clips play
        message.track = expressionTrackFor(message.decoded)
      } catch (error) {
        logger.warn('Cloud TTS unavailable, using the browser voice:', error)
        message.useBrowser = true
      }
    },
    [config.cloudUrl]
  )

  // Generate audio for a specific message
  const generateAudioForMessage = useCallback(
    async (message: QueuedMessage) => {
      message.status = 'generating'
      logger.log(`Generating audio for message ${message.id}`)

      try {
        if (config.mode === 'remote') {
          await generateRemoteAudio(message)
        } else if (config.mode === 'browser') {
          await generateBrowserAudio(message)
        } else if (config.mode === 'local') {
          await generateLocalAudio(message)
        } else if (config.mode === 'cloud') {
          await generateCloudAudio(message)
        }
        message.status = 'ready'
      } catch (error) {
        logger.error(`Error generating audio for message ${message.id}:`, error)
        message.status = 'error'
        message.error = error instanceof Error ? error.message : 'Unknown error'
      }
    },
    [config.mode, generateRemoteAudio, generateBrowserAudio, generateLocalAudio, generateCloudAudio]
  )

  // Process the queue sequentially
  const processQueue = useCallback(async () => {
    if (isProcessing.current) return
    isProcessing.current = true

    try {
      while (true) {
        const nextMessage = messageQueue.current.find((msg) => msg.id === nextExpectedId.current)

        if (!nextMessage) {
          // No more messages to process
          break
        }

        // If message is pending, generate audio
        if (nextMessage.status === 'pending') {
          await generateAudioForMessage(nextMessage)
        }

        // If message is not ready after generation, skip for now
        if (nextMessage.status !== 'ready') {
          if (nextMessage.status === 'error') {
            logger.error(`Skipping message ${nextMessage.id} due to error:`, nextMessage.error)
            messageQueue.current = messageQueue.current.filter((msg) => msg.id !== nextMessage.id)
            nextExpectedId.current = nextMessage.id + 1
            continue
          } else if (nextMessage.status === 'generating') {
            // For prefetching modes, wait a bit for generation to complete
            if (config.mode === 'local' || config.mode === 'cloud') {
              await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
              continue
            }
          }
          // For other cases, exit and let it be handled later
          break
        }

        // Play the message
        nextMessage.status = 'playing'
        logger.log(`Playing message ${nextMessage.id}`)

        // Generate whisper data and notify speech start (drives lipsync + subtitles).
        // Browser voices can take hundreds of ms to start, so for them this waits for the
        // utterance's own start event to keep the mouth in sync with the audio.
        const speaksWithBrowser = config.mode === 'browser' || !!nextMessage.useBrowser
        const playsCloudClip = config.mode === 'cloud' && !!nextMessage.decoded && !nextMessage.useBrowser
        let speechStartedAt = 0
        let estimatedDuration = 0
        const notifySpeechStart = () => {
          const rate = speaksWithBrowser ? config.speed * browserRateCalibration.current : config.speed
          const whisperData = approximateWhisperDataFromText(nextMessage.text, rate, 0)
          const { wtimes = [], wdurations = [] } = whisperData
          const last = wtimes.length - 1
          estimatedDuration = last >= 0 ? wtimes[last] + (wdurations[last] ?? 0) : 0
          speechStartedAt = performance.now()
          onSpeechStart?.(nextMessage.text, whisperData)
        }
        // Cloud clips notify when playback actually starts (they may first wait for face frames)
        if (!speaksWithBrowser && !playsCloudClip) notifySpeechStart()

        try {
          // Handle different TTS modes for playback
          if (playsCloudClip) {
            const decoded = nextMessage.decoded!
            const trackPromise = nextMessage.track ?? Promise.resolve(null)
            // Give the face frames a moment (usually already done while the previous clip played)
            const track = await Promise.race([
              trackPromise,
              new Promise<null>((resolve) => setTimeout(() => resolve(null), TRACK_WAIT_MS))
            ])
            let playbackStart = 0
            await playDecoded(decoded, (startedAt) => {
              playbackStart = startedAt
              notifySpeechStart()
              if (track) startSpeechFace(track, startedAt)
              // Frames that arrive after playback began still line up: they're indexed by time
              else void trackPromise.then((late) => late && playbackStart === startedAt && startSpeechFace(late, startedAt))
            })
            playbackStart = -1
            stopSpeechFace()
          } else if (speaksWithBrowser) {
            await new Promise<void>((resolve, reject) => {
              // Store resolve function so we can call it when stopping
              currentResolveRef.current = resolve
              
              const utterance = new SpeechSynthesisUtterance(nextMessage.text)
              utterance.rate = config.speed
              utterance.pitch = config.pitch
              // Use global volume if available, otherwise fall back to config volume
              utterance.volume = (window as Window & { globalTTSVolume?: number }).globalTTSVolume ?? config.volume

              const selectBrowserVoice = (voices: SpeechSynthesisVoice[]) => {
                const desired = (config.voice || '').trim().toLowerCase()

                const looksFemale = (voice: SpeechSynthesisVoice) => {
                  const name = voice.name.toLowerCase()
                  // A small heuristic set that catches common female voices across platforms.
                  return (
                    name.includes('female') ||
                    name.includes('zira') || // "Microsoft Zira" (female)
                    name.includes('veena') ||
                    name.includes('alice') ||
                    name.includes('neerja')
                  )
                }

                const maleHintScore = (voice: SpeechSynthesisVoice) => {
                  const name = voice.name.toLowerCase()
                  // Positive hints for commonly-male voice names across platforms.
                  if (name.includes('male')) return 3
                  if (name.includes('david')) return 3 // "Microsoft David"
                  if (name.includes('rishi')) return 3
                  if (name.includes('mark')) return 2
                  if (name.includes('daniel')) return 2
                  return 0
                }

                const scoreMaleVoice = (voice: SpeechSynthesisVoice) => {
                  if (looksFemale(voice)) return -100
                  // Prefer local/offline voices when available.
                  const localBoost = voice.localService ? 0.5 : 0
                  return 1 + maleHintScore(voice) + localBoost
                }

                const pickBestMale = (candidates: SpeechSynthesisVoice[]) => {
                  if (candidates.length === 0) return undefined
                  let best = candidates[0]
                  let bestScore = scoreMaleVoice(best)
                  for (let i = 1; i < candidates.length; i++) {
                    const v = candidates[i]
                    const s = scoreMaleVoice(v)
                    if (s > bestScore) {
                      best = v
                      bestScore = s
                    }
                  }
                  return bestScore > -100 ? best : undefined
                }

                // If user provided an actual browser voice name, we only accept it if it doesn't
                // look female (requirement: always male).
                if (desired) {
                  const exact = voices.find((v) => v.name.toLowerCase() === desired)
                  if (exact && !looksFemale(exact)) {
                    utterance.voice = exact
                    logger.log('TTS: Using exact browser voice match (male):', exact.name, exact.lang)
                    return
                  }
                }

                // Always attempt a male voice, regardless of config.voice.
                // Priority: Indian English -> UK English -> US English -> any English -> anything
                const byLang = (lang: string) => voices.filter((v) => v.lang === lang)
                const isEnglish = (v: SpeechSynthesisVoice) => v.lang.toLowerCase().startsWith('en')

                const maleVoice =
                  pickBestMale(byLang('en-IN')) ||
                  pickBestMale(byLang('en-GB')) ||
                  pickBestMale(byLang('en-US')) ||
                  pickBestMale(voices.filter(isEnglish)) ||
                  pickBestMale(voices)

                if (maleVoice) {
                  utterance.voice = maleVoice
                  logger.log('TTS: Using male voice:', maleVoice.name, maleVoice.lang)
                }
              }
              
              utterance.onstart = notifySpeechStart

              utterance.onend = () => {
                currentResolveRef.current = null
                // Learn how fast this device's voice really speaks, so the next lipsync estimate matches it
                const actual = performance.now() - speechStartedAt
                if (speechStartedAt && estimatedDuration > 0 && actual > 300 && nextMessage.text.split(/\s+/).length >= 4) {
                  const observed = browserRateCalibration.current * (estimatedDuration / actual)
                  browserRateCalibration.current = Math.min(2.5, Math.max(0.5, 0.6 * browserRateCalibration.current + 0.4 * observed))
                }
                resolve()
              }
              
              utterance.onerror = (event) => {
                currentResolveRef.current = null
                reject(new Error(`Browser TTS Error: ${event.error}`))
              }

              // Many browsers populate voices asynchronously. If not ready, wait for `voiceschanged`
              // (no timeouts) and fall back to speaking on the next frame.
              let didSpeak = false
              const onVoicesChanged = () => {
                if (didSpeak) return
                didSpeak = true
                speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged)
                const voices = speechSynthesis.getVoices()
                if (voices.length > 0) selectBrowserVoice(voices)
                speechSynthesis.speak(utterance)
              }

              const initialVoices = speechSynthesis.getVoices()
              if (initialVoices.length > 0) {
                didSpeak = true
                selectBrowserVoice(initialVoices)

                speechSynthesis.speak(utterance)
              } else {
                speechSynthesis.addEventListener('voiceschanged', onVoicesChanged)
                speechSynthesis.getVoices() // kick voice loading in some browsers
                requestAnimationFrame(() => {
                  if (didSpeak) return
                  const voices = speechSynthesis.getVoices()
                  if (voices.length > 0) {
                    onVoicesChanged()
                  } else {
                    // Fall back to default voice if voices never populate.
                    didSpeak = true
                    speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged)

                    speechSynthesis.speak(utterance)
                  }
                })
              }
            })
          } else if (nextMessage.audio && nextMessage.audio.byteLength > 0) {
            await playAudioBuffer(nextMessage.audio)
          }
        } catch (playbackError) {
          logger.error(`Error playing message ${nextMessage.id}:`, playbackError)
        }

        onUtteranceEnd?.()

        // Mark as completed and remove from queue
        nextMessage.status = 'completed'
        messageQueue.current = messageQueue.current.filter((msg) => msg.id !== nextMessage.id)
        nextExpectedId.current = Math.max(nextExpectedId.current, nextMessage.id + 1) // if we have skipped ahead by stopping speech, we need to set the next expected id to the next message id
      }

      // Call onSpeechEnd only when queue is empty
      if (onSpeechEnd && messageQueue.current.length === 0) {
        onSpeechEnd()
      }
    } catch (error) {
      logger.error('Queue processing error:', error)
      if (onSpeechEnd) {
        onSpeechEnd()
      }
    } finally {
      isProcessing.current = false
    }
  }, [onSpeechEnd, onUtteranceEnd, config.speed, config.mode, config.pitch, config.volume, config.voice, onSpeechStart, generateAudioForMessage, playAudioBuffer, playDecoded])

  // Add message to queue and assign ID
  const speak = useCallback(
    async (text: string) => {

      if (!text.trim()) return null

      const messageId = globalId++
      const cleanedText = cleanText(text)

      if (!cleanedText.trim()) return messageId

      const queuedMessage: QueuedMessage = {
        id: messageId,
        text: cleanedText,
        status: 'pending'
      }

      messageQueue.current.push(queuedMessage)
      logger.log(`Queued message ${messageId}:`, cleanedText.substring(0, 50))

      // For local and cloud modes, start generating all pending messages immediately
      if (config.mode === 'local' || config.mode === 'cloud') {
        const allPendingMessages = messageQueue.current.filter((msg) => msg.status === 'pending')
        allPendingMessages.forEach((message) => {
          generateAudioForMessage(message) // Don't await - let them generate in parallel
        })
      }

      // Start processing if not already running
      if (!isProcessing.current) {
        processQueue()
      }

      return messageId
    },
    [processQueue, config.mode, generateAudioForMessage]
  )

  const stopSpeaking = useCallback(() => {
    // Stop browser speech synthesis
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel()
    }

    // Stop a playing cloud clip and its face frames
    try {
      currentSourceRef.current?.stop()
    } catch {
      // already stopped
    }
    currentSourceRef.current = null
    stopSpeechFace()

    // Resolve the current Promise to unblock processQueue
    if (currentResolveRef.current) {
      currentResolveRef.current()
      currentResolveRef.current = null
    }

    // Terminate worker if it exists
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }


    const lastMessageId = messageQueue.current.length > 0 ? messageQueue.current[messageQueue.current.length - 1].id + 1 : globalId - 1
    // Clear the queue
    messageQueue.current = []
    nextExpectedId.current = lastMessageId
    isProcessing.current = false

    // Call speech end callback when speech is stopped
    if (onSpeechEnd) {
      onSpeechEnd()
    }
  }, [onSpeechEnd])

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
      }
    }
  }, [])

  const getQueueStatus = useCallback(() => {
    return {
      queueLength: messageQueue.current.length,
      isProcessing: isProcessing.current,
      nextExpectedId: nextExpectedId.current,
      messages: messageQueue.current.map((msg) => ({
        id: msg.id,
        status: msg.status,
        text: msg.text.substring(0, 50) + (msg.text.length > 50 ? '...' : '')
      }))
    }
  }, [])


  const state = useMemo(() => ({
    isSpeaking: isProcessing.current,
    audioQueue: messageQueue.current.length
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [isProcessing.current, messageQueue.current.length])

  const actions = useMemo(
    () => ({
      speak,
      stopSpeaking,
      playAudioBuffer,
      getQueueStatus
    }),
    [speak, stopSpeaking, playAudioBuffer, getQueueStatus]
  )

  return useMemo(
    () => ({
      state,
      actions
    }),
    [state, actions]
  )
}
