import type { CSSProperties } from 'react'

export const ChatIcon = ({ size = '1rem' }: { size?: string }) => {
  const common: CSSProperties = { width: size, height: size }
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      style={common}
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M8 10h8" />
      <path d="M8 14h6" />
    </svg>
  )
}
