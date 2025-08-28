import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

interface ChatInputProps {
  message: string
  onMessageChange: (message: string) => void
  onSubmit: (message: string) => void
  onKeyPress: (e: React.KeyboardEvent) => void
  isRecording: boolean
  vadDetecting?: boolean
  sttTranscript?: string
  sttListening?: boolean
}

export const ChatInput = memo(({
  message,
  onMessageChange,
  onSubmit,
  onKeyPress,
  isRecording,
  vadDetecting = false,
  sttTranscript = '',
  sttListening = false
}: ChatInputProps) => {
  const { t } = useTranslation()
  const isMobile = window.innerWidth <= 768

    const displayValue = useMemo(() => {
    return isRecording && sttTranscript ? (message + ' ' + sttTranscript).trim() : message
  }, [isRecording, sttTranscript, message])

  const placeholder = useMemo(() => {
    if (!isRecording) return t("chat.input.placeholder")
    if (vadDetecting) return t("chat.input.listening")
    if (sttListening) return t("chat.input.sttReady")
    return t("chat.input.starting")
  }, [isRecording, vadDetecting, sttListening, t])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!isRecording) onMessageChange(e.target.value)
  }, [isRecording, onMessageChange])

  const handleSubmit = useCallback(() => {
    onSubmit(message)
  }, [message, onSubmit])

  
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '7.5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        width: isMobile ? '18.75rem' : '25rem',
        maxWidth: '90%',
        pointerEvents: 'none'
      }}
    >
      <div style={{ pointerEvents: 'auto' }}>
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}
        >
          {/* Text Input Container */}
          <div
            style={{
              position: 'relative',
              width: '100%'
            }}
          >
            <textarea
              className="chat-input"
              style={{
                width: '100%',
                padding: '0.75rem 3.125rem 0.75rem 1.25rem',
                borderRadius: '0.5rem',
                resize: 'none',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'rgba(255,255,255,0.15)',
                outline: 'none',
                background: 'rgba(255,255,255,0.06)',
                backdropFilter: 'blur(12px)',
                color: '#FFFFFF',
                overflow: 'auto',
                fontFamily:
                  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                fontSize: '1rem',
                lineHeight: '1.5',
                boxShadow: '0 0.125rem 0.25rem rgba(0,0,0,0.04)',
                boxSizing: 'border-box',
                transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                ...(vadDetecting && { 
                  background: 'rgba(74,144,226,0.15)',
                  borderColor: 'rgba(74,144,226,0.3)',
                  boxShadow: '0 0.125rem 0.5rem rgba(74,144,226,0.2)'
                }),
                ...(sttListening && !vadDetecting && { 
                  background: 'rgba(255,107,53,0.15)',
                  borderColor: 'rgba(255,107,53,0.3)',
                  boxShadow: '0 0.125rem 0.5rem rgba(255,107,53,0.2)'
                })
              }}
              rows={1}
              placeholder={placeholder}
              value={displayValue}
              onChange={handleInputChange}
              onKeyPress={onKeyPress}
              readOnly={isRecording}
            />

            {/* Send Button - positioned inside the text field */}
            <div
              style={{
                position: 'absolute',
                right: '0.375rem',
                top: '45%',
                transform: 'translateY(-50%)',
                zIndex: 1
              }}
            >
              <button
                onClick={handleSubmit}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: 'rgba(255,255,255,0.15)',
                  borderRadius: '0.5rem',
                  width: '2rem',
                  height: '2rem',
                  cursor: 'pointer',
                  color: 'white',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0.125rem 0.25rem rgba(0,0,0,0.04)',
                  transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  backdropFilter: 'blur(12px)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(74,144,226,0.15)'
                  e.currentTarget.style.borderColor = 'rgba(74,144,226,0.3)'
                  e.currentTarget.style.transform = 'scale(1.05) translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 0.25rem 0.75rem rgba(0,0,0,0.25)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                  e.currentTarget.style.transform = 'scale(1) translateY(0)'
                  e.currentTarget.style.boxShadow = '0 0.125rem 0.25rem rgba(0,0,0,0.04)'
                }}
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

ChatInput.displayName = 'ChatInput'
