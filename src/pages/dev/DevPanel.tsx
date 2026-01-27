import { useState, type CSSProperties, useEffect } from 'react'

// Tab type
type TabId = 'portfolio' | 'resume' | 'services' | 'core'

interface Tab {
  id: TabId
  label: string
}

const tabs: Tab[] = [
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'resume', label: 'Resume' },
  { id: 'services', label: 'Services' },
  { id: 'core', label: 'Core Info' }
]

// Styles
const overlayStyle: CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.8)',
  backdropFilter: 'blur(8px)',
  zIndex: 10000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}

const panelStyle: CSSProperties = {
  width: '95vw',
  maxWidth: '1400px',
  height: '90vh',
  background: 'linear-gradient(180deg, #1a1d21 0%, #0d0f11 100%)',
  borderRadius: '16px',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
}

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '1rem 1.5rem',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  background: 'rgba(255, 255, 255, 0.02)'
}

const titleStyle: CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: 600,
  color: 'rgba(255, 255, 255, 0.95)'
}

const closeButtonStyle: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.1)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '8px',
  padding: '0.5rem 1rem',
  color: 'rgba(255, 255, 255, 0.9)',
  cursor: 'pointer',
  fontSize: '0.875rem',
  fontWeight: 500,
  transition: 'all 0.2s ease'
}

const tabsContainerStyle: CSSProperties = {
  display: 'flex',
  gap: '0.25rem',
  padding: '0.75rem 1.5rem',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  background: 'rgba(0, 0, 0, 0.2)'
}

const tabStyle: CSSProperties = {
  padding: '0.625rem 1.25rem',
  border: 'none',
  background: 'transparent',
  color: 'rgba(255, 255, 255, 0.6)',
  cursor: 'pointer',
  fontSize: '0.875rem',
  fontWeight: 500,
  borderRadius: '8px',
  transition: 'all 0.2s ease'
}

const activeTabStyle: CSSProperties = {
  ...tabStyle,
  background: 'rgba(30, 136, 229, 0.2)',
  color: 'rgba(255, 255, 255, 0.95)',
  border: '1px solid rgba(30, 136, 229, 0.3)'
}

const contentStyle: CSSProperties = {
  flex: 1,
  overflow: 'auto',
  padding: '1.5rem'
}

const devBadgeStyle: CSSProperties = {
  background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
  color: 'white',
  fontSize: '0.65rem',
  fontWeight: 700,
  padding: '0.2rem 0.5rem',
  borderRadius: '4px',
  marginLeft: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
}

// Import editors
import { PortfolioEditor } from './editors/PortfolioEditor'
import { ResumeEditor } from './editors/ResumeEditor'
import { ServicesEditor } from './editors/ServicesEditor'
import { CoreEditor } from './editors/CoreEditor'

interface DevPanelProps {
  onClose: () => void
}

export const DevPanel = ({ onClose }: DevPanelProps) => {
  const [activeTab, setActiveTab] = useState<TabId>('portfolio')

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Prevent body scroll when panel is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const renderContent = () => {
    switch (activeTab) {
      case 'portfolio':
        return <PortfolioEditor />
      case 'resume':
        return <ResumeEditor />
      case 'services':
        return <ServicesEditor />
      case 'core':
        return <CoreEditor />
      default:
        return null
    }
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={titleStyle}>Content Manager</span>
            <span style={devBadgeStyle}>Dev Only</span>
          </div>
          <button
            style={closeButtonStyle}
            onClick={onClose}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'
            }}
          >
            Close (Esc)
          </button>
        </div>

        <div style={tabsContainerStyle}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              style={activeTab === tab.id ? activeTabStyle : tabStyle}
              onClick={() => setActiveTab(tab.id)}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)'
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={contentStyle} className="no-scrollbar">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}

// Dev button to open the panel
const devButtonStyle: CSSProperties = {
  position: 'fixed',
  bottom: '1rem',
  left: '1rem',
  background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
  border: 'none',
  borderRadius: '8px',
  padding: '0.5rem 1rem',
  color: 'white',
  fontSize: '0.75rem',
  fontWeight: 600,
  cursor: 'pointer',
  zIndex: 9999,
  boxShadow: '0 4px 12px rgba(238, 90, 36, 0.4)',
  transition: 'all 0.2s ease',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
}

export const DevButton = () => {
  const [isOpen, setIsOpen] = useState(false)

  // Only show in development mode
  if (!import.meta.env.DEV) {
    return null
  }

  return (
    <>
      <button
        style={devButtonStyle}
        onClick={() => setIsOpen(true)}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)'
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(238, 90, 36, 0.5)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(238, 90, 36, 0.4)'
        }}
      >
        Dev Panel
      </button>
      {isOpen && <DevPanel onClose={() => setIsOpen(false)} />}
    </>
  )
}

export default DevPanel
