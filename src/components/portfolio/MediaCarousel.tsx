import { useState, type CSSProperties } from 'react'

const containerStyle: CSSProperties = {
  position: 'relative',
  width: '100%',
  borderRadius: '12px',
  overflow: 'hidden',
  background: 'rgba(0, 0, 0, 0.3)'
}

const mediaContainerStyle: CSSProperties = {
  width: '100%',
  aspectRatio: '16 / 9',
  position: 'relative'
}

const imageStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'contain'
}

const iframeStyle: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  border: 0
}

const navigationStyle: CSSProperties = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'rgba(0, 0, 0, 0.6)',
  border: 'none',
  borderRadius: '50%',
  width: '40px',
  height: '40px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'white',
  cursor: 'pointer',
  fontSize: '18px',
  transition: 'all 0.2s ease',
  zIndex: 10
}

const prevButtonStyle: CSSProperties = {
  ...navigationStyle,
  left: '12px'
}

const nextButtonStyle: CSSProperties = {
  ...navigationStyle,
  right: '12px'
}

const dotsContainerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  gap: '8px',
  padding: '12px 0',
  background: 'rgba(0, 0, 0, 0.3)'
}

const dotStyle: CSSProperties = {
  width: '8px',
  height: '8px',
  minWidth: '8px',
  minHeight: '8px',
  padding: 0,
  borderRadius: '50%',
  background: 'rgba(255, 255, 255, 0.4)',
  border: 'none',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  boxSizing: 'border-box'
}

const activeDotStyle: CSSProperties = {
  ...dotStyle,
  background: 'rgba(30, 136, 229, 0.9)',
  transform: 'scale(1.2)'
}

const playButtonOverlayStyle: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0, 0, 0, 0.4)',
  cursor: 'pointer',
  transition: 'all 0.2s ease'
}

const playButtonStyle: CSSProperties = {
  width: '64px',
  height: '64px',
  borderRadius: '50%',
  background: 'rgba(255, 255, 255, 0.9)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '24px',
  color: '#333',
  transition: 'all 0.2s ease'
}

interface MediaItem {
  type: 'image' | 'video'
  src: string
  videoId?: string
}

// A video is a YouTube id, or a path/URL to a video file we host ("/assets/video/x.mp4")
const isVideoFile = (video: string) => video.startsWith('/') || /^https?:\/\//.test(video)
const youtubeThumbnail = (id: string) => `https://img.youtube.com/vi/${id}/maxresdefault.jpg`

interface MediaCarouselProps {
  mainImage?: string
  videoId?: string   // YouTube id or video file path
  videos?: string[]  // Additional videos, same format
  gallery?: string[]
  title: string
}

export const MediaCarousel = ({ mainImage, videoId, videos = [], gallery = [], title }: MediaCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showVideo, setShowVideo] = useState(false)

  // Build media items array
  const mediaItems: MediaItem[] = []
  
  // Main video first (with thumbnail - use YouTube thumbnail if no custom image)
  if (videoId) {
    const thumbnail = mainImage || (isVideoFile(videoId) ? '' : youtubeThumbnail(videoId))
    mediaItems.push({ type: 'video', src: thumbnail, videoId })
  } else if (mainImage) {
    mediaItems.push({ type: 'image', src: mainImage })
  }
  
  // Add additional videos
  videos.forEach(vid => {
    mediaItems.push({ type: 'video', src: isVideoFile(vid) ? '' : youtubeThumbnail(vid), videoId: vid })
  })
  
  // Add gallery images
  gallery.forEach(img => {
    mediaItems.push({ type: 'image', src: img })
  })

  if (mediaItems.length === 0) {
    return null
  }

  const currentItem = mediaItems[currentIndex]
  const hasMultiple = mediaItems.length > 1

  const goToPrev = () => {
    setCurrentIndex(prev => (prev === 0 ? mediaItems.length - 1 : prev - 1))
    setShowVideo(false)
  }

  const goToNext = () => {
    setCurrentIndex(prev => (prev === mediaItems.length - 1 ? 0 : prev + 1))
    setShowVideo(false)
  }

  const handlePlayVideo = () => {
    setShowVideo(true)
  }

  return (
    <div style={containerStyle}>
      <div style={mediaContainerStyle}>
        {currentItem.type === 'video' && isVideoFile(currentItem.videoId!) && (showVideo || !currentItem.src) ? (
          // Without a thumbnail the player itself is the poster; nothing downloads until it's played
          <video
            style={iframeStyle}
            src={currentItem.videoId}
            poster={currentItem.src || undefined}
            controls
            autoPlay={showVideo}
            preload="none"
            playsInline
          />
        ) : currentItem.type === 'video' && showVideo ? (
          <iframe
            style={iframeStyle}
            src={`https://www.youtube.com/embed/${currentItem.videoId}?autoplay=1&modestbranding=1&rel=0`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : currentItem.type === 'video' && currentItem.src ? (
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <img src={currentItem.src} alt={title} style={imageStyle} />
            <div 
              style={playButtonOverlayStyle}
              onClick={handlePlayVideo}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.4)'
              }}
            >
              <div style={playButtonStyle}>▶</div>
            </div>
          </div>
        ) : (
          <img src={currentItem.src} alt={title} style={imageStyle} />
        )}

        {hasMultiple && (
          <>
            <button
              style={prevButtonStyle}
              onClick={goToPrev}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(30, 136, 229, 0.8)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)'
              }}
            >
              ‹
            </button>
            <button
              style={nextButtonStyle}
              onClick={goToNext}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(30, 136, 229, 0.8)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)'
              }}
            >
              ›
            </button>
          </>
        )}
      </div>

      {hasMultiple && (
        <div style={dotsContainerStyle}>
          {mediaItems.map((_, index) => (
            <button
              key={index}
              style={index === currentIndex ? activeDotStyle : dotStyle}
              onClick={() => {
                setCurrentIndex(index)
                setShowVideo(false)
              }}
              onMouseEnter={(e) => {
                if (index !== currentIndex) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.6)'
                }
              }}
              onMouseLeave={(e) => {
                if (index !== currentIndex) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.4)'
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default MediaCarousel
