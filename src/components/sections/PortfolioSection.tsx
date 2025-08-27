import type { CSSProperties } from 'react'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

const container: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  padding: '0.75rem 0rem',
  color: '#E6EAF2',
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
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  padding: '0.65rem',
  backdropFilter: 'blur(8px)',
  overflow: 'hidden',
  transition: 'transform 0.2s ease, border-color 0.2s ease'
}

const cardClickable: CSSProperties = {
  ...card,
  cursor: 'pointer'
}

const cardVideo: CSSProperties = {
  ...card,
  cursor: 'default'
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

const videoWrapper: CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '200px', // Match image height
  borderRadius: '8px',
  overflow: 'hidden',
  background: 'rgba(255,255,255,0.02)',
  marginBottom: '1rem'
}

const iframeStyle: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  border: 0
}

// Reusable Components
interface PortfolioItem {
  id: string
  image?: string
  videoId?: string
}

interface PortfolioCardProps {
  item: PortfolioItem
  onImageClick?: () => void
}

const PortfolioCard = ({ item, onImageClick }: PortfolioCardProps) => {
  const { t } = useTranslation()
  const [showVideo, setShowVideo] = useState(false)
  
  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (item.videoId) {
      setShowVideo(true)
    } else if (onImageClick) {
      onImageClick()
    }
  }

  const handleVideoClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }
  
  return (
    <div style={showVideo && item.videoId ? cardVideo : (item.image || item.videoId) ? cardClickable : card}>
      {showVideo && item.videoId ? (
        <div style={{ ...videoWrapper, marginBottom: '0.5rem' }}>
          <iframe
            style={iframeStyle}
            src={`https://www.youtube.com/embed/${item.videoId}?autoplay=1&modestbranding=1&rel=0`}
            title={t(`portfolio.items.${item.id}.title`)}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            onClick={handleVideoClick}
          />
        </div>
      ) : item.image ? (
        <div style={imageContainer} onClick={handleImageClick}>
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
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}>
              ▶
            </div>
          )}
        </div>
      ) : null}
      <div style={{ fontWeight: 600 }}>{t(`portfolio.items.${item.id}.title`)}</div>
      <div style={{ color: '#A8B3C8', fontSize: '0.9rem', marginTop: '0.25rem' }}>
        {t(`portfolio.items.${item.id}.description`)}
      </div>
    </div>
  )
}

interface PortfolioGridProps {
  items: PortfolioItem[]
  onImageClick?: (id: string) => void
}

const PortfolioGrid = ({ items, onImageClick }: PortfolioGridProps) => (
  <div style={grid}>
    {items.map((item) => (
      <PortfolioCard
        key={item.id}
        item={item}
        onImageClick={onImageClick ? () => onImageClick(item.id) : undefined}
      />
    ))}
  </div>
)





export const PortfolioSection = () => {
  
  // Portfolio data with video IDs extracted from old website
  const portfolioItems: PortfolioItem[] = [
    { id: 'godotDojo', image: '/assets/img/portfolio/boids.jpeg', videoId: '5kpkPr0dcss' },
    { id: 'wizardVsRobot', image: 'https://img.itch.zone/aW1nLzczMDg1NTYuanBn/347x500/lco4FY.jpg', videoId: 'BMQzoFrCdbk' },
    { id: 'meshSlicerGodot', image: '/assets/img/portfolio/meshslicing.jpeg', videoId: 'ynZVK_XyaRc' },
    { id: 'cppRaytracer', image: '/assets/img/portfolio/raytracer.png', videoId: 'oMT4qSkk8t0' },
    { id: 'vrHorrorPrototype', image: '/assets/img/portfolio/horrorVRproject.jpeg', videoId: '2wMWHahEMK8' },
    { id: 'threeDGestureRecognition', image: '/assets/img/portfolio/elementbending.jpeg', videoId: '6Rnb6alUAG8' },
    { id: 'godotOculusPlatform', image: '/assets/img/portfolio/GodotOculusPlugin.png' }, // No video for this one
    { id: 'mrEarthViewer', image: '/assets/img/portfolio/earth.jpeg', videoId: 'CneYyg4q_gE' },
    { id: 'narakashur', image: '/assets/img/portfolio/narakashur.png' } // No video available (as noted in old site)
  ]

  return (
    <div style={container}  className='no-scrollbar'>
      <PortfolioGrid 
        items={portfolioItems} 
      />
    </div>
  )
}

export default PortfolioSection


