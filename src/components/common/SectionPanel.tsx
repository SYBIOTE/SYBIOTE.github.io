import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

interface SectionPanelProps {
  open: boolean
  title?: string
  onClose: () => void
  children?: ReactNode
  titleIcon?: ReactNode
  widthPercent?: number
  heightPercent?: number
  anchorSelector?: string
  fitContent?: boolean
}

export const SectionPanel = ({
  open,
  title,
  onClose,
  children,
  titleIcon,
  widthPercent = 30,
  heightPercent = 70,
  anchorSelector = '#app-viewport'
}: SectionPanelProps) => {
  const [visible, setVisible] = useState<boolean>(false)
  const [mounted, setMounted] = useState<boolean>(false)
  const closeTimer = useRef<number | null>(null)
  const [anchorRect, setAnchorRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null)
  const contentMeasureRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setMounted(true)
      // Allow next tick for transition
      requestAnimationFrame(() => setVisible(true))
    } else if (mounted) {
      // Animate out if mounted but not open
      setVisible(false)
      closeTimer.current = window.setTimeout(() => setMounted(false), 300)
      return () => {
        if (closeTimer.current) window.clearTimeout(closeTimer.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!mounted) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleRequestClose()
      }
    }
    window.addEventListener('keydown', onKey)

    const updateAnchorRect = () => {
      if (typeof document === 'undefined') return
      const el = document.querySelector(anchorSelector) as HTMLElement | null
      if (el) {
        const r = el.getBoundingClientRect()
        setAnchorRect({ top: r.top, left: r.left, width: r.width, height: r.height })
      } else {
        setAnchorRect({ top: 0, left: 0, width: window.innerWidth, height: window.innerHeight })
      }
    }
    updateAnchorRect()
    window.addEventListener('resize', updateAnchorRect)
    window.addEventListener('scroll', updateAnchorRect, true)

    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', updateAnchorRect)
      window.removeEventListener('scroll', updateAnchorRect, true)
    }
  }, [mounted, anchorSelector])

  // Recompute panel height to fit content

  const handleRequestClose = () => {
    setVisible(false)
    // Delay actual close to allow animation
    window.setTimeout(() => onClose(), 400)
  }

  if (!mounted) return null

  const panelNode = (
    <div
      role="dialog"
      aria-label={title ?? 'Section panel'}
      style={{
        position: 'fixed',
        top: anchorRect ? `${anchorRect.top}px` : 0,
        left: anchorRect ? `${anchorRect.left}px` : 0,
        width: anchorRect ? `${anchorRect.width}px` : '100vw',
        height: anchorRect ? `${anchorRect.height}px` : '100vh',
        zIndex: 10000,
        // Let clicks pass through except on the drawer itself
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: "2%",
          right: '0rem',
          height: `${Math.max(50, Math.min(100, heightPercent))}%`,
          width: `${Math.max(40, Math.min(100, widthPercent))}%`,
          maxWidth: '700px',
          minWidth: '360px',
          padding: '0.5rem',
          borderTopLeftRadius: '24px',
          borderBottomLeftRadius: '24px',
          boxShadow: '0 20px 80px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(255,255,255,0.05)',
          backdropFilter: 'blur(5px)',
          WebkitBackdropFilter: 'blur(5px)',
          transform: visible ? 'translateX(0) scale(1)' : 'translateX(110%) scale(0.9)',
          opacity: visible ? 1 : 0,
          transition: 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          boxSizing: 'border-box',
          // Drawer receives interactions
          pointerEvents: 'auto',
          // Remove background from main container
          background: 'transparent',
        }}
        className="no-scrollbar"
      >
        {/* Blue gradient background layer */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderTopLeftRadius: '24px',
            borderBottomLeftRadius: '24px',
            // Blue gradient effect from right to left, capped at 20% - shows when panel is open
            background: visible 
              ? 'linear-gradient(270deg, rgba(30,136,229,0.08) 0%, rgba(30,136,229,0.01) 10%, transparent 20%)'
              : 'transparent',
            transition: 'background 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            transitionDelay: visible ? '0.2s' : '0s',
            pointerEvents: 'none', // Allow clicks to pass through
            zIndex: -1, // Place behind content
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexDirection: 'row',
            padding: '0 0.75rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.79)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderTopLeftRadius: '24px',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0) scale(1)' : 'translateY(-30px) scale(0.95)',
            transition: 'all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            transitionDelay: visible ? '0.3s' : '0s'
          }}
          className="no-scrollbar"
        >
       
          <button
            onClick={handleRequestClose}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '9999px',
              transition: 'color 0.3s ease',
              minWidth: '32px',
              minHeight: '32px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#fff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#fff'
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18"/>
              <path d="M6 6L18 18"/>
            </svg>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}  
>
            {titleIcon && <div style={{ display: 'flex', alignItems: 'center' }}>{titleIcon}</div>}
            <div style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 600, letterSpacing: 0.2 }}>{title}</div>
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            top: '3.25rem',
            left: 0,
            right: 0,
            bottom: 0,
            borderBottomLeftRadius: '24px',
            borderBottomRightRadius: '0',
            overflow: 'hidden',
            backdropFilter: 'blur(16px) saturate(140%)',
            WebkitBackdropFilter: 'blur(16px) saturate(140%)',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.95)',
            transition: 'all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            transitionDelay: visible ? '0.4s' : '0s'
          }}
        >
          <div ref={contentMeasureRef} style={{ width: '100%', height: '100%', overflowY: 'auto', overflowX: 'hidden' }} className="no-scrollbar">
            {children}
          </div>
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(panelNode, document.body) : panelNode
}

export default SectionPanel


