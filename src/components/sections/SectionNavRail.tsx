import { useState, type ReactNode } from 'react'
import { getSectionIcon } from '../common/icons'
import { SectionPanel } from '../common/SectionPanel'
import { ChatPanel } from '../chat/ChatPanel'
import { ResumeSection } from './ResumeSection'
import { PortfolioSection } from './PortfolioSection'
import { ServicesSection } from './ServicesSection'
import { ContactSection } from './ContactSection'
import { useTranslation } from 'react-i18next'
import type { ConversationMessage } from '../../services/conversation/conversationType'

export interface ButtonStyleConfig {
  collapsedSize: string
  expandedWidth: string
  paddingX: string
  iconSize: string
  gapCollapsed: number | string
  gapExpanded: number | string
  labelMaxWidth: string
  labelFontSize: string
  border: string
  borderRadius: string
  backgroundCollapsed: string
  backgroundExpanded: string
  textColor: string
  backdropFilter: string
  transition?: string
}

const defaultButtonConfig: ButtonStyleConfig = {
  collapsedSize: '4rem',
  expandedWidth: '14rem',
  paddingX: '0.75rem',
  iconSize: '2rem',
  gapCollapsed: 0,
  gapExpanded: '0.75rem',
  labelMaxWidth: '10rem',
  labelFontSize: '1rem',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: '9999px',
  backgroundCollapsed: 'rgba(255,255,255,0.06)',
  backgroundExpanded: 'linear-gradient(90deg, rgba(30,136,229,0.25) 0%, rgba(255,255,255,0.02) 100%)',
  textColor: '#FFFFFF',
  backdropFilter: 'blur(12px)',
  transition: 'width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), background 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), border-color 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
}

interface ExpandingNavButtonProps {
  id: string
  label: string
  onClick?: () => void
  icon: ReactNode
  config?: Partial<ButtonStyleConfig>
}

const ExpandingNavButton = ({ id, label, onClick, icon, config }: ExpandingNavButtonProps) => {
  const [isHover, setIsHover] = useState(false)
  const cfg: ButtonStyleConfig = { ...defaultButtonConfig, ...(config ?? {}) }
  return (
    <button
      id={`${id}`}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: isHover ? 'flex-start' : 'center',
        gap: isHover ? cfg.gapExpanded : cfg.gapCollapsed,
        width: isHover ? cfg.expandedWidth : cfg.collapsedSize,
        height: cfg.collapsedSize,
        border: cfg.border,
        borderRadius: cfg.borderRadius,
        background: isHover ? cfg.backgroundExpanded : cfg.backgroundCollapsed,
        color: cfg.textColor,
        cursor: 'pointer',
        padding: `0 ${cfg.paddingX}`,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        transition: cfg.transition,
        backdropFilter: cfg.backdropFilter
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: isHover ? 'auto' : '100%'
        }}
      >
        {icon}
      </div>
      <span
        id={`${id}-label`}
        style={{
          display: 'inline-block',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          maxWidth: isHover ? cfg.labelMaxWidth : 0,
          flex: isHover ? '0 1 auto' : '0 0 0',
          opacity: isHover ? 1 : 0,
          transform: isHover ? 'translateX(0)' : 'translateX(6px)',
          transition: 'opacity 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), max-width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          fontSize: cfg.labelFontSize
        }}
      >
        {label}
      </span>
    </button>
  )
}

interface SectionItem {
  id: string
  label: string
  icon?: ReactNode
  onClick?: () => void
  href?: string
  content?: ReactNode
}

interface SectionNavRailProps {
  buttonConfig?: Partial<ButtonStyleConfig>
  sections?: SectionItem[]
  messages?: ConversationMessage[] // Use proper type
}

export const SectionNavRail = ({
  buttonConfig,
  sections: sectionsProp,
  messages = [], // Default to empty array
}: SectionNavRailProps) => {
  const { t } = useTranslation()
  const resolvedButtonConfig: ButtonStyleConfig = { ...defaultButtonConfig, ...(buttonConfig ?? {}) }

  const iconFor = (id: string): ReactNode => getSectionIcon(id, resolvedButtonConfig.iconSize)

  const sections: SectionItem[] =
    sectionsProp ?? [
      { id: 'resume', label: t("sections.resume"), content: <ResumeSection /> },
      { id: 'portfolio', label: t("sections.portfolio"), content: <PortfolioSection /> },
      { id: 'services', label: t("sections.services"), content: <ServicesSection /> },
      { id: 'contact', label: t("sections.contact"), content: <ContactSection /> },
      { id: 'chat', label: t("sections.chat"), content: <ChatPanel messages={messages} /> }
    ]

  const [openSectionId, setOpenSectionId] = useState<string | null>(null)
  const openSection = sections.find((s) => s.id === openSectionId) || null

  return (
    <div
      id="section-nav-rail"
      style={{
        position: 'absolute',
        top: '50%',
        left: '0.5rem',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        zIndex: 1003,
      }}
    >
      {sections.map((s) => (
        <ExpandingNavButton
          key={s.id}
          id={`section-nav-button-${s.id}`}
          label={s.label}
          icon={s.icon ?? iconFor(s.id)}
          onClick={
            s.onClick ?? (() => {
              setOpenSectionId(s.id)
            })
          }
          config={resolvedButtonConfig}
        />
      ))}
      <SectionPanel
        open={!!openSection}
        title={openSection?.label}
        titleIcon={openSection ? iconFor(openSection.id) : undefined}
        children={openSection?.content}
        onClose={() => setOpenSectionId(null)}
        anchorSelector="#avatar-viewport"
      />
    </div>
  )
}

export default SectionNavRail


