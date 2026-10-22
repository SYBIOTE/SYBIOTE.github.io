import type { VRM } from '@pixiv/three-vrm'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useAnimationService } from './animation/useAnimationService'
import { useConversationService } from './conversation/useConversationService'
import type { ConversationId, ConversationMessage } from './conversation/conversationType'
import type { EmotionType, PerformanceData } from './emote/emoteTypes'
import { useEmoteService } from './emote/useEmoteService'
import { useLLMService } from './llm/llmService'
import type { LLMPerformRequest, LLMResponse, LLMStatusUpdate } from './llm/llmTypes'
import { createReactionFromMessage } from '../integration/reactionIntegration'
import { parseActions, runAvatarAction } from './actions/avatarActions'
import portfolioData from '../content/data/portfolio.json'
import { useSTTService } from './stt/sttService'
import { useVADService } from './vad/vadService'
import { endOfTurnProbability, preloadSmartTurn } from './smartTurn/smartTurn'
import { TurnGate } from './smartTurn/turnGate'
import { useTTSService } from './tts/ttsService'
import { useVisemeService } from './visemes/useVisemeService'
import type { GazeOptions } from './emote/configs/emoteConfig'
import { defaultVadConfig, type VADConfig, type VADResult } from './vad/vadConfig'
import { defaultTTSConfig, type TTSConfig, type WhisperData } from './tts/ttsConfig'
import { defaultSTTConfig, type STTConfig } from './stt/sttConfig'
import { defaultLLMConfig, type LLMConfig } from './llm/config/llmConfig'
import { shouldTriggerBargeIn } from '../integration/emotionIntegration'
import { BargeIn } from './bargeIn'
import { logger } from '../utils/logger'
import type { AnimationAction, AnimationMixer, Camera, Object3D } from 'three'
import type { AnimationClip, AnimationPerformanceData, AnimationState } from './animation/animationTypes'

const PROJECT_IDS: ReadonlySet<string> = new Set(portfolioData.items.map((item) => item.id))

// STT service result interface (defined locally in sttService.ts)
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

interface MorphTargetObject {
  morphTargetInfluences: number[]
}

// Configuration interfaces
export interface AgentConfig {
  // Audio/VAD configuration
  vad?: Partial<VADConfig>
  // TTS configuration
  tts?:  Partial<TTSConfig>
  // STT configuration
  stt?:  Partial<STTConfig>
  // LLM configuration
  llm?: Partial<LLMConfig>
  // App behavior configuration
  autoSubmitEnabled?: boolean
  bargeInEnabled?: boolean
}

// Callback interfaces
export interface AgentCallbacks {
  // VAD callbacks
  onVADResult?: (result: VADResult) => void
  onSpeechStart?: () => void
  onSpeechEnd?: (audio: ArrayBuffer) => void

  // STT callbacks
  onSTTResult?: (result: STTPerformResult) => void
  onInterimTranscript?: (text: string) => void

  // LLM callbacks
  onLLMStatus?: (status: LLMStatusUpdate) => void
  onLLMResponse?: (response: LLMResponse) => void

  // TTS callbacks
  onTTSSpeechStart?: (text: string, whisperData: WhisperData) => void
  onTTSSpeechEnd?: () => void

  // Conversation callbacks
  onMessageAdded?: (message: ConversationMessage) => void
  onMessageUpdated?: (messages: ConversationMessage[]) => void

  // General callbacks
  onError?: (error: Error) => void
}

// Return type for the hook
export interface AgentService {
  // State
  state: {
    // VAD state
    vadIsListening: boolean
    vadIsDetecting: boolean

    // STT state
    sttIsListening: boolean
    sttAllowed: boolean
    sttDesired: boolean
    currentTranscript: string

    // Subtitle state
    currentSubtitle: string

    // LLM state
    llmReady: boolean
    llmLoading: boolean
    llmThinking: boolean
    llmMessages: Array<{ role: string; content: string }>

    // TTS state
    ttsIsSpeaking: boolean
    ttsAudioQueue: number

    // Conversation state
    messages: ConversationId[]

     // Animation state
    currentAnimation: AnimationClip | null
    // Emote state
    currentEmotion: EmotionType
  }

