import React, { type CSSProperties } from 'react'

import { Tooltip } from './Tooltip'

interface ControlButtonProps {
  isActive?: boolean
  onClick: () => void
  children: React.ReactNode
  tooltipContent?: string
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
  style?: CSSProperties
}

export const ControlButton = ({
  isActive = false,
  onClick,
  children,
  tooltipContent,
  tooltipPosition = 'top',
  className,
  style
}: ControlButtonProps) => {
  const buttonElement = (
    <button
      className={className}
      style={{
        width: '2.5rem',
        height: '2.5rem',
        padding: '0',
        borderRadius: '0.5rem',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        background: isActive
          ? 'rgba(74,144,226,0.25)'
          : 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)',
        border: isActive ? '1px solid rgba(74,144,226,0.3)' : '1px solid rgba(255,255,255,0.15)',
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1rem',
        boxShadow: isActive ? '0 0.125rem 0.5rem rgba(74,144,226,0.2)' : '0 0.125rem 0.25rem rgba(0,0,0,0.04)',
        ...(style ?? {})
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 0.5rem 1rem rgba(0,0,0,0.3)'
        e.currentTarget.style.borderColor = isActive ? 'rgba(74,144,226,0.5)' : 'rgba(74,144,226,0.3)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1) translateY(0)'
        e.currentTarget.style.boxShadow = isActive
          ? '0 0.125rem 0.5rem rgba(74,144,226,0.2)'
          : '0 0.125rem 0.25rem rgba(0,0,0,0.04)'
        e.currentTarget.style.borderColor = isActive ? 'rgba(74,144,226,0.3)' : 'rgba(255,255,255,0.15)'
      }}
    >
      {children}
    </button>
  )

  // If tooltip content is provided, wrap the button with tooltip
  if (tooltipContent) {
    return (
      <Tooltip content={tooltipContent} position={tooltipPosition}>
        {buttonElement}
      </Tooltip>
    )
  }

  // Otherwise return just the button
  return buttonElement
}
