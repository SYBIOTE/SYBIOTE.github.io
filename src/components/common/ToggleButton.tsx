interface ToggleButtonProps {
  isVisible: boolean
  onToggle: () => void
  label: string
  position: 'left' | 'right' | 'bottom-left'
  isMobile?: boolean
  panelWidth?: { mobile: string; desktop: string }
}

export const ToggleButton = ({
  isVisible,
  onToggle,
  label,
  position,
  isMobile = false,
  panelWidth = { mobile: '0.625rem', desktop: '1.25rem' }
}: ToggleButtonProps) => {
  const getPosition = () => {
    if (position === 'bottom-left') {
      return { bottom: '1.25rem', left: '1.25rem' }
    }

    const basePosition = isVisible
      ? isMobile
        ? panelWidth.mobile
        : panelWidth.desktop
      : isMobile
      ? '0.625rem'
      : '1.25rem'

    if (position === 'left') {
      return { left: basePosition }
    } else {
      // For right position, only subtract button width when maximized
      if (isVisible) {
        const buttonWidth = '2rem'
        return { right: `calc(${basePosition} - ${buttonWidth})` }
      } else {
        return { right: basePosition }
      }
    }
  }

  const getIcon = () => {
    if (position === 'bottom-left') {
      return isVisible ? '▼' : '▲'
    }

    return isVisible ? (position === 'left' ? '◀' : '▶') : position === 'left' ? '▶' : '◀'
  }

  const getTransform = () => {
    if (position === 'bottom-left') {
      return 'none'
    }
    return 'translateY(-50%)'
  }

  return (
    <button
      onClick={onToggle}
      style={{
        position: 'absolute',
        top: position === 'bottom-left' ? 'auto' : '3%',
        ...getPosition(),
        transform: getTransform(),
        zIndex: 1000,
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '0.5rem',
        padding: '0.5rem 0.75rem',
        cursor: 'pointer',
        color: 'white',
        fontSize: '0.75rem',
        fontWeight: '600',
        transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.375rem',
        minWidth: '2rem',
        height: '2rem',
        boxShadow: '0 0.125rem 0.25rem rgba(0,0,0,0.04)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(74,144,226,0.15)'
        e.currentTarget.style.borderColor = 'rgba(74,144,226,0.3)'
        e.currentTarget.style.transform = position === 'bottom-left' ? 'scale(1.05) translateY(-2px)' : 'translateY(-50%) scale(1.05) translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 0.5rem 1rem rgba(0,0,0,0.3)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
        e.currentTarget.style.transform = position === 'bottom-left' ? 'scale(1) translateY(0)' : 'translateY(-50%) scale(1) translateY(0)'
        e.currentTarget.style.boxShadow = '0 0.125rem 0.25rem rgba(0,0,0,0.04)'
      }}
    >
      {getIcon()}
      {!isVisible && <span style={{ marginLeft: '0.25rem' }}>{label}</span>}
    </button>
  )
}
