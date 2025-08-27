import type { CSSProperties } from 'react'

export const VoiceDetectedIcon = ({ size = '1rem' }: { size?: string }) => {
  const common: CSSProperties = { width: size, height: size }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={common}>
      <circle cx="12" cy="12" r="10" fill="#10B981" stroke="none" />
    </svg>
  )
}
