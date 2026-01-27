import { useEffect, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import type { PortfolioItem } from '../../content/types'
import { MediaCarousel } from './MediaCarousel'
import { LinkIcons } from './LinkIcons'

const overlayStyle: CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: '100vw',
  height: '100vh',
  background: 'rgba(0, 0, 0, 0.9)',
  backdropFilter: 'blur(12px)',
  zIndex: 99999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px'
}

const modalStyle: CSSProperties = {
  width: '100%',
  maxWidth: '900px',
  maxHeight: '95vh',
  background: 'linear-gradient(180deg, #1a1d21 0%, #0d0f11 100%)',
  borderRadius: '16px',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
}

const folderModalStyle: CSSProperties = {
  ...modalStyle,
  maxWidth: '700px',
  maxHeight: '80vh'
}

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 20px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  background: 'rgba(255, 255, 255, 0.02)'
}

const titleStyle: CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: 600,
  color: 'rgba(255, 255, 255, 0.95)',
  display: 'flex',
  alignItems: 'center',
  gap: '12px'
}

const backButtonStyle: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.1)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '6px',
  padding: '6px 12px',
  color: 'rgba(255, 255, 255, 0.8)',
  cursor: 'pointer',
  fontSize: '0.875rem',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  transition: 'all 0.2s ease'
}

const closeButtonStyle: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.1)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '8px',
  padding: '8px 16px',
  color: 'rgba(255, 255, 255, 0.9)',
  cursor: 'pointer',
  fontSize: '0.875rem',
  fontWeight: 500,
  transition: 'all 0.2s ease'
}

const contentStyle: CSSProperties = {
  flex: 1,
  overflow: 'auto',
  padding: '20px'
}

const descriptionStyle: CSSProperties = {
  color: 'rgba(255, 255, 255, 0.85)',
  fontSize: '1rem',
  lineHeight: 1.7,
  marginBottom: '20px'
}

const linksContainerStyle: CSSProperties = {
  marginBottom: '24px'
}

const childrenGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: '12px'
}

const childCardStyle: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.06)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '10px',
  padding: '12px',
  cursor: 'pointer',
  transition: 'all 0.2s ease'
}

const childImageStyle: CSSProperties = {
  width: '100%',
  aspectRatio: '16 / 9',
  objectFit: 'cover',
  borderRadius: '6px',
  marginBottom: '8px'
}

const childTitleStyle: CSSProperties = {
  fontSize: '0.9rem',
  fontWeight: 600,
  color: 'rgba(255, 255, 255, 0.95)'
}

interface PortfolioModalProps {
  item: PortfolioItem
  allItems: PortfolioItem[]
  onClose: () => void
  onNavigate: (itemId: string) => void
  parentItem?: PortfolioItem
}

export const PortfolioModal = ({ 
  item, 
  allItems, 
  onClose, 
  onNavigate,
  parentItem 
}: PortfolioModalProps) => {
  const { t } = useTranslation()

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const title = t(`portfolio.items.${item.id}.title`)
  const description = t(`portfolio.items.${item.id}.description`)
  const extendedDescription = t(`portfolio.items.${item.id}.extendedDescription`, { defaultValue: '' })
  
  const isFolder = item.type === 'folder'
  const childItems = isFolder && item.children 
    ? allItems.filter(child => item.children?.includes(child.id))
    : []

  const handleBackClick = () => {
    if (parentItem) {
      onNavigate(parentItem.id)
    }
  }

  const modalContent = (
    <div style={overlayStyle} onClick={onClose}>
      <div style={isFolder ? folderModalStyle : modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <div style={titleStyle}>
            {parentItem && (
              <button
                style={backButtonStyle}
                onClick={handleBackClick}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                }}
              >
                ← Back
              </button>
            )}
            {title}
            {isFolder && (
              <span style={{ 
                fontSize: '0.75rem', 
                background: 'rgba(30, 136, 229, 0.2)',
                color: 'rgba(30, 136, 229, 0.9)',
                padding: '4px 8px',
                borderRadius: '4px'
              }}>
                {childItems.length} projects
              </span>
            )}
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

        <div style={contentStyle} className="no-scrollbar">
          {/* Only show media and full description for leaf items, not folders */}
          {!isFolder && (
            <>
              <MediaCarousel
                mainImage={item.image}
                videoId={item.videoId}
                videos={item.videos}
                gallery={item.gallery}
                title={title}
              />

              <div style={{ marginTop: '20px' }}>
                <p style={descriptionStyle}>
                  {extendedDescription || description}
                </p>

                {item.links && item.links.length > 0 && (
                  <div style={linksContainerStyle}>
                    <LinkIcons links={item.links} />
                  </div>
                )}
              </div>
            </>
          )}

          {isFolder && childItems.length > 0 && (
            <div style={childrenGridStyle}>
              {childItems.map((child) => (
                <div
                  key={child.id}
                  style={childCardStyle}
                  onClick={() => onNavigate(child.id)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(30, 136, 229, 0.1)'
                    e.currentTarget.style.borderColor = 'rgba(30, 136, 229, 0.3)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  {child.image && (
                    <img 
                      src={child.image} 
                      alt={t(`portfolio.items.${child.id}.title`)} 
                      style={childImageStyle} 
                    />
                  )}
                  <div style={childTitleStyle}>
                    {t(`portfolio.items.${child.id}.title`)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // Render via portal to escape any parent container constraints
  return createPortal(modalContent, document.body)
}

export default PortfolioModal
