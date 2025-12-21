import type { AnimationClip } from '../animationTypes'
import * as THREE from 'three'

export const ANIMATION_CLIPS = {
  // Idle animations
  'idle_loop': {
    name: 'idle_loop',
    path: '/assets/animations/vrm/idle_loop.vrma',
    duration: 5000, // Will be updated from actual animation file
    weight: 1,
    blendTime: 1000,
    category: 'idle',
    priority: 1,
    loopCount: Infinity, // Infinite loops
    blendCurve: 'easeInOut',
    speed: .5
  },
  'neutral_idle':{
    name: 'neutral_idle',
    path: '/assets/animations/fbx/neutral_idle.fbx',
    duration: 5000, // Will be updated from actual animation file
    weight: 1,
    blendTime: 1000,
    category: 'idle',
    priority: 1,
    loopCount: Infinity, // Infinite loops
    blendCurve: 'easeInOut',
    speed: 1
  },
  'talk':{
    name: 'talk',
    path: '/assets/animations/fbx/talk.fbx',
    duration: 5000, // Will be updated from actual animation file
    weight: 0,
    blendTime: 1000,
    category: 'communication',
    priority: 0,
    loopCount: Infinity,
    blendCurve: 'easeInOut',
    speed: 1
  },
  'swat_fly':{
    name: 'swat_fly',
    path: '/assets/animations/fbx/swat_fly.fbx',
    duration: 5000, // Will be updated from actual animation file
    weight: 1,
    blendTime: 1000,
    category: 'gesture',
    priority: 1,
    loopCount: 1,
    blendCurve: 'easeInOut',
    speed: 1
  },
  'blush':{
    name: 'blush',
    path: '/assets/animations/vrm/blush.vrma',
    duration: 5000, // Will be updated from actual animation file
    weight: 1,
    blendTime: 1000,
    category: 'action',
    priority: 1,
    loopCount: 1,
    blendCurve: 'easeInOut',
    speed: 1
  },
  // Action animations
  'look_around': {
    name: 'look_around',
    path: '/assets/animations/vrm/look_around.vrma',
    duration: 5000, // Will be updated from actual animation file
    weight: 1,
    blendTime: 1000,
    category: 'action',
    priority: 1,
    loopCount: 1,
    blendCurve: 'easeInOut',
    speed: 1
  },
  'dance_move': {
    name: 'dance_move',
    path: '/assets/animations/vrm/dance_move.vrma',
    duration: 3500, // Will be updated from actual animation file
    weight: 0.7,
    blendTime: 800,
    category: 'action',
    priority: 5,
    loopCount: 1,
    blendCurve: 'easeInOut',
    speed: 0.9
  },
  'bow': {
    name: 'bow',
    path: '/assets/animations/fbx/bow.fbx',
    duration: 2000, // Will be updated from actual animation file
    weight: 0.3,
    blendTime: 500,
    category: 'action',
    priority: 2,
    loopCount: 1,
    blendCurve: 'easeInOut',
    speed: 1
  },
  'wave':{
    name: 'wave',
    path: '/assets/animations/fbx/wave.fbx',
    duration: 2000, // Will be updated from actual animation file
    weight: 0.3,
    blendTime: 500,
    category: 'action',
    priority: 2,
    loopCount: 1,
    blendCurve: 'easeInOut',
    speed: 1
  }
} as Record<string, AnimationClip>

/**
 * Updates animation clip durations from the actual THREE.AnimationClip objects
 * This should be called after animations are loaded to ensure accurate durations
 */
export const updateAnimationDurations = (threeAnimations: THREE.AnimationClip[]): void => {
  threeAnimations.forEach((threeClip) => {
    const clipKey = Object.keys(ANIMATION_CLIPS).find(
      key => ANIMATION_CLIPS[key].name === threeClip.name
    ) 
    if (clipKey && threeClip.duration) {
      ANIMATION_CLIPS[clipKey].duration = Math.round(threeClip.duration * .6 * 1000) 
    }
  })
}

export const getAnimationClips = (): AnimationClip[] => {
  return Object.values(ANIMATION_CLIPS)
}

export const getClipsByCategory = (category: AnimationClip['category']): AnimationClip[] => {
  return Object.values(ANIMATION_CLIPS).filter((clip) => clip.category === category)
}

export const getRandomClip = (category?: AnimationClip['category']): AnimationClip => {
  const clips = category ? getClipsByCategory(category) : Object.values(ANIMATION_CLIPS)
  return clips[Math.floor(Math.random() * clips.length)]
}

export const getClipsByPriority = (priority: number): AnimationClip[] => {
  return Object.values(ANIMATION_CLIPS).filter((clip) => clip.priority <= priority)
}

// Type for animation keys
export type AnimationKey = keyof typeof ANIMATION_CLIPS

// Helper function to get animation by key
export const getAnimationByKey = (key: AnimationKey): AnimationClip => {
  return ANIMATION_CLIPS[key]
}
