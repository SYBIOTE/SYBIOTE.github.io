import { Text, Line } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Vector3 } from 'three'

// Helper function to create a rounded rectangle shape
const createRoundedRectShape = (width: number, height: number, radius: number) => {
  const shape = new THREE.Shape()
  const x = -width / 2
  const y = -height / 2
  
  shape.moveTo(x + radius, y)
  shape.lineTo(x + width - radius, y)
  shape.quadraticCurveTo(x + width, y, x + width, y + radius)
  shape.lineTo(x + width, y + height - radius)
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  shape.lineTo(x + radius, y + height)
  shape.quadraticCurveTo(x, y + height, x, y + height - radius)
  shape.lineTo(x, y + radius)
  shape.quadraticCurveTo(x, y, x + radius, y)
  
  return shape
}

// Helper to generate polyline points for a rounded rectangle border
const generateRoundedRectPoints = (
  width: number,
  height: number,
  radius: number,
  segmentsPerCorner: number = 12,
): [number, number, number][] => {
  const points: [number, number, number][] = []
  const x = -width / 2
  const y = -height / 2

  const addArc = (cx: number, cy: number, startAngle: number, endAngle: number) => {
    for (let i = 0; i <= segmentsPerCorner; i++) {
      const t = i / segmentsPerCorner
      const angle = startAngle + t * (endAngle - startAngle)
      const px = cx + Math.cos(angle) * radius
      const py = cy + Math.sin(angle) * radius
      points.push([px, py, 0.02])
    }
  }

  // Start at bottom-left inner corner tangent point
  points.push([x + radius, y, 0.02])
  // Bottom edge to bottom-right tangent
  points.push([x + width - radius, y, 0.02])
  // Bottom-right corner (270° -> 360°)
  addArc(x + width - radius, y + radius, -Math.PI / 2, 0)
  // Right edge to top-right tangent
  points.push([x + width, y + height - radius, 0.02])
  // Top-right corner (0° -> 90°)
  addArc(x + width - radius, y + height - radius, 0, Math.PI / 2)
  // Top edge to top-left tangent
  points.push([x + radius, y + height, 0.02])
  // Top-left corner (90° -> 180°)
  addArc(x + radius, y + height - radius, Math.PI / 2, Math.PI)
  // Left edge to bottom-left tangent
  points.push([x, y + radius, 0.02])
  // Bottom-left corner (180° -> 270°)
  addArc(x + radius, y + radius, Math.PI, (3 * Math.PI) / 2)

  // Close the loop by returning to the first point
  points.push([x + radius, y, 0.02])

  return points
}

interface SubtitleBoxProps {
  position: [number, number, number]   // 3D position of the box in space
  offset?: [number, number, number]    // Optional offset applied to the position
  message: string                      // Subtitle text
  visible: boolean                     // Whether the box is shown
}

