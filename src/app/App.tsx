import type { XRStore } from '@react-three/xr'
import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'

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
import type { LLMStatusUpdate } from '../services/llm/llmTypes'
import { AgentProvider, useAgentContext } from '../components/scene/avatar/AgentContext'

export const config = {
  vad: defaultVadConfig,
  tts: defaultTTSConfig,
  stt: defaultSTTConfig,
  llm: defaultLLMConfig
}

const AgentDependentContent = memo(({ 
  appState, 
  handleAppStateChange, 
  xrStore 
}: { 
  appState: AppConfig
  handleAppStateChange: (newAppState: AppConfig) => void
  xrStore: XRStore | null
}) => {
  const { state :{ messages , vadIsDetecting }, actions :{ triggerGaze, performEmotionAction , getMessagebyId } } = useAgentContext() // Get from context instead of props
  const chatMessages = useMemo(
    () => messages.map(getMessagebyId),
    [messages, getMessagebyId]
  )

  // Moved from App - this prevents App from rerendering when vadIsDetecting changes
  useEffect(() => {
    if (vadIsDetecting) {
      triggerGaze()
      performEmotionAction({emotion: 'alert', relaxTime: 500 })
    }
  }, [vadIsDetecting, triggerGaze, performEmotionAction])

  return (
    <>
      <SectionNavRail messages={chatMessages} />
      <ChatOverlay config={appState} />
      {xrStore && (
        <ControlOverlay
          config={appState}
          handleAppStateChange={handleAppStateChange}
          xrStore={xrStore}
        />
      )}
    </>
  )
})

AgentDependentContent.displayName = 'AgentDependentContent'

const AppComponent = () => {
  const { isMobile } = useResponsiveLayout() // Layout service for responsive behavior

  const containerStyle = useMemo<CSSProperties>(() => ({
    display: 'flex',
    flexDirection: 'column',
    height: '100dvh',
    width: '100vw',
    maxWidth: '100vw',
    overflow: 'hidden',
    background: 'radial-gradient(circle at top, #0F1113 0%, #1B1E20 100%)',
    color: '#FFFFFF',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontWeight: 400,
    lineHeight: 1.5,
    boxSizing: 'border-box',
    ...(isMobile && {
      height: '100dvh',
      width: '100vw',
      maxHeight: '100dvh',
      maxWidth: '100vw',
      position: 'fixed',
      top: 0,
      left: 0
    }),
    ...(!isMobile && {
      justifyContent: 'center',
      alignItems: 'center'
    })
  }), [isMobile])

  const viewportStyle = useMemo<CSSProperties>(() => ({
    flex: 1,
    position: 'relative',
    height: '100%',
    width: '100%',
    minHeight: 0,
    maxHeight: '100dvh',
    maxWidth: '100vw',
    overflow: 'hidden',
    boxSizing: 'border-box',
    ...(isMobile && {
      height: '100dvh',
      width: '100vw',
      maxHeight: '100dvh',
      maxWidth: '100vw'
    }),
    ...(!isMobile && {
      height: '100%',
      width: '100%'
    })
  }), [isMobile]) 

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

  const [statusState, setStatusState] = useState<LLMStatusUpdate>({
    color: 'loading',
    text: 'Loading local model…'
  })


  const onLLMStatus = useCallback((status: LLMStatusUpdate) => {
    setStatusState({ color: status.color, text: status.text })
  }, [])

  const agent = useAgent(agentConfig, {
    onLLMStatus
  })

  const handleAppStateChange = useCallback((newAppState: AppConfig) => {
    setAppState(newAppState)
  }, [setAppState])

  console.log('AppComponent')
  return (
    <AgentProvider agent={agent}>
      <div style={containerStyle}>
        <div style={viewportStyle}>
          <Viewport3D
            sceneConfig={sceneConfig}
            setXRStore={setXRStore}
          />

          <LogoOverlay />
          <AgentDependentContent
            appState={appState}
            handleAppStateChange={handleAppStateChange}
            xrStore={xrStore.current}
          />
          <SettingsButton />
          <LLMLoadingBar
            statusText={statusState.text}
            statusColor={statusState.color}
            visible={agentConfig.llm.llm_provider === 'mlc'}
          />
        </div>
      </div>
    </AgentProvider>
  )
}

export const App = memo(AppComponent)