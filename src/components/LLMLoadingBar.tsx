import { useEffect, useMemo, useRef, useState } from 'react'
import { Tooltip } from './common/Tooltip'
import type { LLMStatusUpdate } from '../services/llm/llmTypes'

type Status = 'idle' | 'loading' | 'ready' | 'error'

type Props = {
  statusText?: LLMStatusUpdate['text']
  statusColor?: LLMStatusUpdate['color']
  visible: boolean
}

export const LLMLoadingBar = ({ statusText = 'Loading local model…', statusColor = 'loading', visible }: Props) => {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<Status>('idle')
  const [isVisible, setIsVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [fadingOut, setFadingOut] = useState(false)
  const fadeTimerRef = useRef<number | null>(null)
  const fadeOutTimerRef = useRef<number | null>(null)

  const parseProgressFromStatus = (text: string): number | null => {
    if (!text) return null
    // Explicit finish lines
    if (/finish loading/i.test(text)) return 100
    // Prefer explicit percentage if present
    const percentMatches = text.match(/(\d{1,3})\s*%/g)
    let percentVal: number | null = null
    if (percentMatches && percentMatches.length) {
      const last = percentMatches[percentMatches.length - 1]
      const val = parseInt(last.replace(/[^0-9]/g, ''), 10)
      if (!Number.isNaN(val)) percentVal = Math.max(0, Math.min(val, 100))
    }

    // Also parse step fraction like [6/42]
    const fracMatch = text.match(/\[(\d+)\s*\/\s*(\d+)\]/)
    let fracPct: number | null = null
    if (fracMatch) {
      const current = parseInt(fracMatch[1], 10)
      const total = parseInt(fracMatch[2], 10)
      if (total > 0) {
        fracPct = Math.round((current / total) * 100)
      }
    }

    if (percentVal === null && fracPct === null) return null
    return Math.max(percentVal ?? 0, fracPct ?? 0)
  }

  type Phase = 'fetch' | 'cache' | 'shaders' | 'finish' | 'other'
  const detectPhase = (text: string): Phase => {
    const lower = text.toLowerCase()
    if (/finish loading/.test(lower)) return 'finish'
    if (/gpu shader modules/.test(lower)) return 'shaders'
    if (/loading model from cache/.test(lower)) return 'cache'
    if (/fetch params|fetching param cache/.test(lower)) return 'fetch'
    return 'other'
  }

  const computeOverallProgress = (text: string): number | null => {
    const phase = detectPhase(text)
    if (phase === 'finish') return 100

    // Per-phase percentage (0-100)
    const phasePct = parseProgressFromStatus(text)
    // Phase ranges across the overall bar
    const ranges: Record<Exclude<Phase, 'finish' | 'other'>, { start: number; end: number }> = {
      fetch: { start: 0, end: 40 },
      cache: { start: 40, end: 85 },
      shaders: { start: 85, end: 100 }
    }

    if (phase === 'other') return null
    if (phasePct == null) {
      // If we recognize the phase but no percent, return the phase start
      if (phase in ranges) return (ranges as any)[phase].start
      return null
    }

    const range = (ranges as any)[phase] as { start: number; end: number }
    const span = range.end - range.start
    const overall = Math.round(range.start + (span * phasePct) / 100)
    return Math.max(0, Math.min(overall, 100))
  }

  const tooltipText = useMemo(() => {
    if (status === 'idle') return 'Initializing'
    if (status === 'ready') return 'Local model ready'
    if (status === 'error') return 'Failed to load model'

    const overall = Math.max(0, Math.min(100, Math.round(progress)))
    return `Loading local LLM ${overall}%`
  }, [status, progress])

  // Derive status from color prop
  useEffect(() => {
    if (!visible) {
      setIsVisible(false)
      setStatus('idle')
      setProgress(0)
      setDismissed(false)
      setFadingOut(false)
      return
    }

    setIsVisible(true)
    if (statusColor === 'loading') setStatus('loading')
    if (statusColor === 'ready') setStatus('ready')
    if (statusColor === 'error') setStatus('error')
  }, [visible, statusColor])

  // Drive progress from provided status text while loading, across phases
  useEffect(() => {
    if (status !== 'loading') return
    const overall = computeOverallProgress(statusText)
    if (overall !== null) {
      // Avoid regressions; honor 0–100%
      setProgress((prev) => Math.min(Math.max(prev, overall), 100))
    }
  }, [status, statusText])

  // On success/error, fill to 100% and persist; if no interaction for 5s, fade away
  useEffect(() => {
    if (status === 'ready' || status === 'error') {
      setProgress(100)
      // Clear existing timers
      if (fadeTimerRef.current) {
        window.clearTimeout(fadeTimerRef.current)
        fadeTimerRef.current = null
      }
      if (fadeOutTimerRef.current) {
        window.clearTimeout(fadeOutTimerRef.current)
        fadeOutTimerRef.current = null
      }
      if (!dismissed) {
        fadeTimerRef.current = window.setTimeout(() => {
          setFadingOut(true)
          fadeOutTimerRef.current = window.setTimeout(() => {
            setDismissed(true)
            setFadingOut(false)
          }, 400)
        }, 5000)
      }
    }
    return () => {
      if (fadeTimerRef.current) {
        window.clearTimeout(fadeTimerRef.current)
        fadeTimerRef.current = null
      }
      if (fadeOutTimerRef.current) {
        window.clearTimeout(fadeOutTimerRef.current)
        fadeOutTimerRef.current = null
      }
    }
  }, [status])

  // Reset dismissal when loading starts again
  useEffect(() => {
    if (status === 'loading') {
      setDismissed(false)
      setFadingOut(false)
      if (fadeTimerRef.current) {
        window.clearTimeout(fadeTimerRef.current)
        fadeTimerRef.current = null
      }
      if (fadeOutTimerRef.current) {
        window.clearTimeout(fadeOutTimerRef.current)
        fadeOutTimerRef.current = null
      }
    }
  }, [status])

  const color = useMemo(() => {
    if (status === 'error') return 'rgba(239, 68, 68, 0.9)'
    if (status === 'ready') return 'rgba(34, 197, 94, 0.9)'
    return 'rgba(225, 225, 225, 0.2)'
  }, [status])

  if (!isVisible) return null
  if (dismissed && (status === 'ready' || status === 'error')) return null

  return (
    <div
      onClick={() => {
        if (status === 'ready' || status === 'error') {
          if (fadeTimerRef.current) {
            window.clearTimeout(fadeTimerRef.current)
            fadeTimerRef.current = null
          }
          if (fadeOutTimerRef.current) {
            window.clearTimeout(fadeOutTimerRef.current)
            fadeOutTimerRef.current = null
          }
          setDismissed(true)
        }
      }}
      style={{
        position: 'absolute',
        top: '12px',
        left: '12px',
        zIndex: 10000,
        cursor: status === 'ready' || status === 'error' ? 'pointer' : 'default'
      }}
    >
      <Tooltip content={tooltipText} position="right" delay={300}>
        {(() => {
          const size = 44
          const strokeWidth = 4
          const radius = (size - strokeWidth) / 2
          const circumference = 2 * Math.PI * radius
          const dashOffset = circumference * (1 - Math.max(0, Math.min(progress, 100)) / 100)

          const containerBg =
            status === 'ready'
              ? 'rgba(34,197,94,0.12)'
              : status === 'error'
              ? 'rgba(239,68,68,0.12)'
              : 'rgba(255,255,255,0.06)'

          const containerBorder =
            status === 'ready'
              ? '1px solid rgba(34,197,94,0.3)'
              : status === 'error'
              ? '1px solid rgba(239,68,68,0.3)'
              : '1px solid rgba(255,255,255,0.15)'

          const containerShadow =
            status === 'ready'
              ? '0 0.125rem 0.5rem rgba(34,197,94,0.25)'
              : status === 'error'
              ? '0 0.125rem 0.5rem rgba(239,68,68,0.25)'
              : '0 0.125rem 0.5rem rgba(244,244,244,0.12)'

          return (
            <div
              style={{
                position: 'relative',
                width: `${size}px`,
                height: `${size}px`,
                background: containerBg,
                border: containerBorder,
                borderRadius: '9999px',
                overflow: 'hidden',
                boxShadow: containerShadow,
                backdropFilter: 'blur(12px)',
                transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                opacity: fadingOut ? 0 : (status === 'ready' || status === 'error' ? 0.7 : 1),
                display: 'grid',
                placeItems: 'center'
              }}
            >
              <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                style={{ display: 'block' }}
              >
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth={strokeWidth}
                />
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={color}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              </svg>
              {(status === 'ready' || status === 'error') && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'grid',
                    placeItems: 'center',
                    pointerEvents: 'none'
                  }}
                >
                  {status === 'ready' ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke="rgba(34,197,94,1)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2l10 18H2L12 2z" stroke="rgba(239,68,68,1)" strokeWidth="2" fill="rgba(239,68,68,0.1)" />
                      <path d="M12 8v6" stroke="rgba(239,68,68,1)" strokeWidth="2" strokeLinecap="round" />
                      <circle cx="12" cy="17" r="1.25" fill="rgba(239,68,68,1)" />
                    </svg>
                  )}
                </div>
              )}
            </div>
          )
        })()}
      </Tooltip>
    </div>
  )
}

export default LLMLoadingBar