const SubtitleBox = ({ position, offset = [0, 0, 0], message, visible }: SubtitleBoxProps) => {
  const [displayedText, setDisplayedText] = useState('')
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [isTyping, setIsTyping] = useState(false)
  const [previousMessage, setPreviousMessage] = useState('')
  
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const textRef = useRef<{ geometry?: { boundingBox?: { max?: { x: number; y: number } } } }>(null)
  
  // Animation timing
  const typingSpeed = 200 // ms per word
  const maxHeight = 0.1 // Maximum height before reset
  const maxWidth = 0.5
  const cornerRadius = 0.05
  const floatAmplitude = 0.005
  const floatSpeed = 1
  
  // Animation state
  const lastUpdateTime = useRef(0)
  const wordsRef = useRef<string[]>([])
  const groupWorldPos = useRef(new Vector3())
  const floatRef = useRef<THREE.Group>(null)
  
  const { camera } = useThree()
  
  // Precompute rounded border points
  const borderPoints = useMemo(
    () => generateRoundedRectPoints(maxWidth, maxHeight * 1.2, cornerRadius, 18),
    [maxWidth, maxHeight, cornerRadius]
  )
  const innerBorderPoints = useMemo(
    () => generateRoundedRectPoints(maxWidth * 0.96, maxHeight * 1.2 * 0.96, Math.max(cornerRadius * 0.96, 0.001), 18),
    [maxWidth, maxHeight, cornerRadius]
  )
  
  // Distance-based scaling configuration
  const baseYOffset = 0.1
  const baselineDistance = 1.5
  const minScale = 1.0
  const maxScale = 100
  const scaleLerp = 0.12
  const currentScaleRef = useRef(1)

  // Box fade in/out configuration
  const basePanelOpacity = 0.06
  const baseBorderOpacity = 0.15
  const baseInnerBorderOpacity = 0.08
  const holdoutMs = 1200
  const fadeInLerp = 0.2
  const fadeOutLerp = 0.08
  const [boxOpacity, setBoxOpacity] = useState(0)
  const targetOpacityRef = useRef(0)
  const holdoutUntilRef = useRef<number | null>(null)
  
  // Check if new message is a continuation of the previous one
  const isContinuation = (newMsg: string, oldMsg: string) => {
    return oldMsg && newMsg.startsWith(oldMsg)
  }
  
  // Reset text stream
  const resetText = () => {
    setDisplayedText('')
    setCurrentWordIndex(0)
    setIsTyping(false)
    lastUpdateTime.current = 0
  }
  
  // Handle new message
  useEffect(() => {
    if (!visible || !message) {
      resetText()
      targetOpacityRef.current = 0
      return
    }
    message = message.endsWith('...') ? message.slice(0, -3) : message
    // Check if this is a continuation
    if (isContinuation(message, previousMessage)) {
      // Continue from where we left off
      const newWords = message.slice(previousMessage.length).trim().split(' ')
      if (newWords.length > 0 && newWords[0] && !isTyping) {
        setCurrentWordIndex(previousMessage.split(' ').length)
      }
    } else {
      // Reset and start new message
      resetText()
    }
    
    // Store words in ref to avoid recreation per frame
    wordsRef.current = message.split(' ')
    setIsTyping(true)
    targetOpacityRef.current = 1
    holdoutUntilRef.current = null
    setPreviousMessage(message)
  }, [message, visible, previousMessage])
  
  // Word stream animation using useFrame
  useFrame(() => {
    if (!isTyping || !message) return
    
    const currentTime = performance.now()
    const elapsedTime = currentTime - lastUpdateTime.current
    if (elapsedTime >= typingSpeed) {
      if (currentWordIndex < wordsRef.current.length) {
        // Add the next word to the displayed text
        const nextWord = wordsRef.current[currentWordIndex]
        setDisplayedText(prev => prev + (prev ? ' ' : '') + nextWord)
        setCurrentWordIndex(prev => prev + 1)
      } else {
        setIsTyping(false)
        // Start holdout countdown once full message is shown
        if (!holdoutUntilRef.current) {
          holdoutUntilRef.current = performance.now() + holdoutMs
        }
      }
      
      lastUpdateTime.current = currentTime
    }
  })
  
  // Yaw billboard the group toward the camera (face camera around Y axis) and add subtle float
  // Also scale panel and push it forward/up slightly as camera moves away
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.getWorldPosition(groupWorldPos.current)
      const dx = camera.position.x - groupWorldPos.current.x
      const dz = camera.position.z - groupWorldPos.current.z
      groupRef.current.rotation.y = Math.atan2(dx, dz)
    }
    if (floatRef.current) {
      // Compute target scale based on camera distance
      const camDistance = camera.position.distanceTo(groupWorldPos.current)
      const targetScale = THREE.MathUtils.clamp(camDistance / baselineDistance, minScale, maxScale)
      currentScaleRef.current = THREE.MathUtils.lerp(currentScaleRef.current, targetScale, scaleLerp)

      // Apply scale to floating group (uniform XY scaling)
      floatRef.current.scale.set(currentScaleRef.current, currentScaleRef.current, 1)

      // Offset up based on scale to avoid avatar clipping
      const yLift = baseYOffset * (currentScaleRef.current - 1)

      floatRef.current.position.y = yLift + Math.sin(state.clock.elapsedTime * floatSpeed) * floatAmplitude
    }

    // Handle fade in/out
    const now = performance.now()
    if (!isTyping && holdoutUntilRef.current && now >= holdoutUntilRef.current) {
      targetOpacityRef.current = 0
    }
    const lerpRate = targetOpacityRef.current > boxOpacity ? fadeInLerp : fadeOutLerp
    const nextOpacity = THREE.MathUtils.lerp(boxOpacity, targetOpacityRef.current, lerpRate)
    
    if (Math.abs(nextOpacity - boxOpacity) > 0.001) {
      setBoxOpacity(nextOpacity)
    }
  })
  
  // Check for text overflow and reset if needed
  const handleTextOverflow = (text: any) => {
    const height = text.geometry.boundingBox.max.y - text.geometry.boundingBox.min.y
    if (height > maxHeight) {
      setDisplayedText('')
    }
  }
  
  if (!visible) return null
  
  const finalPosition: [number, number, number] = [
    position[0] + offset[0],
    position[1] + offset[1],
    position[2] + offset[2]
  ]
  
  return (
    <group ref={groupRef} position={finalPosition}>
      <group ref={floatRef}>
        {/* Main glass panel */}
        <mesh ref={meshRef} position={[0, 0, 0.01]}>
          <shapeGeometry args={[createRoundedRectShape(maxWidth, maxHeight * 1.2, cornerRadius)]} />
          <meshPhysicalMaterial
            color="#ffffff"
            transparent
            opacity={basePanelOpacity * boxOpacity}
            roughness={0.2}
            metalness={0.0}
            clearcoat={1.0}
            clearcoatRoughness={0.2}
            envMapIntensity={0.2}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Soft shadow layer behind panel */}
        <mesh position={[0, -0.002, -0.005]}>
          <shapeGeometry args={[createRoundedRectShape(maxWidth * 0.98, maxHeight * 1.2 * 0.98, Math.max(cornerRadius * 0.98, 0.001))]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.08 * boxOpacity} side={THREE.DoubleSide} />
        </mesh>
        
        {/* Border outline following rounded rectangle */}
        <Line
          points={borderPoints}
          color="#ffffff"
          lineWidth={1}
          transparent
          opacity={baseBorderOpacity * boxOpacity}
          dashed={false}
        />
        {/* Inner subtle border stroke */}
        <Line
          points={innerBorderPoints}
          color="#ffffff"
          lineWidth={1}
          transparent
          opacity={baseInnerBorderOpacity * boxOpacity}
          dashed={false}
        />
        
        <Text
          ref={textRef}
          position={[0, 0, 0.01]}
          fillOpacity={boxOpacity}
          fontSize={0.02}
          color="#ffffff"
          anchorX="center"
          anchorY='middle'
          maxWidth={maxWidth * 0.8}
          textAlign="center"
          onSync={handleTextOverflow}
        >
          {displayedText}
        </Text>
      </group>
    </group>
  )
}

export default memo(SubtitleBox)
