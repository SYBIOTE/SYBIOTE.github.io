/**
 * "On a call with Rahul": the site laid out like a Google Meet call.
 *
 * - Waiting room: your (camera-off) preview, "Ready to join?", Rahul already in the call
 * - In call: Rahul's tile on stage, your self-view tile, captions band, bottom bar with
 *   time | call name, round controls, and panel buttons (details, people, chat)
 * - Presenting: shared content takes the stage, the participant tiles move to a side strip
 * - "You left the call" screen
 *
 * Rahul's head tile never changes DOM parent (the splat renderer is bound to its container);
 * only its grid area changes between modes. Joining is a real click, which also lets the
 * browser play the greeting's audio.
 */

import { useSimpleStore } from '@hexafield/simple-store/react'
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { AppConfigState } from '../app/appConfig'
import { sceneConfig } from '../app/sceneTypes'
import { ChatPanel } from '../components/chat/ChatPanel'
import { useAgentActions, useAgentState } from '../components/scene/avatar/AgentContext'
import { Viewport3D } from '../components/scene/Viewport3D'
import i18n from '../i18n/i18n'
import { buildGreeting, markVisit } from './greeting'
import { preloadIfVoiceConfigured } from '../services/audio2expression/audio2expression'
import { preloadSmartTurn } from '../services/smartTurn/smartTurn'
import { prefetchCloudSpeech } from '../services/tts/ttsService'
import { preloadVAD } from '../services/vad/vadService'
import { AvatarUIState } from '../services/actions/avatarActions'
import './call.css'
import {
  CameraIcon,
  CameraOffIcon,
  CaptionsIcon,
  ChatIcon,
  CloseIcon,
  HandIcon,
  InfoIcon,
  MicIcon,
  MicOffIcon,
  MoreIcon,
  PeopleIcon,
  PhoneDownIcon,
  SendIcon,
  ScreenIcon
} from './callIcons'
import { playChime, primeAudio } from './chime'
import { ContactPage } from './postcall/ContactPage'
import { ResumePage } from './postcall/ResumePage'
import { SharePanel } from './SharePanel'
import { isShareTab } from './shareTabs'

type Phase = 'lobby' | 'joining' | 'call' | 'ended'
type Panel = 'chat' | 'people' | 'info' | null

const PROFILE_IMAGE = '/assets/img/profile-img.jpg'
const NAME_KEY = 'call.guestName'
const ADMIT_DELAY_MS = 1400
const RETURN_AFTER_S = 30
// If the head isn't ready by then, greet anyway with Rahul's camera off
const GREET_FALLBACK_MS = 3000

const readSavedName = () => {
  try {
    return localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}
const LANGUAGES = [
  ['en', 'English'],
  ['de', 'Deutsch'],
  ['es', 'Español'],
  ['fr', 'Français'],
  ['hi', 'हिन्दी'],
  ['ja', '日本語']
] as const

/** Wall-clock time like the corner of a Meet call ("10:42 AM"). */
const useClock = () => {
  const format = () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const [time, setTime] = useState(format)
  useEffect(() => {
    const id = setInterval(() => setTime(format()), 15000)
    return () => clearInterval(id)
  }, [])
  return time
}

/** Optional self-view webcam. Stays on the visitor's device: it is only drawn locally. */
const useSelfCamera = () => {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const toggle = useCallback(async () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
      return
    }
    try {
      setStream(await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false }))
    } catch (error) {
      logger.warn('Camera unavailable:', error)
    }
  }, [stream])
  useEffect(() => () => stream?.getTracks().forEach((track) => track.stop()), [stream])
  return { stream, toggle }
}

