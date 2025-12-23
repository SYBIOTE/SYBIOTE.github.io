import { memo, useCallback, useState } from 'react'

import { ChatInput } from './ChatInput'
import { type AppConfig } from '../../app/appConfig'
import { shouldTriggerBargeIn } from '../../integration/emotionIntegration'
import {  useAgentActions, useAgentState } from '../scene/avatar/AgentContext'

interface ChatOverlayProps {
  config: AppConfig
}


export const ChatOverlay = memo(({
  config,
}: ChatOverlayProps) => {
  const {vadIsDetecting, currentTranscript, sttIsListening} = useAgentState()
  const {triggerBargein, submitMessage} = useAgentActions()
  const [currentInputMessage, setCurrentInputMessage] = useState('')
  const handleSubmit = useCallback((message: string) => {
    if(shouldTriggerBargeIn({text: message, isUser: true, id: '', timestamp: 0})) {
      triggerBargein()
    }
    submitMessage(message)
    setCurrentInputMessage('')
  }, [triggerBargein, submitMessage])
  
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(currentInputMessage)
    }
  }, [currentInputMessage, handleSubmit])



  return (
    <>
      {/* Chat Input */}
      <ChatInput
        message={currentInputMessage}
        onMessageChange={setCurrentInputMessage}
        onSubmit={handleSubmit}
        onKeyPress={handleKeyPress}
        isRecording={config.microphone}
        vadDetecting={vadIsDetecting}
        sttTranscript={currentTranscript}
        sttListening={sttIsListening}
      />
    </>
  )
})
