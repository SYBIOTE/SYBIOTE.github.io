import React, { useState } from 'react'

interface TooltipProps {
  children: React.ReactNode
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

export const Tooltip = ({ children, content, position = 'top', delay = 500 }: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    const id = setTimeout(() => setIsVisible(true), delay)
    setTimeoutId(id)
  }

  const handleMouseLeave = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    setIsVisible(false)
  }

  const getPositionStyles = () => {
    const baseStyles = {
      position: 'absolute' as const,
      zIndex: 10000,
      pointerEvents: 'none' as const,
      transition: 'opacity 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'scale(1)' : 'scale(0.95)',
      whiteSpace: 'nowrap' as const,
      fontSize: '0.75rem',
      fontWeight: '500',
      color: '#FFFFFF',
      background: 'rgba(255,255,255,0.06)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: '0.5rem',
      padding: '0.5rem 0.75rem',
      boxShadow: '0 0.125rem 0.25rem rgba(0,0,0,0.04)',
      maxWidth: '12.5rem',
      textAlign: 'center' as const
    }

    switch (position) {
      case 'top':
        return {
          ...baseStyles,
          bottom: '100%',
          left: '50%',
          transform: isVisible
            ? 'translateX(-50%) translateY(-0.5rem) scale(1)'
            : 'translateX(-50%) translateY(-0.5rem) scale(0.95)',
          marginBottom: '0.5rem'
        }
      case 'bottom':
        return {
          ...baseStyles,
          top: '100%',
          left: '50%',
          transform: isVisible
            ? 'translateX(-50%) translateY(0.5rem) scale(1)'
            : 'translateX(-50%) translateY(0.5rem) scale(0.95)',
          marginTop: '0.5rem'
        }
      case 'left':
        return {
          ...baseStyles,
          right: '100%',
          top: '50%',
          transform: isVisible
            ? 'translateX(-0.5rem) translateY(-50%) scale(1)'
            : 'translateX(-0.5rem) translateY(-50%) scale(0.95)',
          marginRight: '0.5rem'
        }
      case 'right':
        return {
          ...baseStyles,
          left: '100%',
          top: '50%',
          transform: isVisible
            ? 'translateX(0.5rem) translateY(-50%) scale(1)'
            : 'translateX(0.5rem) translateY(-50%) scale(0.95)',
          marginLeft: '0.5rem'
        }
      default:
        return baseStyles
    }
  }

  return (
    <div
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      <div style={getPositionStyles()}>{content}</div>
    </div>
  )
}
