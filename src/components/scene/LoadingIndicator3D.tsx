import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

interface LoadingIndicator3DProps {
  position?: [number, number, number]
  visible?: boolean
}

export const LoadingIndicator3D = ({ 
  position = [0, 1.6, 0], 
  visible = true 
}: LoadingIndicator3DProps) => {
  const ring1Ref = useRef<THREE.Mesh>(null)
  const ring2Ref = useRef<THREE.Mesh>(null)
  const ring3Ref = useRef<THREE.Mesh>(null)

  // Randomize rotation directions and starting rotations for each ring
  const rotationData = useMemo(() => ({
    ring1: {
      direction: {
        x: Math.random() > 0.5 ? 1 : -1,
        y: Math.random() > 0.5 ? 1 : -1,
        z: Math.random() > 0.5 ? 1 : -1,
      },
      startRotation: {
        x: Math.random() * Math.PI * 2,
        y: Math.random() * Math.PI * 2,
        z: Math.random() * Math.PI * 2,
      },
    },
    ring2: {
      direction: {
        x: Math.random() > 0.5 ? 1 : -1,
        y: Math.random() > 0.5 ? 1 : -1,
        z: Math.random() > 0.5 ? 1 : -1,
      },
      startRotation: {
        x: Math.random() * Math.PI * 2,
        y: Math.random() * Math.PI * 2,
        z: Math.random() * Math.PI * 2,
      },
    },
    ring3: {
      direction: {
        x: Math.random() > 0.5 ? 1 : -1,
        y: Math.random() > 0.5 ? 1 : -1,
        z: Math.random() > 0.5 ? 1 : -1,
      },
      startRotation: {
        x: Math.random() * Math.PI * 2,
        y: Math.random() * Math.PI * 2,
        z: Math.random() * Math.PI * 2,
      },
    },
  }), [])

  // Set initial rotations
  useEffect(() => {
    if (ring1Ref.current) {
      ring1Ref.current.rotation.set(
        rotationData.ring1.startRotation.x,
        rotationData.ring1.startRotation.y,
        rotationData.ring1.startRotation.z
      )
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.set(
        rotationData.ring2.startRotation.x,
        rotationData.ring2.startRotation.y,
        rotationData.ring2.startRotation.z
      )
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.set(
        rotationData.ring3.startRotation.x,
        rotationData.ring3.startRotation.y,
        rotationData.ring3.startRotation.z
      )
    }
  }, [rotationData])

  // Create glass material matching SubtitleBox exactly
  const glassMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.9,
        roughness: 0.2,
        metalness: 0.0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.2,
        envMapIntensity: 0.2,
        side: THREE.DoubleSide,
      }),
    []
  )

  useFrame((_, delta) => {
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x += delta * 0.5 * rotationData.ring1.direction.x
      ring1Ref.current.rotation.y += delta * 0.3 * rotationData.ring1.direction.y
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.x += delta * 0.4 * rotationData.ring2.direction.x
      ring2Ref.current.rotation.z += delta * 0.5 * rotationData.ring2.direction.z
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.y += delta * 0.6 * rotationData.ring3.direction.y
      ring3Ref.current.rotation.z += delta * 0.3 * rotationData.ring3.direction.z
    }
  })

  if (!visible) return null

  return (
    <group position={position} rotation={[0, Math.PI, 0]}>
      {/* Ring 1 */}
      <mesh ref={ring1Ref}>
        <torusGeometry args={[0.3, 0.02, 16, 32]} />
        <meshPhysicalMaterial 
          color="#ffffff" 
          transparent
          opacity={0.4}
          roughness={0.2}
          metalness={0.0}
          clearcoat={1.0}
          clearcoatRoughness={0.2}
          envMapIntensity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Ring 2 */}
      <mesh ref={ring2Ref}>
        <torusGeometry args={[0.35, 0.015, 16, 32]} />
        <meshPhysicalMaterial 
          color="#ffffff" 
          transparent
          opacity={0.35}
          roughness={0.2}
          metalness={0.0}
          clearcoat={1.0}
          clearcoatRoughness={0.2}
          envMapIntensity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Ring 3 */}
      <mesh ref={ring3Ref}>
        <torusGeometry args={[0.4, 0.01, 16, 32]} />
        <meshPhysicalMaterial 
          color="#ffffff" 
          transparent
          opacity={0.3}
          roughness={0.2}
          metalness={0.0}
          clearcoat={1.0}
          clearcoatRoughness={0.2}
          envMapIntensity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Center point light */}
      <pointLight position={[0, 0, 0]} intensity={0.5} color="#ffffff" />
      
      {/* Loading text in center */}
      <Text
        position={[0, 0, 0.01]}
        fillOpacity={1}
        fontSize={0.08}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        textAlign="center"
        material={glassMaterial}
      >
        Loading
      </Text>
    </group>
  )
}