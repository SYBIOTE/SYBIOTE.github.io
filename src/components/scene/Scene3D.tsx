import { Environment, OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { createXRStore, XR, type XRStore } from '@react-three/xr'
import { memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

import type { SceneConfig } from '../../app/sceneTypes'
import { AvatarModel } from './avatar/AvatarModel'
import SubtitleBox from './SubtitleBox3d'
import { LoadingIndicator3D } from './LoadingIndicator3D'
import { useAgentContext, useAgentState } from './avatar/AgentContext'

interface Scene3DProps {
  sceneConfig: SceneConfig
  setXRStore?: (store: XRStore) => void
}

const SceneContent = ({
  sceneConfig,
  store
}: Scene3DProps & { store: XRStore }) => {
  const controlsRef = useRef<any>(null)
  const { camera } = useThree()
  const [camTarget, setCamTarget] = useState<[number, number, number]>(sceneConfig.cameraTarget)
  const [camPos, setCamPos] = useState<[number, number, number]>(sceneConfig.cameraPosition)
  const {  llmThinking, currentSubtitle } = useAgentState() // Get from context instead of props


  console.log('DEBUG:Scene3D', llmThinking, currentSubtitle)
  const subtitleMessage = llmThinking ? 'Thinking ......' : (currentSubtitle || '')

  useEffect(() => {
    camera.position.set(camPos[0], camPos[1], camPos[2])
    camera.lookAt(new THREE.Vector3(camTarget[0], camTarget[1], camTarget[2]))
    if (controlsRef.current) {
      controlsRef.current.target.set(camTarget[0], camTarget[1], camTarget[2])
      controlsRef.current.update()
    }
  }, [camPos, camTarget, camera])

  const handleHeadLocated = useCallback(
    (target: [number, number, number], position: [number, number, number]) => {
      setCamTarget(target)
      setCamPos(position)
    },
    [setCamTarget, setCamPos]
  )

  return (
    <XR store={store}>
      {/* Camera setup */}
      
      <OrbitControls
        ref={controlsRef}
        target={camTarget}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={1}
        maxDistance={10}
      />

      {/* Lighting */}
      {sceneConfig.roomLighting && (
        <>
          <ambientLight intensity={0.3} color={0xffffff} />
          <directionalLight position={[1, 1, 1]} intensity={0.8} color={0xffffff} castShadow />
        </>
      )}

      {/* Environment */}
      <Environment preset="studio" />

      <Suspense fallback={<LoadingIndicator3D position={camTarget} visible={true} />}>

      {/* Avatar with external animations */}
      <AvatarModel
        onHeadLocated={handleHeadLocated}
      />

      {/* Subtitle Box positioned in front of avatar */}
     {<SubtitleBox
        position={camTarget}
        offset={[0, .3, 0]}
        message={subtitleMessage}
        visible={true}
      />}
      </Suspense>

      {/* Ground plane */}
      {/* <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#2A2A2A" />
      </mesh> */}
    </XR>
  )
}

const Scene3DComponent = ({ sceneConfig, setXRStore }: Scene3DProps) => {
  const store = useMemo(() => createXRStore(), [])
  
  console.log('Scene3DComponent')

  useEffect(() => {
    if (setXRStore) {
      setXRStore(store)
    }
  }, [setXRStore, store])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Avatar Controls Component */}{' '}
      {/*<AvatarControls
        isVisible={true}
        onToggleVisibility={() => {}}
      />*/}
      {/* Canvas */}
      <Canvas camera={{ position: [0, 1.6, 3], fov: 50 }} style={{ background: 'transparent' }} shadows>
        <SceneContent
          sceneConfig={sceneConfig}
          store={store}
        />
      </Canvas>
    </div>
  )
}

// Memoize the component to prevent re-renders when services don't change
export const Scene3D = memo(Scene3DComponent)
