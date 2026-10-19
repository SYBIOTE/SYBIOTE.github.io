import { useSimpleStore } from '@hexafield/simple-store/react'
import { useState, useCallback, useEffect, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { usePortfolioContent, getSortedPortfolioItems } from '../../content/useContent'
import type { PortfolioItem } from '../../content/types'
import { PortfolioModal } from '../portfolio'
import { AvatarUIState } from '../../services/actions/avatarActions'

const container: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  padding: '0.75rem 0rem',
  color: 'rgba(240, 245, 255, 0.9)',
  overflowY: 'auto',
  overflowX: 'hidden',
  position: 'relative'
}

const grid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
  gap: '0.6rem'
}

const card: CSSProperties = {
  position: 'relative',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '12px',
  padding: '0.65rem',
  backdropFilter: 'blur(8px)',
  overflow: 'hidden',
  transition: 'transform 0.2s ease, border-color 0.2s ease, background 0.2s ease'
}

const cardClickable: CSSProperties = {
  ...card,
  cursor: 'pointer'
}

const imageContainer: CSSProperties = {
  width: '100%',
  height: '200px', // Match video height
  marginBottom: '0.5rem',
  borderRadius: '8px',
  overflow: 'hidden',
  background: 'rgba(255,255,255,0.02)'
}

const image: CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  transition: 'transform 0.3s ease'
}

// Reusable Components

interface PortfolioCardProps {
  item: PortfolioItem
  onCardClick?: () => void
}

const PortfolioCard = ({ item, onCardClick }: PortfolioCardProps) => {
  const { t } = useTranslation()
  
  const isFolder = item.type === 'folder'
  
  const handleCardClick = () => {
    if (onCardClick) {
      onCardClick()
    }
  }
  
  return (
    <div 
      style={cardClickable}
      onClick={handleCardClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'radial-gradient(ellipse at center, rgba(255,255,255,0.02) 0%, rgba(255, 255, 255, 0.02) 70%, rgba(30,136,229,0.12) 100%)'
        e.currentTarget.style.borderColor = 'rgba(30,136,229,0.3)'
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 0.5rem 1rem rgba(30,136,229,0.15)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {item.image ? (
        <div style={imageContainer}>
          <img src={item.image} alt={t(`portfolio.items.${item.id}.title`)} style={image} />
          {item.videoId && (
            <div style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'rgba(0,0,0,0.7)',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '16px',
              transition: 'all 0.2s ease'
            }}>
              ▶
            </div>
          )}
          {isFolder && (
            <div style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              background: 'rgba(30, 136, 229, 0.9)',
              borderRadius: '4px',
              padding: '4px 8px',
              color: 'white',
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Collection
            </div>
          )}
        </div>
      ) : null}
      <div style={{ 
        fontWeight: 600, 
        color: 'rgba(255, 255, 255, 0.95)',
        fontSize: '1rem',
        lineHeight: 1.3
      }}>{t(`portfolio.items.${item.id}.title`)}</div>
      <div style={{ 
        color: 'rgba(220, 230, 255, 0.8)', 
        fontSize: '0.9rem', 
        marginTop: '0.25rem',
        lineHeight: 1.4
      }}>
        {t(`portfolio.items.${item.id}.description`)}
      </div>
    </div>
  )
}

interface PortfolioGridProps {
  items: PortfolioItem[]
  onCardClick?: (id: string) => void
}

const PortfolioGrid = ({ items, onCardClick }: PortfolioGridProps) => (
  <div style={grid}>
    {items.map((item) => (
      <PortfolioCard
        key={item.id}
        item={item}
        onCardClick={onCardClick ? () => onCardClick(item.id) : undefined}
      />
    ))}
  </div>
)





export const PortfolioSection = () => {
  // Load portfolio data from JSON with HMR support
  const portfolioContent = usePortfolioContent()
  const portfolioItems = getSortedPortfolioItems(portfolioContent)
  
  // Modal state - navigation stack for folder navigation
  const [modalStack, setModalStack] = useState<string[]>([])

  const currentItemId = modalStack.length > 0 ? modalStack[modalStack.length - 1] : null
  const currentItem = currentItemId ? portfolioItems.find(item => item.id === currentItemId) : null
  const parentItemId = modalStack.length > 1 ? modalStack[modalStack.length - 2] : null
  const parentItem = parentItemId ? portfolioItems.find(item => item.id === parentItemId) : undefined

  // Open a project when the avatar asks for one, then consume the request
  const [{ focusProjectId }, setUIState] = useSimpleStore(AvatarUIState)
  useEffect(() => {
    if (!focusProjectId) return
    if (portfolioItems.some((item) => item.id === focusProjectId)) setModalStack([focusProjectId])
    setUIState((prev) => ({ ...prev, focusProjectId: null }))
  }, [focusProjectId, portfolioItems, setUIState])

  const handleCardClick = useCallback((itemId: string) => {
    setModalStack([itemId])
  }, [])

  const handleModalClose = useCallback(() => {
    setModalStack([])
  }, [])

  const handleModalNavigate = useCallback((itemId: string) => {
    setModalStack(prev => {
      // If navigating back to parent, pop the stack
      const parentIndex = prev.indexOf(itemId)
      if (parentIndex !== -1) {
        return prev.slice(0, parentIndex + 1)
      }
      // Otherwise push to stack
      return [...prev, itemId]
    })
  }, [])

  // Filter to show only top-level items (not children of folders)
  const topLevelItems = portfolioItems.filter(item => {
    // Check if this item is a child of any folder
    const isChild = portfolioItems.some(
      parent => parent.type === 'folder' && parent.children?.includes(item.id)
    )
    return !isChild
  })

  return (
    <div style={container} className='no-scrollbar'>
      <PortfolioGrid 
        items={topLevelItems}
        onCardClick={handleCardClick}
      />
      
      {currentItem && (
        <PortfolioModal
          item={currentItem}
          allItems={portfolioItems}
          onClose={handleModalClose}
          onNavigate={handleModalNavigate}
          parentItem={parentItem}
        />
      )}
    </div>
  )
}

export default PortfolioSection


