/**
 * Services as a bento grid: AI for 3D leads as the wide card, and every service links to
 * the projects that prove it. Styles live in call.css (.services*).
 */

import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { ArrowIcon, CubeIcon, GamepadIcon, HeadsetIcon, ServerIcon, SparkleIcon } from '../../call/callIcons'
import { AvatarUIState } from '../../services/actions/avatarActions'

interface Service {
  id: string
  icon: ReactNode
  /** Portfolio item ids shown as "Seen in" links */
  proof: string[]
  wide?: boolean
}

const SERVICES: Service[] = [
  { id: 'ai3d', icon: <SparkleIcon />, proof: ['niraAnimates', 'assetHub', 'autov'], wide: true },
  { id: 'web3d', icon: <CubeIcon />, proof: ['etherealEngine', 'assetHub'] },
  { id: 'xr', icon: <HeadsetIcon />, proof: ['godotOculusPlatform', 'mrEarthViewer'] },
  { id: 'games', icon: <GamepadIcon />, proof: ['augury', 'meshSlicerGodot'] },
  { id: 'backend', icon: <ServerIcon />, proof: ['etherealEngine'] }
]

export const ServicesSection = () => {
  const { t } = useTranslation()

  const showProject = (id: string) => AvatarUIState.set({ openSectionId: 'portfolio', focusProjectId: id })
  const openContact = () => AvatarUIState.set({ openSectionId: 'contact', focusProjectId: null })

  return (
    <div className="services">
      <p className="services-intro">{t('services.intro')}</p>

      <div className="services-grid">
        {SERVICES.map((s, i) => (
          <article key={s.id} className={`service-card${s.wide ? ' wide' : ''}`}>
            <div className="service-top">
              <span className="service-icon">{s.icon}</span>
              <span className="service-num">{String(i + 1).padStart(2, '0')}</span>
            </div>
            <h3>{t(`services.items.${s.id}.name`)}</h3>
            <p>{t(`services.items.${s.id}.desc`)}</p>
            <div className="service-proof">
              <span>{t('services.seenIn')}</span>
              {s.proof.map((id) => (
                <button key={id} className="service-chip" onClick={() => showProject(id)}>
                  {t(`portfolio.items.${id}.title`)}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="services-cta">
        <span>{t('services.ctaText')}</span>
        <button className="pill primary" onClick={openContact}>
          {t('services.ctaButton')} <ArrowIcon />
        </button>
      </div>
    </div>
  )
}

export default ServicesSection