const CallAppComponent = () => {
  const { t } = useTranslation()
  const state = useAgentState()
  const actions = useAgentActions()
  const [appConfig, setAppConfig] = useSimpleStore(AppConfigState)
  const [{ openSectionId }, setUI] = useSimpleStore(AvatarUIState)

  const [phase, setPhase] = useState<Phase>('lobby')
  const [panel, setPanel] = useState<Panel>(null)
  const [captionsOn, setCaptionsOn] = useState(true)
  const [handRaised, setHandRaised] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [guestName, setGuestName] = useState(readSavedName)
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([])
  // Waiting-room mic choice: it only turns on once you're in, so nothing listens before joining
  const [micPref, setMicPref] = useState(false)
  const [returnIn, setReturnIn] = useState(RETURN_AFTER_S)
  // Rahul's "camera": off until the 3D head is actually rendering; stays off if it fails
  const [rahulCameraOn, setRahulCameraOn] = useState(false)
  const handleAvatarReady = useCallback(() => setRahulCameraOn(true), [])
  const handleAvatarError = useCallback(() => setRahulCameraOn(false), [])
  // After leaving: the summary screen, or the standalone resume / contact pages (no rejoin needed)
  const [endedView, setEndedView] = useState<'summary' | 'resume' | 'contact'>('summary')
  const admitTimer = useRef<number | undefined>(undefined)
  const time = useClock()
  const camera = useSelfCamera()

  const name = t('core.name')
  const presenting = phase === 'call' && isShareTab(openSectionId)
  const inWaitingRoom = phase === 'lobby' || phase === 'joining'
  const micOn = inWaitingRoom ? micPref : appConfig.microphone
  const myName = guestName.trim()
  const youLabel = myName || t('call.you', 'You')

  const chatMessages = useMemo(
    () => state.messages.map(actions.getMessagebyId).filter(Boolean),
    [state.messages, actions.getMessagebyId]
  )

  // Unread replies while the chat panel is closed
  const replyCount = chatMessages.filter((m) => !m.isUser).length
  const seenRef = useRef(0)
  if (panel === 'chat') seenRef.current = replyCount
  const unread = panel === 'chat' ? 0 : Math.max(0, replyCount - seenRef.current)

  const notify = useCallback((text: string) => {
    const id = Date.now()
    setToasts((list) => [...list, { id, text }])
    window.setTimeout(() => setToasts((list) => list.filter((toast) => toast.id !== id)), 4000)
  }, [])

  useEffect(() => () => window.clearTimeout(admitTimer.current), [])

  // "Returning to the waiting room in 30s", like a meeting's post-call screen
  useEffect(() => {
    if (phase !== 'ended' || endedView !== 'summary') return
    setReturnIn(RETURN_AFTER_S)
    const id = window.setInterval(() => setReturnIn((s) => s - 1), 1000)
    return () => window.clearInterval(id)
  }, [phase, endedView])
  useEffect(() => {
    if (phase === 'ended' && returnIn <= 0) setPhase('lobby')
  }, [phase, returnIn])

  // Warm up audio-driven lipsync while the visitor is in the waiting room
  useEffect(() => {
    void preloadIfVoiceConfigured()
  }, [])

  // Mic on in the waiting room: fetch voice detection and turn-taking now, not once they're talking
  useEffect(() => {
    if (!inWaitingRoom || !micPref) return
    void preloadVAD()
    void preloadSmartTurn()
  }, [inWaitingRoom, micPref])

  // Greet once in the call: right away if the head is ready, otherwise after a short wait
  const greetedRef = useRef(false)
  // Picked when they click join, so its audio can be fetched while they're being let in
  const greetingRef = useRef('')
  const greet = useCallback(() => {
    if (greetedRef.current) return
    greetedRef.current = true
    actions.performEmotionAction({ emotion: 'happy', relaxTime: 3000 })
    // Empty if the call was entered without join()
    actions.speak(greetingRef.current || buildGreeting({ name: myName, locale: i18n.language, returning: false }))
  }, [actions, myName])
  useEffect(() => {
    if (phase !== 'call' || greetedRef.current) return
    if (rahulCameraOn) return greet()
    const id = window.setTimeout(greet, GREET_FALLBACK_MS)
    return () => window.clearTimeout(id)
  }, [phase, rahulCameraOn, greet])

  // The avatar asked to open the chat
  useEffect(() => {
    if (openSectionId !== 'chat') return
    setPanel('chat')
    setUI((prev) => ({ ...prev, openSectionId: null }))
  }, [openSectionId, setUI])

  // React when the visitor starts talking
  const { triggerGaze, performEmotionAction } = actions
  useEffect(() => {
    if (!state.vadIsDetecting) return
    triggerGaze()
    performEmotionAction({ emotion: 'alert', relaxTime: 500 })
  }, [state.vadIsDetecting, triggerGaze, performEmotionAction])

  const setMic = useCallback(
    (on: boolean) => {
      setAppConfig((prev) => ({ ...prev, microphone: on }))
      actions.toggleMicrophone(on)
    },
    [setAppConfig, actions]
  )

  const join = useCallback(
    (browse = false) => {
      // Runs inside the click, so the browser allows the chime and greeting audio afterwards
      primeAudio()
      try {
        window.speechSynthesis?.resume()
      } catch {
        // speech synthesis unavailable
      }
      // markVisit: joined a call here before
      greetingRef.current = buildGreeting({ name: guestName.trim(), locale: i18n.language, returning: markVisit() })
      if (!greetedRef.current) prefetchCloudSpeech(greetingRef.current)
      try {
        localStorage.setItem(NAME_KEY, guestName.trim())
      } catch {
        // storage unavailable
      }

      // "Asking to be let in…", then admitted with a chime
      setPhase('joining')
      window.clearTimeout(admitTimer.current)
      admitTimer.current = window.setTimeout(() => {
        playChime('join')
        setPhase('call')
        if (micPref) setMic(true)
        // On wide screens chat starts open, since typing is how most visitors talk
        if (window.matchMedia('(min-width: 1024px)').matches) setPanel('chat')
        if (browse) setUI({ openSectionId: 'portfolio', focusProjectId: null })
        notify(t('call.admitted', '{{name}} let you in', { name }))
      }, ADMIT_DELAY_MS)
    },
    [guestName, micPref, setMic, setUI, notify, t, name]
  )

  const cancelJoin = () => {
    window.clearTimeout(admitTimer.current)
    setPhase('lobby')
  }

  const checkAudio = () => {
    primeAudio()
    actions.speak(
      myName
        ? t('call.testLineNamed', 'Hi {{guest}}, can you hear me okay?', { guest: myName })
        : t('call.testLine', 'Hi! Can you hear me okay?')
    )
  }

  const leave = useCallback(() => {
    actions.triggerBargein()
    playChime('leave')
    setMic(false)
    setPanel(null)
    setMenuOpen(false)
    setHandRaised(false)
    setUI({ openSectionId: null, focusProjectId: null })
    setEndedView('summary')
    setPhase('ended')
  }, [actions, setMic, setUI])

  const ask = useCallback(
    (question: string) => {
      if (state.ttsIsSpeaking) actions.triggerBargein()
      actions.submitMessage(question)
      setHandRaised(false)
    },
    [actions, state.ttsIsSpeaking]
  )

  const raiseHand = () => {
    if (handRaised) return setHandRaised(false)
    setHandRaised(true)
    setPanel('chat')
    actions.performEmotionAction({ emotion: 'happy', relaxTime: 1500 })
    actions.speak(t('call.handReply', 'Yes? Go ahead, what would you like to know?'))
  }

  const togglePanel = (next: Exclude<Panel, null>) => setPanel((p) => (p === next ? null : next))
  const togglePresent = () =>
    setUI(presenting ? { openSectionId: null, focusProjectId: null } : { openSectionId: 'portfolio', focusProjectId: null })
  const openSection = (id: 'contact' | 'resume') => {
    setPhase('call')
    setMenuOpen(false)
    setUI({ openSectionId: id, focusProjectId: null })
  }

  const caption = state.llmThinking ? t('call.thinking', 'Thinking…') : state.currentSubtitle
  const questions = [
    t('call.q.pitch', 'Give me the 60-second pitch'),
    t('call.q.now', 'What are you building right now?'),
    t('call.q.best', 'Show me your best project'),
    t('call.q.hire', 'Are you available for work?')
  ]

  // Stage areas per mode: Rahul's tile and the self tile are always direct children
  const stageMode = inWaitingRoom ? 'lobby' : presenting ? 'present' : 'solo'


  return (
    <div className={`meet${panel && phase === 'call' ? ' panel-open' : ''}`}>
      <main className={`meet-stage stage-${stageMode}`}>
        {/* Rahul */}
        <div className="tile-slot rahul-slot">
          <div className={`tile rahul-tile${state.ttsIsSpeaking ? ' speaking' : ''}${rahulCameraOn ? ' camera-on' : ''}`}>
            <div className="rahul-video">
              <Viewport3D
                sceneConfig={sceneConfig}
                greet={false}
                showSubtitle={false}
                showLoading={false}
                fallback="none"
                onAvatarReady={handleAvatarReady}
                onAvatarError={handleAvatarError}
                bare
              />
            </div>
            {/* Camera off: shown until the head renders, and for good if it can't */}
            <div className="rahul-camera-off" aria-hidden={rahulCameraOn}>
              <img src={PROFILE_IMAGE} alt="" />
            </div>
            <span className="tile-name">
              {name} <em>AI</em>
            </span>
            {state.ttsIsSpeaking && <SpeakingBars />}
          </div>
        </div>

        {/* You */}
        {phase !== 'ended' && (
          <div className="tile-slot self-slot">
            <SelfTile stream={camera.stream} micOn={micOn} handRaised={handRaised} label={youLabel} />
            {inWaitingRoom && (
              <div className="preview-controls">
                <RoundButton label={micOn ? t('call.mute', 'Turn off microphone') : t('call.unmute', 'Turn on microphone')} off={!micOn} onClick={() => setMicPref((on) => !on)}>
                  {micOn ? <MicIcon /> : <MicOffIcon />}
                </RoundButton>
                <RoundButton label={camera.stream ? t('call.cameraOff', 'Turn off camera') : t('call.cameraOn', 'Turn on camera')} off={!camera.stream} onClick={camera.toggle}>
                  {camera.stream ? <CameraIcon /> : <CameraOffIcon />}
                </RoundButton>
              </div>
            )}
          </div>
        )}

        {/* Waiting room */}
        {inWaitingRoom && (
          <>
            <div className="lobby-intro">
              <h1>{phase === 'joining' ? t('call.lobby.asking', 'Asking to be let in…') : t('call.lobby.title', 'Ready to join?')}</h1>
            </div>
            <p className="in-call">{t('call.lobby.inCall', '{{name}} is in this call', { name })}</p>
            <div className="lobby-actions">
              {phase === 'lobby' ? (
                <>
                  <label className="name-field" htmlFor="guest-name">
                    <span>{t('call.lobby.nameLabel', 'Your name')}</span>
                    <input
                      id="guest-name"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value.slice(0, 40))}
                      onKeyDown={(e) => e.key === 'Enter' && join()}
                      placeholder={t('call.lobby.namePlaceholder', 'What should Rahul call you?')}
                      autoComplete="given-name"
                    />
                  </label>
                  <button className="pill primary" onClick={() => join()}>
                    {t('call.askToJoin', 'Ask to join')}
                  </button>
                  <button className="pill ghost" onClick={() => join(true)}>
                    {t('call.browse', 'Just show me the work')}
                  </button>
                  <button className="link-btn" onClick={checkAudio}>
                    {t('call.lobby.checkAudio', 'Check your audio')}
                  </button>
                </>
              ) : (
                <>
                  <span className="join-spinner" aria-hidden="true" />
                  <p className="lobby-note">{t('call.lobby.waiting', 'You’ll join the call when Rahul lets you in')}</p>
                  <button className="pill ghost" onClick={cancelJoin}>
                    {t('call.cancel', 'Cancel')}
                  </button>
                </>
              )}
              <p className="lobby-note">
                {t('core.role')} · {t('call.lobby.note', 'Rahul joins as an AI avatar, so turn your sound on.')}
              </p>
            </div>
          </>
        )}

        {/* Join/leave notifications */}
        {toasts.length > 0 && (
          <div className="toasts" aria-live="polite">
            {toasts.map((toast) => (
              <div key={toast.id} className="toast">
                <img src={PROFILE_IMAGE} alt="" />
                {toast.text}
              </div>
            ))}
          </div>
        )}

        {/* Presentation */}
        {presenting && (
          <div className="present-slot">
            <SharePanel />
          </div>
        )}

        {/* Captions band */}
        {phase === 'call' && captionsOn && caption && (
          <div className="captions" aria-live="polite">
            <img src={PROFILE_IMAGE} alt="" />
            <div>
              <b>{name}</b>
              <span>{caption}</span>
            </div>
          </div>
        )}
      </main>

      {/* Side panels */}
      {phase === 'call' && panel && (
        <aside className="meet-panel" aria-label={t(`call.panel.${panel}`)}>
          <header>
            <h2>
              {panel === 'chat' && t('call.panel.chat', 'In-call messages')}
              {panel === 'people' && t('call.panel.people', 'People')}
              {panel === 'info' && t('call.panel.info', 'Call details')}
            </h2>
            <button className="icon-btn" onClick={() => setPanel(null)} aria-label={t('call.closePanel', 'Close')}>
              <CloseIcon />
            </button>
          </header>

          {panel === 'chat' && (
            <>
              <p className="panel-note">{t('call.chatNote', 'Answers come from Rahul’s AI avatar and can be wrong.')}</p>
              <div className="panel-body chat-body">
                {chatMessages.length ? (
                  <ChatPanel messages={chatMessages} />
                ) : (
                  <p className="panel-empty">{t('call.chatEmpty', 'Ask anything, or pick a question below.')}</p>
                )}
              </div>
              {(handRaised || chatMessages.length < 2) && (
                <div className="suggestions">
                  {questions.map((q) => (
                    <button key={q} className="chip" onClick={() => ask(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              )}
              <Composer onSend={ask} listening={micOn} transcript={state.currentTranscript} />
            </>
          )}

          {panel === 'people' && (
            <div className="panel-body">
              <p className="panel-section">{t('call.inCall', 'In call')} · 2</p>
              <div className="person">
                <img src={PROFILE_IMAGE} alt="" />
                <div>
                  <b>
                    {name} <em>AI</em>
                  </b>
                  <span>{t('call.host', 'Call host')}</span>
                </div>
                {state.ttsIsSpeaking ? <SpeakingBars inline /> : <MicIcon />}
              </div>
              <div className="person">
                <span className="avatar-letter">{youLabel.charAt(0).toUpperCase()}</span>
                <div>
                  <b>{myName ? `${myName} (${t('call.you', 'You')})` : t('call.you', 'You')}</b>
                  <span>{t('call.guest', 'Guest')}</span>
                </div>
                {micOn ? <MicIcon /> : <MicOffIcon />}
              </div>
              <p className="panel-note">{t('call.peopleNote', 'Rahul’s avatar answers from his real portfolio. Reach the real Rahul from Call details.')}</p>
            </div>
          )}

          {panel === 'info' && (
            <div className="panel-body details">
              <div className="person big">
                <img src={PROFILE_IMAGE} alt="" />
                <div>
                  <b>{name}</b>
                  <span>{t('core.role')}</span>
                </div>
              </div>
              <dl>
                <dt>{t('call.location', 'Location')}</dt>
                <dd>{t('core.city')}</dd>
                <dt>{t('call.freelance', 'Freelance')}</dt>
                <dd>{t('core.freelance')}</dd>
                <dt>{t('call.email', 'Email')}</dt>
                <dd className="selectable">{t('core.email')}</dd>
                <dt>{t('call.website', 'Website')}</dt>
                <dd>
                  <a href={t('core.website')} target="_blank" rel="noreferrer">
                    {t('core.website').replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </a>
                </dd>
                <dt>{t('call.linkedin', 'LinkedIn')}</dt>
                <dd>
                  <a href={t('core.linkedin')} target="_blank" rel="noreferrer">
                    {t('core.linkedin').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                  </a>
                </dd>
                <dt>{t('call.x', 'X')}</dt>
                <dd>
                  <a href={t('core.x')} target="_blank" rel="noreferrer">
                    {t('core.x').replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </a>
                </dd>
              </dl>
              <button className="pill ghost" onClick={() => openSection('contact')}>
                {t('call.ended.message', 'Leave Rahul a message')}
              </button>
            </div>
          )}
        </aside>
      )}

      {/* Bottom bar */}
      {phase === 'call' && (
        <footer className="meet-bar">
          <div className="bar-left">
            <span>{time}</span>
            <i aria-hidden="true">|</i>
            <span className="bar-title">{t('call.title', 'Call with {{name}}', { name })}</span>
          </div>

          <nav className="bar-center" aria-label={t('call.controls', 'Call controls')}>
            <RoundButton label={micOn ? t('call.mute', 'Turn off microphone') : t('call.unmute', 'Turn on microphone')} off={!micOn} onClick={() => setMic(!micOn)}>
              {micOn ? <MicIcon /> : <MicOffIcon />}
            </RoundButton>
            <RoundButton className="desk-only" label={camera.stream ? t('call.cameraOff', 'Turn off camera') : t('call.cameraOn', 'Turn on camera')} off={!camera.stream} onClick={camera.toggle}>
              {camera.stream ? <CameraIcon /> : <CameraOffIcon />}
            </RoundButton>
            <RoundButton className="desk-only" label={t('call.captions', 'Captions')} on={captionsOn} onClick={() => setCaptionsOn((c) => !c)}>
              <CaptionsIcon />
            </RoundButton>
            <RoundButton className="desk-only" label={t('call.raiseHand', 'Raise hand')} on={handRaised} onClick={raiseHand}>
              <HandIcon />
            </RoundButton>
            {/* Rahul is the one sharing: the visitor asks for his screen, or hides it */}
            <RoundButton
              label={presenting ? t('call.hideScreen', "Hide {{name}}'s screen", { name }) : t('call.askToShare', 'Ask {{name}} to share screen', { name })}
              on={presenting}
              onClick={togglePresent}
            >
              <ScreenIcon />
            </RoundButton>
            <RoundButton className="phone-only" label={t('call.panel.chat', 'In-call messages')} on={panel === 'chat'} badge={unread} onClick={() => togglePanel('chat')}>
              <ChatIcon />
            </RoundButton>
            <div className="menu-anchor">
              <RoundButton label={t('call.more', 'More options')} on={menuOpen} onClick={() => setMenuOpen((m) => !m)}>
                <MoreIcon />
              </RoundButton>
              {menuOpen && (
                <div className="menu" role="menu" onClick={() => setMenuOpen(false)}>
                  <button role="menuitem" className="phone-only" onClick={() => setCaptionsOn((c) => !c)}>
                    <CaptionsIcon /> {captionsOn ? t('call.captionsOff', 'Turn off captions') : t('call.captionsOn', 'Turn on captions')}
                  </button>
                  <button role="menuitem" className="phone-only" onClick={raiseHand}>
                    <HandIcon /> {handRaised ? t('call.lowerHand', 'Lower hand') : t('call.raiseHand', 'Raise hand')}
                  </button>
                  <button role="menuitem" className="phone-only" onClick={() => togglePanel('info')}>
                    <InfoIcon /> {t('call.panel.info', 'Call details')}
                  </button>
                  <button role="menuitem" className="phone-only" onClick={() => togglePanel('people')}>
                    <PeopleIcon /> {t('call.panel.people', 'People')}
                  </button>
                  <button role="menuitem" onClick={() => openSection('resume')}>
                    {t('call.ended.resume', 'View resume')}
                  </button>
                  <button role="menuitem" onClick={() => openSection('contact')}>
                    {t('call.ended.message', 'Leave Rahul a message')}
                  </button>
                  <div className="menu-langs" role="group" aria-label={t('call.language', 'Language')}>
                    {LANGUAGES.map(([code, label]) => (
                      <button key={code} role="menuitemradio" aria-checked={i18n.language.startsWith(code)} onClick={() => i18n.changeLanguage(code)}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <RoundButton className="end" label={t('call.leave', 'Leave call')} onClick={leave}>
              <PhoneDownIcon />
            </RoundButton>
          </nav>

          <div className="bar-right">
            <PanelButton label={t('call.panel.info', 'Call details')} on={panel === 'info'} onClick={() => togglePanel('info')}>
              <InfoIcon />
            </PanelButton>
            <PanelButton label={t('call.panel.people', 'People')} on={panel === 'people'} onClick={() => togglePanel('people')} count={2}>
              <PeopleIcon />
            </PanelButton>
            <PanelButton label={t('call.panel.chat', 'In-call messages')} on={panel === 'chat'} onClick={() => togglePanel('chat')} badge={unread}>
              <ChatIcon />
            </PanelButton>
          </div>
        </footer>
      )}

      {/* Left the call */}
      {phase === 'ended' && endedView === 'summary' && (
        <div className="ended">
          <p>{t('call.ended.returning', 'Returning to the waiting room in {{s}}s', { s: returnIn })}</p>
          <h2>{t('call.ended.title', 'You left the call')}</h2>
          <div className="ended-actions">
            <button className="pill ghost" onClick={() => join()}>
              {t('call.rejoin', 'Rejoin')}
            </button>
            <button className="pill ghost" onClick={() => setPhase('lobby')}>
              {t('call.ended.home', 'Return to waiting room')}
            </button>
          </div>
          <div className="ended-actions">
            <button className="link-btn" onClick={() => setEndedView('contact')}>
              {t('call.ended.message', 'Leave Rahul a message')}
            </button>
            <button className="link-btn" onClick={() => setEndedView('resume')}>
              {t('call.ended.resume', 'View resume')}
            </button>
          </div>
          <p className="selectable">{t('core.email')}</p>
        </div>
      )}
      {phase === 'ended' && endedView === 'resume' && (
        <ResumePage onBack={() => setEndedView('summary')} onContact={() => setEndedView('contact')} />
      )}
      {phase === 'ended' && endedView === 'contact' && (
        <ContactPage onBack={() => setEndedView('summary')} defaultName={myName} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

const SelfTile = ({ stream, micOn, handRaised, label }: { stream: MediaStream | null; micOn: boolean; handRaised: boolean; label: string }) => {
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream
  }, [stream])
  return (
    <div className="tile self-tile">
      {stream ? (
        <video ref={videoRef} autoPlay muted playsInline />
      ) : (
        <div className="camera-off">
          <span className="avatar-letter">{label.charAt(0).toUpperCase()}</span>
          <small>{t('call.cameraIsOff', 'Camera is off')}</small>
        </div>
      )}
      <span className="tile-name">{label}</span>
      {!micOn && (
        <span className="tile-badge" title={t('call.micOff', 'Microphone off')}>
          <MicOffIcon />
        </span>
      )}
      {handRaised && (
        <span className="tile-hand" title={t('call.handRaised', 'Hand raised')}>
          <HandIcon />
        </span>
      )}
    </div>
  )
}

const SpeakingBars = ({ inline = false }: { inline?: boolean }) => (
  <span className={`speaking-bars${inline ? ' inline' : ''}`} aria-hidden="true">
    <i />
    <i />
    <i />
  </span>
)

interface RoundButtonProps {
  label: string
  onClick: () => void
  children: ReactNode
  on?: boolean
  off?: boolean
  badge?: number
  className?: string
}

const RoundButton = ({ label, onClick, children, on, off, badge, className = '' }: RoundButtonProps) => (
  <span className={`rb-wrap ${className}`}>
    <button
      className={`rb${on ? ' on' : ''}${off ? ' off' : ''}`}
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={on !== undefined ? !!on : off !== undefined ? !off : undefined}
    >
      {children}
    </button>
    {!!badge && <span className="badge">{badge}</span>}
  </span>
)

const PanelButton = ({ label, onClick, children, on, badge, count }: Omit<RoundButtonProps, 'off' | 'className'> & { count?: number }) => (
  <span className="rb-wrap">
    <button className={`pb${on ? ' on' : ''}`} onClick={onClick} aria-label={label} title={label} aria-pressed={!!on}>
      {children}
    </button>
    {!!badge && <span className="badge">{badge}</span>}
    {!badge && count !== undefined && <span className="count">{count}</span>}
  </span>
)

interface ComposerProps {
  onSend: (text: string) => void
  listening: boolean
  transcript?: string
}

const Composer = ({ onSend, listening, transcript }: ComposerProps) => {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const message = text.trim()
    if (!message) return
    onSend(message)
    setText('')
  }
  const placeholder = listening
    ? transcript || t('call.composer.listening', 'Listening… speak or type')
    : t('call.composer.placeholder', 'Send a message')
  return (
    <form className="composer" onSubmit={submit}>
      <input
        id="call-composer"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        aria-label={t('call.composer.label', 'Message Rahul')}
        autoComplete="off"
        enterKeyHint="send"
      />
      <button className="send" type="submit" disabled={!text.trim()} aria-label={t('call.composer.send', 'Send')}>
        <SendIcon />
      </button>
    </form>
  )
}

export const CallApp = memo(CallAppComponent)
