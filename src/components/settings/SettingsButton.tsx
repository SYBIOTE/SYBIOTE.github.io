import { useState, type CSSProperties } from 'react'
import { SettingsPanel } from './SettingsPanel'
import { SettingsIcon } from '../common/icons/SettingsIcon'
import { useTranslation } from 'react-i18next'

// Import ButtonStyleConfig from SectionNavRail for consistency
import type { ButtonStyleConfig } from '../sections/SectionNavRail'

const settingsButtonConfig: Partial<ButtonStyleConfig> = {
  iconSize: '2rem'
}

const button: CSSProperties = {
  position: 'absolute',
  bottom: '1rem',
  right: '1rem',
  width: '3rem',
  height: '3rem',
  borderRadius: '50%',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'rgba(255, 255, 255, 0.15)',
  background: 'rgba(255, 255, 255, 0.06)',
  color: '#fff',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backdropFilter: 'blur(12px)',
  transition: 'all 180ms ease',
  zIndex: 1003,
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
}

const buttonHover: CSSProperties = {
  ...button,
  background: 'linear-gradient(135deg, rgba(30,136,229,0.3) 0%, rgba(30,136,229,0.15) 100%)',
  borderColor: 'rgba(30,136,229,0.4)',
  transform: 'scale(1.05) translateY(-2px)',
  boxShadow: '0 0.5rem 1rem rgba(30,136,229,0.25)'
}

export const SettingsButton = () => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  return (
    <>
      <button
        style={isHovered ? buttonHover : button}
        onClick={() => setIsOpen(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title={t("sections.settings")}
        aria-label={t("settings.ariaLabel")}
      >
        <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <SettingsIcon 
          size={settingsButtonConfig.iconSize}
          style={{
            transition: 'transform 300ms ease',
            transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)'
          }}
        />
      </div>
      </button>
      <SettingsPanel 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
    </>
  )
}

export default SettingsButton
