import { useState, type CSSProperties } from 'react'

interface SaveButtonProps {
  onSave: () => Promise<boolean>
  isSaving: boolean
  hasChanges: boolean
}

const buttonStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.625rem 1.25rem',
  border: 'none',
  borderRadius: '8px',
  fontSize: '0.875rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s ease'
}

const enabledStyle: CSSProperties = {
  ...buttonStyle,
  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.8) 0%, rgba(22, 163, 74, 0.8) 100%)',
  color: 'white',
  boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
}

const disabledStyle: CSSProperties = {
  ...buttonStyle,
  background: 'rgba(255, 255, 255, 0.1)',
  color: 'rgba(255, 255, 255, 0.4)',
  cursor: 'not-allowed'
}

const savingStyle: CSSProperties = {
  ...buttonStyle,
  background: 'rgba(30, 136, 229, 0.6)',
  color: 'white',
  cursor: 'wait'
}

const successStyle: CSSProperties = {
  ...buttonStyle,
  background: 'rgba(34, 197, 94, 0.8)',
  color: 'white'
}

export const SaveButton = ({ onSave, isSaving, hasChanges }: SaveButtonProps) => {
  const [showSuccess, setShowSuccess] = useState(false)

  const handleClick = async () => {
    if (isSaving || !hasChanges) return
    const success = await onSave()
    if (success) {
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 2000)
    }
  }

  if (showSuccess) {
    return (
      <button style={successStyle} disabled>
        <span>✓</span>
        Saved!
      </button>
    )
  }

  if (isSaving) {
    return (
      <button style={savingStyle} disabled>
        <span style={{ animation: 'spin 1s linear infinite' }}>⟳</span>
        Saving...
      </button>
    )
  }

  return (
    <button
      style={hasChanges ? enabledStyle : disabledStyle}
      onClick={handleClick}
      disabled={!hasChanges}
      onMouseEnter={(e) => {
        if (hasChanges) {
          e.currentTarget.style.transform = 'translateY(-1px)'
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(34, 197, 94, 0.4)'
        }
      }}
      onMouseLeave={(e) => {
        if (hasChanges) {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.3)'
        }
      }}
    >
      Save Changes
    </button>
  )
}

export default SaveButton
