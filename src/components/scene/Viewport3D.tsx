import type { XRStore } from '@react-three/xr'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { supportsGaussianHead } from './avatar/gaussianSupport'
import { AvatarErrorBoundary } from './AvatarErrorBoundary'
import { GaussianHead } from './GaussianHead'

import { Scene3D } from './Scene3D'
import type { SceneConfig } from '../../app/sceneTypes'

interface Viewport3DProps {
  sceneConfig: SceneConfig
  setXRStore?: (store: XRStore) => void
  /** Passed to the Gaussian head: greet once loaded */
  greet?: boolean
  /** Passed to the Gaussian head: the line it greets with */
  greeting?: string
  /** Passed to the Gaussian head: draw captions over it */
  showSubtitle?: boolean
  /** Drop the framed card styling (when the parent already provides a frame) */
  bare?: boolean
  /** What to show if the Gaussian head can't run: the VRM avatar, or nothing at all */
  fallback?: 'vrm' | 'none'
  /** Passed to the Gaussian head: hide its loading bar */
  showLoading?: boolean
  /** The avatar loaded and is rendering */
  onAvatarReady?: () => void
  /** The avatar can't be shown (unsupported, failed to load, crashed) */
  onAvatarError?: () => void
}

const Viewport3DComponent = ({
  sceneConfig,
  setXRStore,
  greet,
  greeting,
  showSubtitle,
  bare = false,
  fallback = 'vrm',
  showLoading,
  onAvatarReady,
  onAvatarError
}: Viewport3DProps) => {
  const [gaussianFailed, setGaussianFailed] = useState(false)
  const supported = useMemo(() => supportsGaussianHead(), [])
  const wantsGaussian = sceneConfig.avatarType === 'gaussian'
  const useGaussian = wantsGaussian && !gaussianFailed && supported
  const showVrm = !useGaussian && (fallback === 'vrm' || !wantsGaussian)

  const onErrorRef = useRef(onAvatarError)
  onErrorRef.current = onAvatarError
  const handleGaussianError = useCallback(() => {
    setGaussianFailed(true)
    onErrorRef.current?.()
  }, [])

  // No WebGL2 at all: report it straight away
  useEffect(() => {
    if (wantsGaussian && !supported) onErrorRef.current?.()
  }, [wantsGaussian, supported])

  return (
    <div
      style={{
        flex: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        ...(!bare && {
          background: 'linear-gradient(180deg, #0C1418 0%, #17252A 100%)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: '16px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.07)'
        })
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: bare ? 'transparent' : '#1B1E20',
          position: 'relative'
        }}
        id="avatar-viewport"
      >
        {/* The R3F scene is only needed for the VRM avatar (and its AR mode) */}
        {showVrm && <Scene3D sceneConfig={sceneConfig} setXRStore={setXRStore} />}
        {useGaussian && (
          <AvatarErrorBoundary onError={handleGaussianError}>
            <GaussianHead
              avatarUrl={sceneConfig.gaussianAvatarUrl}
              onError={handleGaussianError}
              onReady={onAvatarReady}
              greet={greet}
              greeting={greeting}
              showSubtitle={showSubtitle}
              showLoading={showLoading}
            />
          </AvatarErrorBoundary>
        )}
      </div>
    </div>
  )
}

// Memoize the component to prevent re-renders when services don't change
export const Viewport3D = memo(Viewport3DComponent)
  