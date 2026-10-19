import { useSimpleStore } from '@hexafield/simple-store/react'
import { memo, useCallback, useEffect, useMemo } from 'react'

import { CallApp } from '../call/CallApp'
import { AgentProvider } from '../components/scene/avatar/AgentContext'
import { defaultLLMConfig } from '../services/llm/config/llmConfig'
import type { LLMStatusUpdate } from '../services/llm/llmTypes'
import { defaultSTTConfig } from '../services/stt/sttConfig'
import { defaultTTSConfig } from '../services/tts/ttsConfig'
import { useAgent } from '../services/useAgent'
import { defaultVadConfig } from '../services/vad/vadConfig'
import { initializeViewport } from '../utils/viewportUtils'
import { AppConfigState } from './appConfig'

export const config = {
  vad: defaultVadConfig,
  tts: defaultTTSConfig,
  stt: defaultSTTConfig,
  llm: defaultLLMConfig
}

const AppComponent = () => {
  const [appState] = useSimpleStore(AppConfigState)

  // Initialize viewport utilities for mobile browser compatibility
  useEffect(() => {
    const cleanup = initializeViewport()
    return cleanup
  }, [])

  const agentConfig = useMemo(
    () => ({
      ...config,
      // Voice detection follows the mic button
      vad: { ...config.vad, microphoneEnabled: appState.microphone },
      autoSubmitEnabled: appState.autoSubmitEnabled,
      bargeInEnabled: appState.bargeInEnabled
    }),
    [appState.microphone, appState.autoSubmitEnabled, appState.bargeInEnabled]
  )

  const onLLMStatus = useCallback((status: LLMStatusUpdate) => {
    if (status.color === 'error' || status.color === 'warning') logger.warn('LLM status:', status.text)
  }, [])

  const agent = useAgent(agentConfig, {
    onLLMStatus
  })

  return (
    <AgentProvider agent={agent}>
      <CallApp />
    </AgentProvider>
  )
}

export const App = memo(AppComponent)
