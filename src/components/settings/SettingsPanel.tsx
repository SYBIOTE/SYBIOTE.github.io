import { useState, useEffect, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { SettingsIcon } from '../common/icons/SettingsIcon'
import type { SupportedLocale } from '../../i18n/types'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

interface AppSettings {
  volume: number
  language: SupportedLocale
  autoPlay: boolean
  reducedMotion: boolean
}

const overlay: CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.5)',
  backdropFilter: 'blur(4px)',
  zIndex: 10000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  opacity: 0,
  transition: 'opacity 200ms ease'
}

const panel: CSSProperties = {
  background: 'linear-gradient(145deg, rgba(58, 60, 63, 0.56), rgba(36, 36, 36, 0.16))',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '16px',
  padding: '1.5rem',
  width: '90%',
  maxWidth: '400px',
  maxHeight: '80vh',
  overflowY: 'auto',
  backdropFilter: 'blur(20px)',
  boxShadow: '0 20px 80px rgba(0, 0, 0, 0.6)',
  transform: 'scale(0.9)',
  transition: 'transform 200ms ease'
}

const header: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '1.5rem',
  paddingBottom: '1rem',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
}

const title: CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: 600,
  color: '#fff',
  margin: 0
}

const closeButton: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.1)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '8px',
  color: '#fff',
  cursor: 'pointer',
  padding: '0.5rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  boxShadow: 'none'
}

const section: CSSProperties = {
  marginBottom: '1.5rem'
}

const sectionTitle: CSSProperties = {
  fontSize: '0.9rem',
  fontWeight: 600,
  color: '#e5e7eb',
  marginBottom: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
}

const settingRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '1rem',
  padding: '0.5rem 0'
}

const settingLabel: CSSProperties = {
  color: '#d1d5db',
  fontSize: '0.95rem'
}

const slider: CSSProperties = {
  width: '120px',
  height: '6px',
  borderRadius: '3px',
  background: 'linear-gradient(90deg, rgba(30,136,229,0.3) 0%, rgba(30,136,229,0.1) 100%)',
  outline: 'none',
  cursor: 'pointer',
  border: '1px solid rgba(30,136,229,0.2)',
  transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  boxShadow: 'none'
}

const select: CSSProperties = {
  background: 'linear-gradient(135deg, rgba(30,136,229,0.15) 0%, rgba(30,136,229,0.05) 100%)',
  border: '1px solid rgba(30,136,229,0.3)',
  borderRadius: '8px',
  color: '#fff',
  padding: '0.6rem 0.8rem',
  fontSize: '0.9rem',
  cursor: 'pointer',
  transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  boxShadow: '0 0.125rem 0.25rem rgba(30,136,229,0.1)',
  backdropFilter: 'blur(8px)',
  minWidth: '140px'
}

const toggle: CSSProperties = {
  position: 'relative',
  width: '48px',
  height: '24px',
  background: 'rgba(255, 255, 255, 0.2)',
  borderRadius: '12px',
  cursor: 'pointer',
  transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  boxShadow: 'none'
}

const toggleActive: CSSProperties = {
  ...toggle,
  background: 'linear-gradient(135deg, rgba(30,136,229,0.3) 0%, rgba(30,136,229,0.15) 100%)',
  borderColor: 'rgba(30,136,229,0.4)'
}

const toggleThumb: CSSProperties = {
  position: 'absolute',
  top: '2px',
  left: '2px',
  width: '20px',
  height: '20px',
  background: '#fff',
  borderRadius: '50%',
  transition: 'transform 200ms ease'
}

const toggleThumbActive: CSSProperties = {
  ...toggleThumb,
  transform: 'translateX(24px)'
}