  // Actions
  actions: {
    // VAD actions
    startVADListening: () => void
    stopVADListening: () => void
    initializeVAD: () => void

    // STT actions
    startSTTListening: () => void
    stopSTTListening: () => void
    setSTTDesired: (desired: boolean) => void

    // LLM actions
    loadLLM: () => void
    processUserInput: (request: LLMPerformRequest) => void
    clearLLMHistory: () => void

    // TTS actions
    speak: (text: string) => Promise<number | null>
    stopSpeaking: () => void
    playAudioBuffer: (audioBuffer: ArrayBuffer) => Promise<void>
    getTTSQueueStatus: () => {
      queueLength: number
      isProcessing: boolean
      nextExpectedId: number
      messages: Array<{ id: number; status: string; text: string }>
    }

    // Chat actions
    addMessage: (text: string, isUser: boolean) => void
    streamMessage: (fragment: string, finished: boolean) => void
    clearAllMessages: () => void
    getMessagebyId: (id: ConversationId) => ConversationMessage

    // Convenience actions  
    submitMessage: (message: string) => void
    toggleMicrophone: (isRecording: boolean) => void
    triggerBargein: () => void

    // Viseme actions (for external avatar control)
    setupVisemesForVRM: (vrm: VRM) => void
    setupVisemesForMorphTargets: (morphs: MorphTargetObject[], dictionary: Record<string, number[]>) => void
    updateVisemes: (_delta: number) => void
    applyVisemesToRig: (_delta: number, amplify?: number) => void
    resetVisemes: () => void

    // Emote actions (for external avatar control)
    setupAvatarReferences: (references: { bones?: Record<string, unknown>; node?: Object3D; camera: Camera }) => void
    setupEmotesForVRM: (vrm: VRM) => void
    setupEmotesForMorphTargets: (morphs: MorphTargetObject[], dictionary: Record<string, number[]>) => void
    setEmotion: (emotion: EmotionType) => void
    performEmotionAction: (performanceData: PerformanceData) => void
    triggerGaze: (options?: GazeOptions) => void
    updateEmotes: (_delta: number) => void
    applyEmotesToVRM: (vrm: VRM) => void
    applyEmotesToMorphTargets: (morphs: MorphTargetObject[], dictionary: Record<string, number[]>) => void
    resetEmotes: () => void
    onEmoteBargein: () => void

       // Animation actions (for external avatar control)
    setPersonality: (personality: string) => void
    setupAnimations: (actions: Record<string, AnimationAction>, mixer: AnimationMixer, avatar?: Object3D, animation?: AnimationClip) => void
    setCycling: (cycling: boolean) => void  
    performAnimationAction: (performanceData: AnimationPerformanceData) => void
    updateAnimation: (_delta: number) => void
    getCurrentAnimationInfo: (state: AnimationState) => void
    getAvailableAnimationClips: () => AnimationClip[],
    onAnimationBargein: () => void,
  }

  // Service instances (for advanced usage)
  services: {
    conversation: ReturnType<typeof useConversationService>
    vad: ReturnType<typeof useVADService>
    stt: ReturnType<typeof useSTTService>
    llm: ReturnType<typeof useLLMService>
    tts: ReturnType<typeof useTTSService>
    visemes: ReturnType<typeof useVisemeService>
    emotes: ReturnType<typeof useEmoteService>
    animations: ReturnType<typeof useAnimationService>
  }
}

// Default app behavior configuration
const defaultAppConfig = {
  autoSubmitEnabled: true,
  bargeInEnabled: true
}

