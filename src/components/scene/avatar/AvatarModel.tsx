import { createSimpleStore, useSimpleStore } from '@hexafield/simple-store/react'
import { VRM, VRMCore, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm'
import { createVRMAnimationClip, VRMAnimation, VRMAnimationLoaderPlugin } from '@pixiv/three-vrm-animation'
import { useAnimations, useGLTF } from '@react-three/drei'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/Addons.js'
import type { GLTFParser } from 'three/examples/jsm/Addons.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { loadMixamoAnimation } from '../../../utils/animationUtil'
import { AvatarOptions } from './AvatarOptions'
import { AnimationAction, Vector3 } from 'three'
import  {ANIMATION_CLIPS, getRandomClip, updateAnimationDurations } from '../../../services/animation/config/animationClips'
import type { AnimationClip } from '../../../services/animation/animationTypes'
import debounce from 'lodash/debounce'
import { useAgentActions, useAgentServices, useAgentState } from './AgentContext'

const AVATAR_MODEL = AvatarOptions.Rahul

export const AvatarState = createSimpleStore({
  selectedModel: AVATAR_MODEL,
  visemesEnabled: true,
  emotesEnabled: true,
  animationsEnabled: true,
  isModelLoaded: false,
})

interface AvatarModelProps {
  onHeadLocated?: (target: [number, number, number], position: [number, number, number]) => void
}

// Helper function to detect Mixamo rig (optimized with early exit)
const detectMixamoRig = (fbxAsset: THREE.Group): boolean => {
  // Quick check: traverse with early exit
  let hasMixamoRig = false
  fbxAsset.traverse((child) => {
    if (hasMixamoRig) return // Early exit optimization
    if (child.name?.startsWith('mixamorig')) {
      hasMixamoRig = true
    }
  })
  
  // If not found in scene, check animations
  if (!hasMixamoRig && fbxAsset.animations?.length) {
    hasMixamoRig = fbxAsset.animations.some((anim) => 
      anim.name.includes('mixamo.com') || 
      anim.tracks.some((track) => track.name.startsWith('mixamorig'))
    )
  }
  
  return hasMixamoRig
}

// Helper function to process VRMA track names
const processVRMATracks = (clip: THREE.AnimationClip): THREE.AnimationClip => {
  clip.tracks = clip.tracks.filter((track) => {
    if (track.name.startsWith('Normalized_')) {
      track.name = track.name.replace(/^Normalized_/, '')
    }
    const lower = track.name.toLowerCase()
    // Filter out neck and head tracks
    return !lower.includes('neck') && !lower.includes('head')
  })
  return clip
}

// Custom hook to load external animation files, including VRMA animations
// eslint-disable-next-line react-refresh/only-export-components
export const useExternalAnimations = (avatarRef: React.RefObject<THREE.Object3D>, vrm?: VRMCore) => {
  // Memoize clip filtering to avoid recreating arrays on every render
  const { vrmaClips, fbxClips, gltfClips } = useMemo(() => {
    const allClips = Object.values(ANIMATION_CLIPS)
    return {
      vrmaClips: allClips.filter((c) => c.path.toLowerCase().endsWith('.vrma')),
      fbxClips: allClips.filter((c) => c.path.toLowerCase().endsWith('.fbx')),
      gltfClips: allClips.filter((c) => 
        !c.path.toLowerCase().endsWith('.vrma') && !c.path.toLowerCase().endsWith('.fbx')
      )
    }
  }, [])

  // Load VRMA animations
  const vrmaGLTFs = vrmaClips.map((clip) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useLoader(GLTFLoader, clip.path, (loader) => {
      loader.register((parser: GLTFParser) => new VRMAnimationLoaderPlugin(parser))
    })
  )

  // Load FBX animations
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const fbxAssets = fbxClips.map((clip) => useLoader(FBXLoader, clip.path))

  // Load GLTF/GLB animations
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const gltfGLTFs = gltfClips.map((clip) => useGLTF(clip.path))

  // State for Mixamo-converted animations
  const [mixamoAnimations, setMixamoAnimations] = useState<Map<string, THREE.AnimationClip>>(new Map())
  const processedKeyRef = useRef<string | null>(null)
  const isProcessingRef = useRef<boolean>(false)

  // Memoize clip paths for stable dependency tracking
  const fbxClipPathsKey = useMemo(() => 
    fbxClips.map(c => c.path).sort().join('|'),
    [fbxClips]
  )

  // Process FBX files and detect/convert Mixamo animations
  useEffect(() => {
    if (!vrm || fbxAssets.length === 0 || fbxClips.length === 0) return
    if (isProcessingRef.current) return

    const currentKey = `${vrm.scene.uuid}-${fbxClipPathsKey}`
    
    // Skip if already processed
    if (processedKeyRef.current === currentKey) {
      return
    }

    isProcessingRef.current = true
    let isCancelled = false

    const processFBXFiles = async () => {
      const convertedAnimations = new Map<string, THREE.AnimationClip>()

      // Process all FBX files in parallel for better performance
      const processingPromises = fbxAssets.map(async (fbxAsset, i) => {
        if (isCancelled) return null
        
        const clip = fbxClips[i]
        
        try {
          const hasMixamoRig = detectMixamoRig(fbxAsset)
          
          if (hasMixamoRig) {
            logger.log(`Detected Mixamo animation: ${clip.name}, converting for VRM...`)
            const convertedClip = await loadMixamoAnimation(clip.path, vrm as VRM)
            convertedClip.name = clip.name
            return { name: clip.name, clip: convertedClip }
          } else if (fbxAsset.animations?.length) {
            const animation = fbxAsset.animations[0]
            animation.name = clip.name
            return { name: clip.name, clip: animation }
          }
        } catch (error) {
          logger.error(`Error processing FBX animation ${clip.name}:`, error)
        }
        return null
      })

      const results = await Promise.all(processingPromises)
      
      if (!isCancelled) {
        results.forEach((result) => {
          if (result) {
            convertedAnimations.set(result.name, result.clip)
          }
        })
        processedKeyRef.current = currentKey
        setMixamoAnimations(convertedAnimations)
      }
      isProcessingRef.current = false
    }

    processFBXFiles()

    return () => {
      isCancelled = true
      isProcessingRef.current = false
    }
  }, [vrm?.scene.uuid, fbxClipPathsKey, fbxAssets.length, fbxClips.length])

  // Collect all animations with optimized memoization
  const allAnimations = useMemo(() => {
    const animations: THREE.AnimationClip[] = []

    if (vrm) {
      // Process VRMA animations
      vrmaGLTFs.forEach((gltf, index) => {
        const vrmAnimation: VRMAnimation | undefined = (gltf as any).userData?.vrmAnimations[0]
        if (vrmAnimation) {
          const clip = processVRMATracks(createVRMAnimationClip(vrmAnimation, vrm))
          clip.name = vrmaClips[index].name
          animations.push(clip)
        }
      })

      // Process Mixamo-converted FBX animations
      mixamoAnimations.forEach((clip) => {
        // Filter out head and neck tracks (same as VRMA)
        clip.tracks = clip.tracks.filter((track) => {
          const lower = track.name.toLowerCase()
          return !lower.includes('neck') && !lower.includes('head')
        })
        animations.push(clip)
      })
    } else {
      // Process GLTF/GLB animations
      gltfGLTFs.forEach((gltf, index) => {
        if (gltf.animations?.length) {
          gltf.animations.forEach((animation) => {
            animation.name = gltfClips[index].name
            animations.push(animation)
          })
        }
      })

      // Process regular FBX animations (non-Mixamo, non-VRM)
      fbxAssets.forEach((fbxAsset, index) => {
        if (fbxAsset.animations?.length) {
          const animation = fbxAsset.animations[0]
          animation.name = fbxClips[index].name
          animations.push(animation)
        }
      })
    }

    updateAnimationDurations(animations)
    return animations
  }, [mixamoAnimations, vrm, vrmaClips, gltfClips, fbxClips])

  const { actions, mixer } = useAnimations(allAnimations, avatarRef)
  return { actions, mixer, animations: allAnimations }
}

const AvatarModelComponent = ({ onHeadLocated }: AvatarModelProps) => {
  const { camera: viewerCamera } = useThree()

  const [state , setState] = useSimpleStore(AvatarState)
  const bonesRef = useRef<Record<string, THREE.Bone>>({})
  const startupPlayedRef = useRef<boolean>(false)
  const [isAvatarVisible, setIsAvatarVisible] = useState<boolean>(false)

  const { selectedModel, visemesEnabled, emotesEnabled, animationsEnabled } = state

  const gltf = useLoader(GLTFLoader, AVATAR_MODEL, (loader) => {
    loader.register((parser: GLTFParser) => new VRMLoaderPlugin(parser))
  })
  
  useEffect(() => {
    if (gltf && !state.isModelLoaded) {
      setState((prev) => ({ ...prev, isModelLoaded: true }))
    }
  }, [gltf, state.isModelLoaded, setState])

  const isVRM = selectedModel.toLowerCase().endsWith('.vrm')
  const vrm = isVRM ? (gltf.userData.vrm as VRM) : undefined
  const avatarScene = isVRM ? vrm?.scene : gltf.scene
  const avatarRef = useRef<THREE.Object3D>(null)
  const agentActions = useAgentActions()
  const agentState = useAgentState()
  const {emotes} =  useAgentServices()

  // Memoize morph-target meshes so we don't re-scan/filter inside the render loop (useFrame).
  const morphTargetMeshes = useMemo(() => {
    const morphs: Array<THREE.Mesh & { morphTargetInfluences: number[] }> = []
    if (!avatarScene) return morphs

    avatarScene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.morphTargetDictionary && child.morphTargetInfluences) {
        morphs.push(child as THREE.Mesh & { morphTargetInfluences: number[] })
      }
    })

    return morphs
  }, [avatarScene])

  // Only for setup: position the camera along the forward of the face of the avatar once, when avatar loads
  // TODO : very manual and hardcoded, must standarize avatar input 
  useEffect(() => {
    if (!avatarRef.current || !viewerCamera) return
    // Try to find the head or face bone/node
    let head: THREE.Object3D | null = null

    // VRM: try to use humanoid bone
    if (isVRM && vrm?.humanoid) {
      const normalizedBone = vrm.humanoid.getRawBone('head')
      head = normalizedBone?.node ?? null
      VRMUtils.rotateVRM0(vrm) // only works for vrm 0.0
      
    } else {
      // GLB: try to find a bone named "head"
      avatarRef.current?.traverse((child: any) => {
        if (
          !head &&
          child.isBone &&
          typeof child.name === 'string' &&
          child.name.toLowerCase().includes('head')
        ) {
          head = child
        }
      })
    }

    // Fallback: search for a node with "head" or "face" in the name
    
    // If found, position the camera in front of the head (only once, for setup)
    if (head && avatarRef.current) {
      // Get world position of the head
      logger.log('head', avatarRef.current ,vrm)
      const headWorldPos = new Vector3()
      head.getWorldPosition(headWorldPos)
      // Get the avatar's forward direction in world space (-Z in local space)
      const avatarWorldQuat = new THREE.Quaternion()
      avatarRef.current.getWorldQuaternion(avatarWorldQuat)
      const avatarForward = new Vector3(0, 0, isVRM ? -1 : 1)  .applyQuaternion(avatarWorldQuat).normalize()

      // Set camera target to the head's world position
      const cameraTarget = headWorldPos.toArray() as [number, number, number]

      // Set camera position a certain distance in front of the head, along the avatar's forward vector
      const cameraDistance = .5 // You can adjust this distance as needed
      const cameraPos = headWorldPos.clone().add(avatarForward.multiplyScalar(cameraDistance))
      const cameraPosition = cameraPos.toArray() as [number, number, number]

      onHeadLocated?.(cameraTarget, cameraPosition)
      if(isVRM) avatarRef.current.position.x += .2  // hardcoded adjustment for now
    }
    // Only run on initial avatar load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarRef.current])

  // Load external animations from animationClips.ts
  const { actions, mixer } = useExternalAnimations(avatarRef as any, vrm)
  // Setup animation service with R3F
  useEffect(() => {
    if (!avatarScene || !actions || !mixer || !animationsEnabled) return

    // Setup the animation service with R3F actions and mixer
    // Filter out null actions
    const validActions: Record<string, AnimationAction> = {}
    Object.entries(actions).forEach(([name, action]) => {
      if (action) {
        validActions[name] = action
      }
    })

    console.log('validActions', validActions)

    agentActions.setPersonality('professional')
    agentActions.setupAnimations(validActions, mixer, avatarRef.current || undefined , ANIMATION_CLIPS.idle_loop)

    logger.log(`Animation service setup with ${Object.keys(actions).length} animations`)
    // Make avatar visible after idle animation is applied
    setTimeout(() => {
      setIsAvatarVisible(true)
    }, 300) // Small delay to ensure animation is applied

    // Start the sequence after a short delay to ensure everything is initialized
    
  }, [animationsEnabled, actions, mixer, avatarScene, agentActions])

  // Setup emote service integration
  useEffect(() => {
    if (!avatarScene || !emotesEnabled ) return

    let bones: Record<string, THREE.Bone> = {}

    if (isVRM && vrm) {
      // VRM expression manager route 
      agentActions.setupEmotesForVRM(vrm)
      logger.log('emote service wired to VRM expressionManager')

      // Get bones from VRM humanoid if available
      if (vrm.humanoid) {
        // Map VRM humanoid bones to THREE.Bone references
        Object.entries(vrm.humanoid?.humanBones ?? {}).forEach(([name, boneNode]) => {
          if (boneNode?.node) {
            bones[name] = boneNode.node as THREE.Bone
          }
        })
      }
    } else {
      const emoteDictionary: Record<string, number[]> = {}
      bones = {}

      // Map morph targets for emotional expressions (use memoized morph-target meshes).
      morphTargetMeshes.forEach((mesh) => {
        Object.entries(mesh.morphTargetDictionary ?? {}).forEach(([name, index]) => {
          if (
            name.includes('eye') ||
            name.includes('brow') ||
            name.includes('mouth') ||
            name.includes('nose') ||
            name.includes('cheek') ||
            name.includes('jaw')
          ) {
            if (!emoteDictionary[name]) emoteDictionary[name] = []
            emoteDictionary[name].push(index)
          }
        })
      })

      // Collect bones for head/gaze control
      avatarScene.traverse((child) => {
        if (child instanceof THREE.Bone) {
          bones[child.name] = child
        }
      })

      bonesRef.current = bones

      // Setup emote service with morph targets and bones
      if (morphTargetMeshes.length > 0 && Object.keys(emoteDictionary).length > 0) {
        agentActions.setupEmotesForMorphTargets(morphTargetMeshes, emoteDictionary)
      }

      // Provide avatar references for gaze and head control
    }
    agentActions.setupAvatarReferences({
      bones,
      node: avatarRef.current ?? undefined,
      camera: viewerCamera // Camera will be set by the scene
    })
  }, [avatarScene, emotesEnabled, isVRM, vrm, viewerCamera, morphTargetMeshes])


  useEffect(() => { 
    if (!animationsEnabled || !emotesEnabled) return
    if (!avatarScene || !actions || !mixer  ) return
    if (startupPlayedRef.current) return
    if (!isAvatarVisible) return // Wait until avatar is visible

    // Mark startup as played to prevent re-execution

    console.log('DEBUG:performStartupAnimation')
    agentActions.performEmotionAction({emotion: 'happy', relaxTime: ANIMATION_CLIPS.wave.duration})
    agentActions.performAnimationAction({
      clip: ANIMATION_CLIPS.wave,
      immediate: true,
      loopCount: 1,
      blendTime: 300,
      speed: .5
    })
    agentActions.speak("Oh hey There! , Welcome to my website! I'm Rahul, ask me anything about my work and projects!")

    startupPlayedRef.current = true

  }, [animationsEnabled, emotesEnabled, isAvatarVisible, avatarScene])
  // Animation service will handle its own initialization

  useFrame((_, delta) => {
    if (isVRM && vrm) vrm.expressionManager?.update()
    // Update animation service using R3F integration
    if (animationsEnabled) {
      agentActions.updateAnimation(delta)
    }

    // Update visemes for lip sync
    if (visemesEnabled) {
      agentActions.updateVisemes(delta)
      agentActions.applyVisemesToRig(delta)
    }

    // Update emotes for facial expressions and behaviors
    if (emotesEnabled) {
      agentActions.updateEmotes(delta)

      if (isVRM && vrm) {
        agentActions.applyEmotesToVRM(vrm)
      } else {
        // Apply to morph targets if available
        if (morphTargetMeshes.length > 0) {
          const dictionary = emotes.state.emote.dictionary
          if (dictionary) {
            agentActions.applyEmotesToMorphTargets(morphTargetMeshes, dictionary)
          }
        }
      }
    }
  })

  const performAvatarClick = useMemo(
    () => debounce(() => {
      if (animationsEnabled && emotesEnabled) {
        const randomAction = getRandomClip('action') as AnimationClip
        agentActions.performEmotionAction({
          emotion: randomAction.name == ANIMATION_CLIPS.look_around.name ? 'alert' : 'happy' , 
          relaxTime: randomAction.duration - 1000
        })

        agentActions.performAnimationAction({
          clip: randomAction,
          immediate: true,
          loopCount: 1,
          blendTime : 1000
        })  
        //if(randomAction.speech?.chance && Math.random() < randomAction.speech.chance) { 
          agentActions.speak(randomAction.speech?.text ?? 'Hello, how are you?')
        //}

        agentActions.performAnimationAction({
          clip: getRandomClip('idle'),
          loopCount: Infinity,
          blendTime : 1000
        })

  
      }
    }, 600, { leading: true, trailing: false }),
      [animationsEnabled, emotesEnabled, agentActions]
  )

  useEffect(() => {
    return () => performAvatarClick.cancel()
  }, [performAvatarClick])

  // Handle avatar click to play finger_gun animation (debounced)
  const handleAvatarClick = useCallback((event: any) => {
    if( agentState.currentAnimation?.category === 'action') return // don't allow clicking on action clips
    event.stopPropagation()
    performAvatarClick()
  }, [agentState.currentAnimation, performAvatarClick])


  console.log('DEBUG:AvatarModel')
  return (
    <primitive 
      ref={avatarRef} 
      object={avatarScene as any}
      onClick={handleAvatarClick}
      visible={isAvatarVisible}
    />
  )
}

// Memoize the component to prevent re-renders when services don't change
export const AvatarModel = memo(AvatarModelComponent)


// Preload all animation files using a loop over ANIMATION_CLIPS

// Loop through all animation clips and preload them
