import { useEffect, useRef } from 'react'

import type { ConversationMessage } from '../../services/conversation/conversationType'
import { ChatBubble } from './ChatBubble'

interface ChatPanelProps {
  messages: ConversationMessage[]
}

export const ChatPanel = ({ messages }: ChatPanelProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollContainerRef.current) {
      const c = scrollContainerRef.current
      const scrollToBottom = () => (c.scrollTop = c.scrollHeight)
      const timeoutId = setTimeout(scrollToBottom, 50)
      requestAnimationFrame(scrollToBottom)
      return () => clearTimeout(timeoutId)
    }
  }, [messages])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0.75rem 1rem', color: '#FFFFFF', boxSizing: 'border-box' }} className="no-scrollbar">
      <div ref={scrollContainerRef} style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }} className="no-scrollbar">
        {messages.map((message) => (
          <ChatBubble key={message.id} message={message} />
        ))}
        <div style={{ height: '2rem' }} />
      </div>
    </div>
  )
}
