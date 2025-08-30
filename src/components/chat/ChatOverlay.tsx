import { memo, useCallback, useState } from 'react'

import { ChatInput } from './ChatInput'
import { type AppConfig } from '../../app/appConfig'
import { shouldTriggerBargeIn } from '../../integration/emotionIntegration'
import type { AgentService } from '../../services/useAgent'

interface ChatOverlayProps {
  config: AppConfig
  agent: AgentService
}


export const ChatOverlay = memo(({
  config,
  agent,
}: ChatOverlayProps) => {
  const [currentInputMessage, setCurrentInputMessage] = useState('')
  
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(currentInputMessage)
    }
  }, [agent.actions, currentInputMessage])

  const handleSubmit = useCallback((message: string) => {
    if(shouldTriggerBargeIn({text: message, isUser: true, id: '', timestamp: 0})) {
      agent.actions.triggerBargein()
    }
    agent.actions.submitMessage(message)
  }, [agent.actions])

  return (
    <>
      {/* Chat Input */}
      <ChatInput
        message={currentInputMessage}
        onMessageChange={setCurrentInputMessage}
        onSubmit={handleSubmit}
        onKeyPress={handleKeyPress}
        isRecording={config.microphone}
        vadDetecting={agent.state.vadIsDetecting}
        sttTranscript={agent.state.currentTranscript}
        sttListening={agent.state.sttIsListening}
      />
    </>
  )
})
