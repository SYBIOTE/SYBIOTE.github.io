import type { ReactNode, FC } from 'react'
import { ResumeIcon } from './ResumeIcon'
import { PortfolioIcon } from './PortfolioIcon'
import { ServicesIcon } from './ServicesIcon'
import { ContactIcon } from './ContactIcon'
import { ChatIcon } from './ChatIcon'
import { DefaultIcon } from './DefaultIcon'
import { SettingsIcon } from './SettingsIcon'
import { MicrophoneIcon } from './MicrophoneIcon'
import { CloudIcon } from './CloudIcon'
import { LightningIcon } from './LightningIcon'
import { SendIcon } from './SendIcon'
import { SpeakerIcon } from './SpeakerIcon'
import { RobotIcon } from './RobotIcon'
import { ARIcon } from './ARIcon'
import { VoiceDetectedIcon } from './VoiceDetectedIcon'
import { RecordingIcon } from './RecordingIcon'

export { 
  ResumeIcon, 
  PortfolioIcon, 
  ServicesIcon, 
  ContactIcon, 
  ChatIcon, 
  DefaultIcon, 
  SettingsIcon,
  MicrophoneIcon,
  CloudIcon,
  LightningIcon,
  SendIcon,
  SpeakerIcon,
  RobotIcon,
  ARIcon,
  VoiceDetectedIcon,
  RecordingIcon
}

export const getSectionIcon = (id: string, size: string = '1rem'): ReactNode => {
  const map: Record<string, FC<{ size?: string }>> = {
    resume: ResumeIcon,
    portfolio: PortfolioIcon,
    services: ServicesIcon,
    contact: ContactIcon,
    chat: ChatIcon
  }
  const Icon = map[id] ?? DefaultIcon
  return <Icon size={size} />
}