export const SettingsPanel = ({ isOpen, onClose }: SettingsPanelProps) => {
  const { t, i18n } = useTranslation()
  const locale = i18n.language as SupportedLocale
  const setLocale = (newLocale: SupportedLocale) => i18n.changeLanguage(newLocale)
  
  const [settings, setSettings] = useState<AppSettings>({
    volume: 80,
    language: locale,
    autoPlay: true,
    reducedMotion: false
  })

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('app-settings')
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings) as Partial<AppSettings>
        setSettings(prev => ({ ...prev, ...parsed, language: locale }))
        
        // Initialize volume for existing audio elements
        if (parsed.volume !== undefined) {
          const volumeValue = parsed.volume / 100
          const audioElements = document.querySelectorAll('audio, video')
          audioElements.forEach((element: any) => {
            if (element.volume !== undefined) {
              element.volume = volumeValue
            }
          })
          ;(window as any).globalVolume = volumeValue
          ;(window as any).globalTTSVolume = volumeValue
        }
      }
    } catch (error) {
      console.warn('Could not load settings:', error)
    }
  }, [locale])

  // Save settings to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('app-settings', JSON.stringify(settings))
    } catch (error) {
      console.warn('Could not save settings:', error)
    }
  }, [settings])

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    
    // Special handling for language changes
    if (key === 'language') {
      setLocale(value as SupportedLocale)
    }
    
    // Special handling for volume changes
    if (key === 'volume') {
      const volumeValue = (value as number) / 100
      
      // Set volume for all audio elements on the page
      const audioElements = document.querySelectorAll('audio, video')
      audioElements.forEach((element: any) => {
        if (element.volume !== undefined) {
          element.volume = volumeValue
        }
      })
      
      // Store volume in global variables for other components to use
      ;(window as any).globalVolume = volumeValue
      ;(window as any).globalTTSVolume = volumeValue
      
      // Update TTS volume for browser speech synthesis
      if ('speechSynthesis' in window) {
        // Store the volume for future speech synthesis calls
        ;(window as any).speechSynthesisVolume = volumeValue
      }
      
      // Dispatch custom event for volume change
      window.dispatchEvent(new CustomEvent('volumeChanged', { 
        detail: { volume: volumeValue, volumePercent: value } 
      }))
    }
  }

  const languages = [
    { code: 'en' as SupportedLocale, name: '🇺🇸 English', nativeName: 'English' },
    { code: 'es' as SupportedLocale, name: '🇪🇸 Español', nativeName: 'Español' },
    { code: 'fr' as SupportedLocale, name: '🇫🇷 Français', nativeName: 'Français' },
    { code: 'de' as SupportedLocale, name: '🇩🇪 Deutsch', nativeName: 'Deutsch' },
    { code: 'ja' as SupportedLocale, name: '🇯🇵 日本語', nativeName: '日本語' },
    { code: 'hi' as SupportedLocale, name: '🇮🇳 हिंदी', nativeName: 'हिंदी' }
  ]

  if (!isOpen) return null

  return (
    <div
      style={{
        ...overlay,
        opacity: isOpen ? 1 : 0
      }}
      onClick={onClose}
    >
      <div
        style={{
          ...panel,
          transform: isOpen ? 'scale(1)' : 'scale(0.9)'
        }}
        onClick={(e) => e.stopPropagation()}
        className="no-scrollbar"
      >
        <div style={header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <SettingsIcon size="1.5rem" />
            <h2 style={title}>{t("sections.settings")}</h2>
          </div>
          <button 
            style={closeButton} 
            onClick={onClose}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(30,136,229,0.3) 0%, rgba(30,136,229,0.15) 100%)'
              e.currentTarget.style.borderColor = 'rgba(30,136,229,0.4)'
              e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 0.5rem 1rem rgba(30,136,229,0.25)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
              e.currentTarget.style.transform = 'scale(1) translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={section}>
          <div style={sectionTitle}>{t("sections.audio")}</div> 
          <div style={settingRow}>
            <span style={settingLabel}>{t("settings.audio.masterVolume")}</span>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.volume}
              onChange={(e) => updateSetting('volume', parseInt(e.target.value))}
              style={slider}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(90deg, rgba(30,136,229,0.5) 0%, rgba(30,136,229,0.2) 100%)'
                e.currentTarget.style.borderColor = 'rgba(30,136,229,0.4)'
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 0.5rem 1rem rgba(30,136,229,0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(90deg, rgba(30,136,229,0.3) 0%, rgba(30,136,229,0.1) 100%)'
                e.currentTarget.style.borderColor = 'rgba(30,136,229,0.2)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
            <span style={{ ...settingLabel, minWidth: '3ch', textAlign: 'right' }}>
              {settings.volume}%
            </span>
          </div>
          <div style={settingRow}>
            <span style={settingLabel}>{t("settings.audio.autoPlay")}</span>
            <div
              style={settings.autoPlay ? toggleActive : toggle}
              onClick={() => updateSetting('autoPlay', !settings.autoPlay)}
              onMouseEnter={(e) => {
                if (!settings.autoPlay) {
                  e.currentTarget.style.background = 'radial-gradient(ellipse at center, rgba(255,255,255,0.02) 0%, rgba(255, 255, 255, 0.02) 70%, rgba(30,136,229,0.12) 100%)'
                  e.currentTarget.style.borderColor = 'rgba(30,136,229,0.3)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 0.5rem 1rem rgba(30,136,229,0.15)'
                }
              }}
              onMouseLeave={(e) => {
                if (!settings.autoPlay) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }
              }}
            >
              <div style={settings.autoPlay ? toggleThumbActive : toggleThumb} />
            </div>
          </div>
        </div>

        <div style={section}>
          <div style={sectionTitle}>{t("sections.language")}</div>
          <div style={settingRow}>
            <span style={settingLabel}>{t("settings.language.interfaceLanguage")}</span>
            <select
              style={select}
              value={settings.language}
              onChange={(e) => updateSetting('language', e.target.value as SupportedLocale)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(30,136,229,0.3) 0%, rgba(30,136,229,0.15) 100%)'
                e.currentTarget.style.borderColor = 'rgba(30,136,229,0.5)'
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 0.5rem 1rem rgba(30,136,229,0.25)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(30,136,229,0.15) 0%, rgba(30,136,229,0.05) 100%)'
                e.currentTarget.style.borderColor = 'rgba(30,136,229,0.3)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 0.125rem 0.25rem rgba(30,136,229,0.1)'
              }}
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code} style={{ 
                  background: 'linear-gradient(135deg, rgba(30,136,229,0.2) 0%, rgba(30,136,229,0.1) 100%)',
                  color: '#fff',
                  border: '1px solid rgba(30,136,229,0.3)',
                  padding: '0.5rem'
                }}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={section}>
            <div style={sectionTitle}>{t("sections.accessibility")}</div>
          <div style={settingRow}>
            <span style={settingLabel}>{t("settings.accessibility.reduceMotion")}</span>
            <div
              style={settings.reducedMotion ? toggleActive : toggle}
              onClick={() => updateSetting('reducedMotion', !settings.reducedMotion)}
              onMouseEnter={(e) => {
                if (!settings.reducedMotion) {
                  e.currentTarget.style.background = 'radial-gradient(ellipse at center, rgba(255,255,255,0.02) 0%, rgba(255, 255, 255, 0.02) 70%, rgba(30,136,229,0.12) 100%)'
                  e.currentTarget.style.borderColor = 'rgba(30,136,229,0.3)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 0.5rem 1rem rgba(30,136,229,0.15)'
                }
              }}
              onMouseLeave={(e) => {
                if (!settings.reducedMotion) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }
              }}
            >
              <div style={settings.reducedMotion ? toggleThumbActive : toggleThumb} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPanel
