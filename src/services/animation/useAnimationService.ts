import { useGLTF } from '@react-three/drei'
import { useCallback, useMemo, useRef } from 'react'
import * as THREE from 'three'

import { ANIMATION_CLIPS } from './config/animationClips'
import {
  applyPersonality,
  clearAnimationQueue,
  enqueueAnimation,
  getCurrentAnimationInfo,
  getPersonalityAnimationClips,
  initializeAnimationState,
  initializeDefaultAnimation,
  handleBargeIn,
  resetAnimationState,
  setAnimationEnabled,
  setupAnimationState,
  startPerformance,
  updateAnimation
} from './animationService'
import type { AnimationClip, AnimationPerformanceData, AnimationState } from './animationTypes'

export const useAnimationService = () => {
  const animationStateRef = useRef<AnimationState>(initializeAnimationState())

  const setPersonality = useCallback((personality: string) => {
    applyPersonality(animationStateRef.current, personality)
  }, [])

  const performAction = useCallback((performanceData: AnimationPerformanceData) => {
    startPerformance(animationStateRef.current, performanceData)
  }, [])

  const reset = useCallback(() => {
    resetAnimationState(animationStateRef.current)
  }, [])

  const setCycling = useCallback((enabled: boolean) => {
    setAnimationEnabled(animationStateRef.current, enabled)
  }, [])

  const setup = useCallback(
    (actions: Record<string, THREE.AnimationAction>, mixer: THREE.AnimationMixer, avatar?: THREE.Object3D , animation?: AnimationClip) => {
      setupAnimationState(animationStateRef.current, actions, mixer, avatar)

      // Initialize with a default animation
      const personality = animationStateRef.current.currentPersonality
      initializeDefaultAnimation(animationStateRef.current, personality, animation)
    },
    []
  )

  const update = useCallback((delta: number) => {
    updateAnimation(animationStateRef.current, delta)
  }, [])

  const onBargeIn = useCallback(() => {
    handleBargeIn(animationStateRef.current)
  }, [])

  const getCurrentInfo = useCallback(() => {
    return getCurrentAnimationInfo(animationStateRef.current)
  }, [])

  const getAvailableClips = useCallback((): AnimationClip[] => {
    const personality = animationStateRef.current.currentPersonality
    return getPersonalityAnimationClips(personality)
  }, [])

  const actions = useMemo(
    () => ({
      setPersonality,
      performAction,
      enqueue: (performanceData: AnimationPerformanceData) =>
        enqueueAnimation(animationStateRef.current, performanceData),
      clearQueue: () => clearAnimationQueue(animationStateRef.current),
      setCycling,
      reset,
      setup,
      update,
      getCurrentInfo,
      getAvailableClips,
      onBargeIn,
    }),
    [setPersonality, performAction, setCycling, reset, setup, update, getCurrentInfo, getAvailableClips, onBargeIn]
  )

  const state = useMemo(
    () => animationStateRef.current
    ,
    [animationStateRef.current]
  )

  return useMemo(
    () => ({
      actions,
      state
    }),
    [actions, state]
  )
}

// Preload animation assets
Object.values(ANIMATION_CLIPS).forEach((clip) => {
  useGLTF.preload(clip.path)
})