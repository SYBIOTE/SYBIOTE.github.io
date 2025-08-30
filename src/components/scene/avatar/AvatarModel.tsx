import { createSimpleStore, useSimpleStore } from '@hexafield/simple-store/react'
import { VRM, VRMCore, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm'
import { createVRMAnimationClip, VRMAnimation, VRMAnimationLoaderPlugin } from '@pixiv/three-vrm-animation'
import { useAnimations, useGLTF } from '@react-three/drei'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import { memo, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/Addons.js'
import type { GLTFParser } from 'three/examples/jsm/Addons.js'


import { AvatarOptions } from './AvatarOptions'
import { Vector3 } from 'three'
import  {ANIMATION_CLIPS } from '../../../services/animation/config/animationClips'
import type { useAnimationService } from '../../../services/animation/useAnimationService'
import type { useEmoteService } from '../../../services/emote/useEmoteService'
import type { useVisemeService } from '../../../services/visemes/useVisemeService'

const AVATAR_MODEL = AvatarOptions.Rahul

export const AvatarState = createSimpleStore({
  selectedModel: AVATAR_MODEL,
  visemesEnabled: true,
  emotesEnabled: true,
  animationsEnabled: true
})

interface AvatarModelProps {
  visemeService?: ReturnType<typeof useVisemeService>
  emoteService?: ReturnType<typeof useEmoteService>
  animationService?: ReturnType<typeof useAnimationService>
  onHeadLocated?: (target: [number, number, number], position: [number, number, number]) => void
}

// Custom hook to load external animation files, including VRMA animations
export const useExternalAnimations = (avatarRef: React.RefObject<THREE.Object3D>, vrm?: VRMCore) => {
  // Split clips by type so hooks are deterministic
  const vrmaClips = ANIMATION_CLIPS.filter((c) => c.path.toLowerCase().endsWith('.vrma'))

  const gltfClips = ANIMATION_CLIPS.filter((c) => !c.path.toLowerCase().endsWith('.vrma'))

  // Load VRMA animations
  const vrmaGLTFs = vrmaClips.map((clip) =>
    useLoader(GLTFLoader, clip.path, (loader) => {
      loader.register((parser: GLTFParser) => new VRMAnimationLoaderPlugin(parser))
    })
  )

  // Load GLTF/GLB animations
  const gltfGLTFs = gltfClips.map((clip) => useGLTF(clip.path))

  // Collect all animations
  const allAnimations = useMemo(() => {
    const animations: THREE.AnimationClip[] = []

    if (vrm) {
      // Process VRMA
      vrmaGLTFs.forEach((gltf, index) => {
        const vrmAnimation: VRMAnimation | undefined = (gltf as any).userData?.vrmAnimations[0]

        if (vrmAnimation && vrm) {
          const clip = createVRMAnimationClip(vrmAnimation, vrm)
          clip.name = vrmaClips[index].name

          // Remove "Normalized_" prefix from track names
          clip.tracks = clip.tracks.filter((track) => {
            // Remove "Normalized_" prefix from track names
            if (track.name.startsWith('Normalized_')) {
              track.name = track.name.replace(/^Normalized_/, '')
            }
            const lower = track.name.toLowerCase()
            if (lower.includes('neck') || lower.includes('head')) {
              return false
            }
            return true
          })

          vrmaClips[index].duration = clip.duration
          animations.push(clip)
        }
      })
    } else {
      // Process GLTF/GLB
      gltfGLTFs.forEach((gltf, index) => {
        if (gltf.animations && gltf.animations.length > 0) {
          gltf.animations.forEach((animation) => {
            animation.name = gltfClips[index].name
            gltfClips[index].duration = animation.duration
            animations.push(animation)
          })
        }
      })
    }

    return animations
  }, [vrmaGLTFs, gltfGLTFs, vrm])

  // Hook into R3F's animation system

  const { actions, mixer } = useAnimations(allAnimations, avatarRef)
  return { actions, mixer, animations: allAnimations }
}

const AvatarModelComponent = ({ visemeService, emoteService, animationService, onHeadLocated }: AvatarModelProps) => {
  const { scene: viewerScene, camera: viewerCamera } = useThree()

  const [state] = useSimpleStore(AvatarState)
  const morphTargetsRef = useRef<THREE.Mesh[]>([])
  const bonesRef = useRef<Record<string, THREE.Bone>>({})

  const { selectedModel, visemesEnabled, emotesEnabled, animationsEnabled } = state

  const helperRoot = new THREE.Group()
  helperRoot.renderOrder = 10000
  viewerScene.add(helperRoot)

  const gltf = useLoader(GLTFLoader, AVATAR_MODEL, (loader) => {
    loader.register((parser: GLTFParser) => new VRMLoaderPlugin(parser))
  })
  const isVRM = selectedModel.toLowerCase().endsWith('.vrm')

  const vrm = isVRM ? (gltf.userData.vrm as VRM) : undefined
  const avatarScene = isVRM ? vrm?.scene : gltf.scene
  const avatarRef = useRef<THREE.Object3D>(null)
  
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
      console.log('head', avatarRef.current ,vrm)
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
    if (!avatarScene || !animationService || !actions || !mixer || !animationsEnabled) return

    // Setup the animation service with R3F actions and mixer
    // Filter out null actions
    const validActions: Record<string, THREE.AnimationAction> = {}
    Object.entries(actions).forEach(([name, action]) => {
      if (action) {
        validActions[name] = action
      }
    })

    animationService.actions.setup(validActions, mixer, avatarRef.current || undefined)

    console.log(`Animation service setup with ${Object.keys(actions).length} animations`)
  }, [animationsEnabled, animationService, actions, mixer])

  useEffect(() => {
    if (!avatarScene || !visemesEnabled || !visemeService) return

    if (isVRM && vrm) {
      // VRM expression manager route
      visemeService.actions.setupForVRM(vrm)
      console.log('Viseme service wired to VRM expressionManager')
    } else {
      // GLB morph target route
      const morphTargets: { morphTargetInfluences: number[] }[] = []
      const dictionary: Record<string, number[]> = {}

      avatarScene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.morphTargetDictionary && child.morphTargetInfluences) {
          morphTargets.push(child as THREE.Mesh & { morphTargetInfluences: number[] })
          Object.entries(child.morphTargetDictionary).forEach(([name, index]) => {
            if (name.startsWith('viseme_')) {
              if (!dictionary[name]) dictionary[name] = []
              dictionary[name].push(index)
            }
          })
        }
      })

      morphTargetsRef.current = morphTargets as THREE.Mesh[]
      if (morphTargets.length > 0 && Object.keys(dictionary).length > 0) {
        visemeService.actions.setupForMorphTargets(morphTargets, dictionary)
      }
    }
  }, [avatarScene, visemesEnabled, visemeService, isVRM, vrm])

  // Setup emote service integration
  useEffect(() => {
    if (!avatarScene || !emotesEnabled || !emoteService) return

    let bones: Record<string, THREE.Bone> = {}

    if (isVRM && vrm) {
      // VRM expression manager route
      emoteService.actions.setupForVRM(vrm)
      console.log('emote service wired to VRM expressionManager')

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
      const morphTargets: { morphTargetInfluences: number[] }[] = []
      const emoteDictionary: Record<string, number[]> = {}
      bones = {}

      // Collect morphable meshes for facial expressions
      avatarScene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.morphTargetDictionary && child.morphTargetInfluences) {
          const meshWithMorphTargets = child as THREE.Mesh & { morphTargetInfluences: number[] }
          morphTargets.push(meshWithMorphTargets)

          // Map morph targets for emotional expressions
          Object.entries(child.morphTargetDictionary).forEach(([name, index]) => {
            // Include all relevant facial expression morph targets
            if (
              name.includes('eye') ||
              name.includes('brow') ||
              name.includes('mouth') ||
              name.includes('nose') ||
              name.includes('cheek') ||
              name.includes('jaw')
            ) {
              if (!emoteDictionary[name]) {
                emoteDictionary[name] = []
              }
              emoteDictionary[name].push(index)
            }
          })
        }

        // Collect bones for head/gaze control
        if (child instanceof THREE.Bone) {
          bones[child.name] = child
        }
      })

      bonesRef.current = bones

      // Setup emote service with morph targets and bones
      if (morphTargets.length > 0 && Object.keys(emoteDictionary).length > 0) {
        emoteService.actions.setupForMorphTargets(morphTargets, emoteDictionary)
      }

      // Provide avatar references for gaze and head control
    }
    emoteService.actions.setAvatarReferences({
      bones,
      node: avatarRef.current ?? undefined,
      camera: viewerCamera // Camera will be set by the scene
    })
  }, [avatarScene, emotesEnabled, emoteService])

  // Animation service will handle its own initialization

  useFrame((_, delta) => {
    if (isVRM && vrm) vrm.expressionManager?.update()
    // Update animation service using R3F integration
    if (animationsEnabled && animationService) {
      animationService.actions.update(delta)
    }

    // Update visemes for lip sync
    if (visemesEnabled && visemeService) {
      visemeService.actions.update(delta)
      visemeService.actions.applyToRig(delta)
    }

    // Update emotes for facial expressions and behaviors
    if (emotesEnabled && emoteService) {
      emoteService.actions.update(delta)

      if (isVRM && vrm) {
        emoteService.actions.applyToVRM(vrm)
      } else {
        // Apply to morph targets if available
        if (morphTargetsRef.current.length > 0) {
          const dictionary = emoteService.state.emote.dictionary
          if (dictionary) {
            // Filter to only meshes with morph targets
            const validMorphs = morphTargetsRef.current.filter((mesh) => mesh.morphTargetInfluences !== undefined) as {
              morphTargetInfluences: number[]
            }[]

            if (validMorphs.length > 0) {
              emoteService.actions.applyToMorphTargets(validMorphs, dictionary)
            }
          }
        }
      }
    }
  })

  return <primitive ref={avatarRef} object={avatarScene as any} />
}

// Memoize the component to prevent re-renders when services don't change
export const AvatarModel = memo(AvatarModelComponent)

useGLTF.preload(AVATAR_MODEL)

// Preload all animation files using a loop over ANIMATION_CLIPS

// Loop through all animation clips and preload them
