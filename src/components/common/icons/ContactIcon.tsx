import type { CSSProperties } from 'react'

export const ContactIcon = ({ size = '1rem' }: { size?: string }) => {
  const common: CSSProperties = { width: size, height: size }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={common}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M22 6l-10 7L2 6" />
    </svg>
  )
}


