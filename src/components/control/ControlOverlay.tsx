import { memo, useCallback, useState } from 'react'

import { ToggleButton } from '../common/ToggleButton'
import { useTranslation } from 'react-i18next'
import type { XRStore } from '@react-three/xr'
import { AppConfigState, type AppConfig } from '../../app/appConfig'
import { ControlPanel } from './ControlPanel'
import { useAgentActions, useAgentState } from '../scene/avatar/AgentContext'

interface ControlOverlayProps {
  config: AppConfig
  handleAppStateChange: (newAppState: AppConfig) => void
  xrStore: XRStore
}


export const ControlOverlay = memo(({
  config,
  handleAppStateChange,
  xrStore,
}: ControlOverlayProps) => {
  const { t } = useTranslation()
  const [isButtonsVisible, setIsButtonsVisible] = useState(true)
  const { vadIsDetecting, ttsIsSpeaking } = useAgentState()
  const { setSTTDesired } = useAgentActions()

  const handleEnterARMode = useCallback(() => {
    if (!xrStore) return
    xrStore.enterAR().then(() => {
      AppConfigState.set((prev) => ({ ...prev, microphone: true }))
      setSTTDesired(true)
    })
    logger.log('AR + STT mode activated - click the AR button in the 3D view to enter AR')
  }, [xrStore, setSTTDesired])
  return (
    <>
      {/* Control Buttons */}
      <ControlPanel
        config={config} 
        isRecording={config.microphone}
        handleAppStateChange={handleAppStateChange}
        onEnterARMode={handleEnterARMode}
        vadDetecting={vadIsDetecting}
        ttsActive={ttsIsSpeaking}
        isVisible={isButtonsVisible}
      />

      {/* Controls Toggle Button */}
      <ToggleButton
        isVisible={isButtonsVisible}
        onToggle={() => setIsButtonsVisible(!isButtonsVisible)}
        label={t("sections.controls")}
        position="bottom-left"
      />
    </>
  )
})
