import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { ControlButton } from '../common/ControlButton'
import type { ButtonStyleConfig } from '../sections/SectionNavRail'
import { 
  MicrophoneIcon, 
  LightningIcon, 
  SendIcon, 
  ARIcon,
  VoiceDetectedIcon,
  RecordingIcon
} from '../common/icons'
import type { AppConfig } from '../../app/appConfig'


interface ControlPanelProps {
  config: AppConfig
  isRecording: boolean
  handleAppStateChange: (newAppState: AppConfig) => void
  onEnterARMode?: () => void
  vadDetecting?: boolean
  ttsActive?: boolean
  isVisible: boolean
}


// Use ButtonStyleConfig for consistency with new UI
const controlButtonsConfig: Partial<ButtonStyleConfig> = {
  iconSize: '1.25rem'
}

export const ControlPanel = memo(({
  config,
  handleAppStateChange,
  isRecording,
  onEnterARMode,
  vadDetecting = false,
  isVisible
}: ControlPanelProps) => {
  const { t } = useTranslation()
  const isMobile = window.innerWidth <= 768

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '1.25rem',
        left: '50%',
        zIndex: 1000,
        transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        transform: isVisible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(100%)',
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
      <div
        style={{
        
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: '#FFFFFF',
          borderRadius: '0.5rem',
          boxShadow: '0 0.125rem 0.25rem rgba(0,0,0,0.04)',
          display: 'flex',
          justifyContent: 'center',
          padding: '0.75rem 1rem',
          gap: '0.5rem',
          flexWrap: 'wrap',
          minHeight: '3.5rem',
          alignItems: 'center',
          width: 'fit-content',
          margin: '0 auto',
          maxWidth: isMobile ? '17.5rem' : '25rem',
          transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
      >
        <ControlButton

          isActive={isRecording}
          onClick={() => handleAppStateChange({ ...config, microphone: !config.microphone })}
          tooltipContent={
            isRecording
              ? vadDetecting
                ? t("chat.controls.microphone.voiceDetected")
                : t("chat.controls.microphone.vadListening")
              : t("chat.controls.microphone.enable")
          }
        >
          {vadDetecting ? (
            <VoiceDetectedIcon size={controlButtonsConfig.iconSize} />
          ) : isRecording ? (
            <RecordingIcon size={controlButtonsConfig.iconSize} />
          ) : (
            <MicrophoneIcon size={controlButtonsConfig.iconSize} />
          )}
        </ControlButton>

        {/*<ControlButton
          isActive={config.cloudMode}
          onClick={() => handleAppStateChange({ ...config, cloudMode: !config.cloudMode })}
          tooltipContent={config.cloudMode ? t("chat.controls.cloudMode.switchToLocal") : t("chat.controls.cloudMode.switchToCloud")}
        >
          <CloudIcon size={controlButtonsConfig.iconSize} />
        </ControlButton>*/}
        <ControlButton
          isActive={config.bargeInEnabled}
          onClick={() => handleAppStateChange({ ...config, bargeInEnabled: !config.bargeInEnabled })}
          tooltipContent={config.bargeInEnabled ? t("chat.controls.bargeIn.disable") : t("chat.controls.bargeIn.enable")}
        >
          <LightningIcon size={controlButtonsConfig.iconSize} />
        </ControlButton>

        <ControlButton
          isActive={config.autoSubmitEnabled}
          onClick={() => handleAppStateChange({ ...config, autoSubmitEnabled: !config.autoSubmitEnabled })}
          tooltipContent={config.autoSubmitEnabled ? t("chat.controls.autoSubmit.disable") : t("chat.controls.autoSubmit.enable")}
        >
          <SendIcon size={controlButtonsConfig.iconSize} />
        </ControlButton>

        {/*<ControlButton
          isActive={config.agentEnabled}
          onClick={() => handleAppStateChange({ ...config, agentEnabled: !config.agentEnabled })}
          tooltipContent={config.agentEnabled ? t("chat.controls.agent.disable") : t("chat.controls.agent.enable")}
        >
          {ttsActive ? (
            <SpeakerIcon size={controlButtonsConfig.iconSize} />
          ) : (
            <RobotIcon size={controlButtonsConfig.iconSize} />
          )}
        </ControlButton>*/}

        {onEnterARMode && (
          <ControlButton isActive={false} onClick={onEnterARMode} tooltipContent={t("chat.controls.arMode")}>
            <ARIcon size={controlButtonsConfig.iconSize} />
          </ControlButton>
        )}
      </div>
    </div>
  )
})

ControlPanel.displayName = 'ControlPanel'
