import type { ConversationMessage } from '../../services/conversation/conversationType'

interface ChatBubbleProps {
  message: ConversationMessage
}

export const ChatBubble = ({ message }: ChatBubbleProps) => {
  return (
    <div
      style={{
        margin: '0.5rem 0',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.5rem',
        flexDirection: message.isUser ? 'row-reverse' : 'row'
      }}
    >
      {/* Profile Picture Placeholder */}
      <div
        style={{
          width: '2rem',
          height: '2rem',
          borderRadius: '50%',
          background: message.isUser
            ? 'rgba(74,144,226,0.25)'
            : 'rgba(255,255,255,0.06)',
          border: message.isUser
            ? '1px solid rgba(74,144,226,0.3)'
            : '1px solid rgba(255,255,255,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.75rem',
          fontWeight: '600',
          color: 'white',
          flexShrink: 0,
          boxShadow: '0 0.125rem 0.25rem rgba(0,0,0,0.04)'
        }}
      >
        {message.isUser ? 'U' : 'A'}
      </div>

      {/* Message Content */}
      <div
        style={{
          maxWidth: '70%',
          padding: '0.5rem 0.75rem',
          borderRadius: '0.5rem',
          background: message.isUser
            ? 'rgba(74,144,226,0.25)'
            : 'rgba(255,255,255,0.06)',
          border: message.isUser 
            ? '1px solid rgba(74,144,226,0.3)' 
            : '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 0.125rem 0.25rem rgba(0,0,0,0.04)',
          fontSize: '0.875rem',
          lineHeight: '1.4',
          transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          cursor: message.isUser ? 'pointer' : 'default'
        }}
      >
        <div style={{ marginBottom: '0.125rem', fontSize: '0.625rem', opacity: 0.7 }}>
          {message.isUser ? 'You' : 'Assistant'}
        </div>
        <div>{message.text}</div>
      </div>
    </div>
  )
}
