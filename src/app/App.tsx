import type { XRStore } from '@react-three/xr'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Viewport3D } from '../components/scene/Viewport3D'
import { ChatOverlay } from '../components/chat/ChatOverlay'
import { LogoOverlay } from '../components/LogoOverlay'
import { useAgent } from '../services/useAgent'
import { useResponsiveLayout } from './layoutService'
import LLMLoadingBar from '../components/LLMLoadingBar'
import { sceneConfig } from './sceneTypes'
import { AppConfigState, type AppConfig } from './appConfig'
import { defaultVadConfig } from '../services/vad/vadConfig'
import { defaultTTSConfig } from '../services/tts/ttsConfig'
import { defaultSTTConfig } from '../services/stt/sttConfig'
import { defaultLLMConfig } from '../services/llm/config/llmConfig'
import { useSimpleStore } from '@hexafield/simple-store/react'
import SectionNavRail from '../components/sections/SectionNavRail'
import SettingsButton from '../components/settings/SettingsButton'
import { ControlOverlay } from '../components/control/ControlOverlay'
import { initializeViewport } from '../utils/viewportUtils'

export const config = {
  vad: defaultVadConfig,
  tts: defaultTTSConfig,
  stt: defaultSTTConfig,
  llm: defaultLLMConfig
}


export const App = () => {
  const { isMobile } = useResponsiveLayout() // Layout service for responsive behavior

  const xrStore = useRef<XRStore | null>(null)
  const [appState, setAppState] = useSimpleStore(AppConfigState)
  const setXRStore = useCallback((store: XRStore) => {
    xrStore.current = store
  }, [])

  // Initialize viewport utilities for mobile browser compatibility
  useEffect(() => {
    const cleanup = initializeViewport()
    return cleanup
  }, [])

  const agentConfig = useMemo(
    () => ({
      ...config,
      autoSubmitEnabled: appState.autoSubmitEnabled,
      bargeInEnabled: appState.bargeInEnabled,
    }),
    [ appState.autoSubmitEnabled, appState.bargeInEnabled]
  )

  const [statusState, setStatusState] = useState<{ color: 'ready' | 'loading' | 'error'; text: string }>({
    color: 'loading',
    text: 'Loading local model…'
  })

  const agent = useAgent(agentConfig, {
    onLLMStatus: (status) => {
      setStatusState({ color: status.color, text: status.text })
    }
  })


  const chatMessages = useMemo(
    () => agent.state.messages.map((id) => agent.services.conversation.actions.getMessagebyId(id)),
    [agent.state.messages, agent.services.conversation.actions]
  )

  const handleAppStateChange = useCallback((newAppState: AppConfig) => {
    setAppState(newAppState)
    agentConfig.vad.microphoneEnabled = newAppState.microphone
  }, [agentConfig, setAppState])

  useEffect(() => {
    agent.services.emotes.actions.triggerGaze()
    agent.services.emotes.actions.performAction({emotion: 'alert' , relaxTime: 500 })    
  },[agent.state.vadIsDetecting])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh', // Dynamic viewport height for mobile browsers
        width: '100vw',
        maxWidth: '100vw',
        overflow: 'hidden',
        background: 'radial-gradient(circle at top, #0F1113 0%, #1B1E20 100%)',
        color: '#FFFFFF',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        fontWeight: 400,
        lineHeight: 1.5,
        boxSizing: 'border-box',
        // Mobile-specific optimizations
        ...(isMobile && {
          height: '100dvh', // Use dynamic viewport height
          width: '100vw',
          maxHeight: '100dvh',
          maxWidth: '100vw',
          position: 'fixed',
          top: 0,
          left: 0
        }),
        // Desktop vertical layout
        ...(!isMobile && {
          justifyContent: 'center',
          alignItems: 'center'
        })
      }}
    >
      {/* Main 3D Viewport - Responsive */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          height: '100%',
          width: '100%',
          minHeight: 0, // Allow flex item to shrink
          maxHeight: '100dvh', // Use dynamic viewport height
          maxWidth: '100vw',
          overflow: 'hidden',
          boxSizing: 'border-box',
          // Mobile-specific viewport sizing
          ...(isMobile && {
            height: '100dvh', // Use dynamic viewport height
            width: '100vw',
            maxHeight: '100dvh',
            maxWidth: '100vw'
          }),
          // Desktop viewport sizing
          ...(!isMobile && {
            height: '100%',
            width: '100%'
          })
        }}
      >
        <Viewport3D
          agentState={agent.state}
          sceneConfig={sceneConfig}
          visemeService={agent.services.visemes}
          emoteService={agent.services.emotes}
          animationService={agent.services.animations}
          conversationService={agent.services.conversation}
          setXRStore={setXRStore}
        />

        <LogoOverlay />
        <SectionNavRail messages={chatMessages} />
        <ChatOverlay
          config={appState}
          agent={agent}
        />
        <ControlOverlay
          config={appState}
          handleAppStateChange={handleAppStateChange}
          agent={agent}
          xrStore={xrStore.current!}
        />
        <SettingsButton />
        <LLMLoadingBar
          statusText={statusState.text}
          statusColor={statusState.color}
          visible={agentConfig.llm.llm_provider === 'mlc'}
        />
      </div>
    </div>
  )
}