/**
 * Unified agent hook that combines all conversational AI services
 *
 * This hook integrates VAD, STT, LLM, TTS, Visemes, and Emotes services
 * with automatic service coordination and state management.
 *
 * @param config - Configuration object for all services
 * @param callbacks - Callback functions for service events
 * @returns AgentService object with state, actions, and service instances
 */





export const useAgent = (config: AgentConfig = {}, callbacks: AgentCallbacks = {}): AgentService => {
  // Merge configurations with defaults
  const vadConfig = { ...defaultVadConfig, ...config.vad }
  const ttsConfig = { ...defaultTTSConfig, ...config.tts }
  const sttConfig = { ...defaultSTTConfig, ...config.stt }
  const llmConfig = { ...defaultLLMConfig, ...config.llm }
  const appConfig = {
    autoSubmitEnabled: config.autoSubmitEnabled ?? defaultAppConfig.autoSubmitEnabled,
    bargeInEnabled: config.bargeInEnabled ?? defaultAppConfig.bargeInEnabled
  }

  // Internal state
  const [currentInterimTranscript, setCurrentInterimTranscript] = useState('')
  const [currentSubtitleText, setCurrentSubtitleText] = useState('')
  const interruptCounterRef = useRef(performance.now())
  // The reply being spoken: which turn it answers, and what's been said of it so far
  const replyInterruptRef = useRef(0)
  const spokenRef = useRef('')
  // Whether the reply is still streaming in (read from callbacks, so through a ref)
  const llmThinkingRef = useRef(false)

  // Initialize conversation service
  const conversation = useConversationService()

  // Initialize viseme and emote services
  const visemes = useVisemeService()
  const emotes = useEmoteService()
  const animations = useAnimationService()
  // Initialize LLM service
  const llm = useLLMService({
    config: llmConfig,
    onStatus: (status: LLMStatusUpdate) => {
      logger.log('LLM status:', status)
      callbacks.onLLMStatus?.(status)
    },
    onResponse: (response: LLMResponse) => {
      // Strip inline action tags before speaking/displaying, then run the actions
      const { text: breath, actions: avatarActions } = parseActions(response.breath, PROJECT_IDS)
      if (breath.trim()) {
        tts.actions.speak(breath)

        // Analyze the response for emotional content and trigger appropriate emote
        const message = {
          id: Date.now().toString(),
          text: breath,
          isUser: false,
          timestamp: Date.now()
        }

        const { performance, animation } = createReactionFromMessage(message, conversation.state.messages.length)

        // Trigger emote performance based on the response
        emotes.actions.performAction(performance)
        if (animation) animations.actions.performAction(animation)
      }

      // After the automatic reaction, so an explicit [[emote:...]] wins
      avatarActions.forEach((action) =>
        runAvatarAction(action, {
          performEmotion: (emotion) => emotes.actions.performAction({ emotion, relaxTime: 3000 })
        })
      )

      conversation.actions.streamMessage(breath, response.final)
      callbacks.onLLMResponse?.(response)
    }
  })

  llmThinkingRef.current = llm.state.thinking

  // Initialize TTS service
  const tts = useTTSService({
    config: ttsConfig,
    onSpeechStart: (text: string, whisperData: WhisperData) => {
      spokenRef.current = spokenRef.current ? `${spokenRef.current} ${text}` : text
      visemes.actions.generateSequence(whisperData)
      callbacks.onTTSSpeechStart?.(text, whisperData)
      setCurrentSubtitleText(prev => {
        // Accumulate chunks as they play
        return prev ? prev + ' ' + text : text
      })
    },
    onUtteranceEnd: () => {
      // The audio is done even if the estimated lipsync isn't: close the mouth
      visemes.actions.stop()
    },
    onSpeechEnd: () => {
      emotes.actions.reset()
      callbacks.onTTSSpeechEnd?.()
      setCurrentSubtitleText('')
    }
  })

  // End-of-turn detection: hold spoken transcripts until Smart Turn says the visitor has finished
  const commitTurnRef = useRef<(text: string) => void>(() => undefined)
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks
  const turnGateRef = useRef<TurnGate | null>(null)
  const bargeInRef = useRef<BargeIn | null>(null)
  if (!turnGateRef.current) {
    turnGateRef.current = new TurnGate({
      classify: endOfTurnProbability,
      onCommit: (text) => commitTurnRef.current(text),
      onPending: (text) => setCurrentInterimTranscript(text)
    })
  }
  const turnGate = turnGateRef.current
  const withHeld = (text: string) => [turnGate.pendingText, text].filter(Boolean).join(' ')

  // Initialize VAD service (MicVAD keeps the callbacks it was created with, so go through refs)
  const vad = useVADService({
    config: vadConfig,
    onVADResult: (result) => {
      callbacks.onVADResult?.(result)
    },
    onSpeechStart: useCallback(() => {
      turnGate.speechStart()
      bargeInRef.current?.speechStart()
      callbacksRef.current.onSpeechStart?.()
    }, [turnGate]),
    onSpeechEnd: useCallback(
      (audio: ArrayBuffer) => {
        bargeInRef.current?.speechEnd()
        void turnGate.speechEnd(new Float32Array(audio))
        callbacksRef.current.onSpeechEnd?.(audio)
      },
      [turnGate]
    )
  })

  useEffect(() => {
    if (vad.state.isListening) void preloadSmartTurn()
    else turnGate.reset()
  }, [vad.state.isListening, turnGate])

  // Initialize STT service
  const stt = useSTTService({
    config: sttConfig,
    onPerform: (result) => {
      if (result.final) {
        const interrupt = Date.now()
        // Handle barge-in if detected
        if (shouldTriggerBargeIn({ text: result.text, isUser: true, id: '', timestamp: interrupt })) {
          triggerBargein()
          logger.log('STT: Stop command detected - barge-in activated')
        }

        bargeInRef.current?.transcript(result.text, true)
        // Sent once the visitor has finished their turn (see commitTurnRef)
        turnGate.transcript(result.text)
      } else {
        bargeInRef.current?.transcript(result.text, false)
        setCurrentInterimTranscript(withHeld(result.text))
      }

      logger.log('STT: result:', result)
      callbacks.onSTTResult?.(result)
    },
    onInterimTranscript: (text) => {
      bargeInRef.current?.transcript(text, false)
      setCurrentInterimTranscript(withHeld(text))
      callbacks.onInterimTranscript?.(text)
    }
  })

  commitTurnRef.current = (text: string) => {
    // Auto-submit or set interim transcript
    if (appConfig.autoSubmitEnabled) {
      conversation.actions.addMessage(text, true)
      setCurrentInterimTranscript('')
    } else {
      setCurrentInterimTranscript(text)
    }

    startReply(text)
  }

  // Service coordination effects
  useEffect(() => { 
    stt.actions.setDesired(vad.state.isDetecting)
  }, [vad.state.isDetecting, stt.actions])

  useEffect(() => {
    // Always allow STT if barge-in is enabled, otherwise only allow if not speaking
    if (appConfig.bargeInEnabled) {
      stt.actions.setAllowed(true)
    } else {
      stt.actions.setAllowed(!tts.state.isSpeaking)
    }
  }, [appConfig.bargeInEnabled, tts.state.isSpeaking, stt.actions])

  // Convenience action implementations
  const submitMessage = useCallback(
    (message: string) => {
      if (message.trim()) {
        const userMessage = message.trim()

        conversation.actions.addMessage(userMessage, true)
        startReply(userMessage)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conversation.actions, llm.actions, tts.actions, appConfig.bargeInEnabled]
  )

  const toggleMicrophone = useCallback(
    (isRecording: boolean) => {
      stt.actions.setDesired(isRecording)
      setCurrentInterimTranscript('')
    },
    [stt.actions]
  )

  const triggerBargein = useCallback(() => {
    const interrupt = Date.now()
    interruptCounterRef.current = interrupt

    // Stop the reply mid-stream too, and remember only what had been said of it
    const replying = tts.actions.isSpeakingNow() || llmThinkingRef.current
    llm.actions.supersede(interrupt)
    if (replying && replyInterruptRef.current) llm.actions.markCutOff(replyInterruptRef.current, spokenRef.current)
    replyInterruptRef.current = 0
    if (tts.actions.isSpeakingNow()) {
      tts.actions.stopSpeaking()
    }

    emotes.actions.onBargeIn()
    animations.actions.onBargeIn()
  }, [tts.actions, llm.actions, emotes, animations.actions])

  // A new turn from the visitor (spoken or typed): whatever Rahul was still saying is cut off there
  const startReply = (text: string) => {
    if (appConfig.bargeInEnabled && (tts.actions.isSpeakingNow() || llmThinkingRef.current)) triggerBargein()
    const interrupt = Date.now()
    interruptCounterRef.current = interrupt
    replyInterruptRef.current = interrupt
    spokenRef.current = ''
    llm.actions.processUserInput({
      text,
      human: true,
      final: true,
      bargein: appConfig.bargeInEnabled,
      interrupt
    })
  }

  // Talking over Rahul: his voice dips, and he stops once they've said something real (see bargeIn.ts)
  const bargeInActionsRef = useRef({ triggerBargein, tts: tts.actions })
  bargeInActionsRef.current = { triggerBargein, tts: tts.actions }
  if (!bargeInRef.current && appConfig.bargeInEnabled) {
    bargeInRef.current = new BargeIn({
      isSpeaking: () => bargeInActionsRef.current.tts.isSpeakingNow(),
      duck: (amount) => bargeInActionsRef.current.tts.duck(amount),
      interrupt: () => bargeInActionsRef.current.triggerBargein(),
      spokenText: () => spokenRef.current
    })
  }

  // Memoize the services object to prevent unnecessary re-renders
  const services = useMemo(
    () => ({
      conversation,
      vad,
      stt,
      llm,
      tts,
      visemes,
      emotes,
      animations
    }),
    [conversation, vad, stt, llm, tts, visemes, emotes, animations]
  )

  // Memoize the actions object to prevent unnecessary re-renders
  const actions = useMemo(
    () => ({
      // VAD actions
      startVADListening: vad.actions.startListening,
      stopVADListening: vad.actions.stopListening,
      initializeVAD: vad.actions.initializeVAD,

      // STT actions
      startSTTListening: stt.actions.startListening,
      stopSTTListening: stt.actions.stopListening,
      setSTTDesired: stt.actions.setDesired,

      // LLM actions
      loadLLM: llm.actions.load,
      processUserInput: llm.actions.processUserInput,
      clearLLMHistory: llm.actions.clearHistory,

      // TTS actions
      speak: tts.actions.speak,
      stopSpeaking: tts.actions.stopSpeaking,
      playAudioBuffer: tts.actions.playAudioBuffer,
      getTTSQueueStatus: tts.actions.getQueueStatus,

      // Chat actions
      addMessage: conversation.actions.addMessage,
      streamMessage: conversation.actions.streamMessage,
      clearAllMessages: conversation.actions.clearAllMessages,
      getMessagebyId: conversation.actions.getMessagebyId,
      // Convenience actions
      submitMessage,
      toggleMicrophone,
      triggerBargein,

      // Viseme actions
      setupVisemesForVRM: visemes.actions.setupForVRM,
      setupVisemesForMorphTargets: visemes.actions.setupForMorphTargets,
      updateVisemes: visemes.actions.update,
      applyVisemesToRig: visemes.actions.applyToRig,
      resetVisemes: visemes.actions.reset,

      // Emote actions
      setupAvatarReferences: emotes.actions.setAvatarReferences,
      setupEmotesForVRM: emotes.actions.setupForVRM,
      setupEmotesForMorphTargets: emotes.actions.setupForMorphTargets,
      setEmotion: emotes.actions.setEmotion,
      performEmotionAction: emotes.actions.performAction,
      triggerGaze: emotes.actions.triggerGaze,
      updateEmotes: emotes.actions.update,
      applyEmotesToVRM: emotes.actions.applyToVRM,
      applyEmotesToMorphTargets: emotes.actions.applyToMorphTargets,
      resetEmotes: emotes.actions.reset,
      onEmoteBargein: emotes.actions.onBargeIn,

      // Animation actions
      setPersonality: animations.actions.setPersonality,
      setupAnimations: animations.actions.setup,
      setCycling: animations.actions.setCycling,
      performAnimationAction: animations.actions.performAction,
      updateAnimation: animations.actions.update,
      getCurrentAnimationInfo: animations.actions.getCurrentInfo,
      getAvailableAnimationClips: animations.actions.getAvailableClips,
      onAnimationBargein: animations.actions.onBargeIn,
    }),
    [vad.actions.startListening, vad.actions.stopListening, vad.actions.initializeVAD, stt.actions.startListening, stt.actions.stopListening, stt.actions.setDesired, llm.actions.load, llm.actions.processUserInput, llm.actions.clearHistory, tts.actions.speak, tts.actions.stopSpeaking, tts.actions.playAudioBuffer, tts.actions.getQueueStatus, conversation.actions.addMessage, conversation.actions.streamMessage, conversation.actions.clearAllMessages, conversation.actions.getMessagebyId, submitMessage, toggleMicrophone, triggerBargein, visemes.actions.setupForVRM, visemes.actions.setupForMorphTargets, visemes.actions.update, visemes.actions.applyToRig, visemes.actions.reset, emotes.actions.setAvatarReferences, emotes.actions.setupForVRM, emotes.actions.setupForMorphTargets, emotes.actions.setEmotion, emotes.actions.performAction, emotes.actions.triggerGaze, emotes.actions.update, emotes.actions.applyToVRM, emotes.actions.applyToMorphTargets, emotes.actions.reset, emotes.actions.onBargeIn, animations.actions.setup, animations.actions.setCycling, animations.actions.performAction, animations.actions.update, animations.actions.getCurrentInfo, animations.actions.getAvailableClips, animations.actions.onBargeIn, animations.actions.setPersonality  ]
  )

  const state = useMemo(
    () => ({
      vadIsListening: vad.state.isListening,
      vadIsDetecting: vad.state.isDetecting,
      sttIsListening: stt.state.isListening,
      sttAllowed: stt.state.allowed,
      sttDesired: stt.state.desired,
      currentTranscript: currentInterimTranscript,
      currentSubtitle: currentSubtitleText,
      llmReady: llm.state.ready,
      llmLoading: llm.state.loading,
      llmThinking: llm.state.thinking,
      llmMessages: llm.state.messages,
      ttsIsSpeaking: tts.state.isSpeaking,
      ttsAudioQueue: tts.state.audioQueue,
      messages: conversation.state.messages,
      currentAnimation: animations.state.currentClip,
      currentEmotion: emotes.state.emote.currentEmotion,
      currentPersonality: animations.state.currentPersonality,
    }),
    [vad.state.isListening, vad.state.isDetecting, stt.state.isListening, stt.state.allowed, stt.state.desired, currentInterimTranscript, currentSubtitleText, llm.state.ready, llm.state.loading, llm.state.thinking, llm.state.messages, tts.state.isSpeaking, tts.state.audioQueue, conversation.state.messages, animations.state.currentClip, emotes.state.emote.currentEmotion, animations.state.currentPersonality]
  )

  // Return the unified service interface
  return useMemo(
    () => ({
      state,
      actions,
      services
    }),
    [state, actions, services]
  )
}
