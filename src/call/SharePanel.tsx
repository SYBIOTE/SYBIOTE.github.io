/**
 * The "screen" Rahul shares during the call. Driven by AvatarUIState, so both the
 * avatar's actions ([[show_project:id]], [[open:resume]]) and the visitor can change it.
 */

import { useSimpleStore } from '@hexafield/simple-store/react'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { ContactSection } from '../components/sections/ContactSection'
import { ResumeSection } from '../components/sections/ResumeSection'
import { ServicesSection } from '../components/sections/ServicesSection'
import type { PortfolioItem } from '../content/types'
import { getSortedPortfolioItems, usePortfolioContent } from '../content/useContent'
import { AvatarUIState } from '../services/actions/avatarActions'
import { BackIcon, CloseIcon } from './callIcons'
import { ProjectDetail } from './ProjectDetail'
import { isShareTab, SHARE_TABS, type ShareTab } from './shareTabs'

const SharePanelComponent = () => {
  const { t } = useTranslation()
  const name = t('core.name')
  const [{ openSectionId, focusProjectId, openFolderId: folderId }, setUI] = useSimpleStore(AvatarUIState)
  const items = getSortedPortfolioItems(usePortfolioContent())

  const tab: ShareTab = isShareTab(openSectionId) ? openSectionId : 'portfolio'
  const project = tab === 'portfolio' && focusProjectId ? items.find((i) => i.id === focusProjectId) : undefined
  const folder = folderId ? items.find((i) => i.id === folderId) : undefined

  const title = (id: string) => t(`portfolio.items.${id}.title`)
  const tabLabel = (id: ShareTab) => t(`sections.${id}`)

  const openTab = (id: ShareTab) => setUI({ openSectionId: id, focusProjectId: null })
  const openProject = (item: PortfolioItem) => {
    if (item.type === 'folder') {
      setUI((prev) => ({ ...prev, focusProjectId: null, openFolderId: item.id }))
    } else {
      setUI((prev) => ({ ...prev, focusProjectId: item.id }))
    }
  }
  const stopSharing = () => setUI({ openSectionId: null, focusProjectId: null })

  // Top-level grid shows only the featured projects; Rahul can still present any of the others,
  // which are listed newest first
  const featured = items.filter((i) => i.featured)
  const byDate = (a: PortfolioItem, b: PortfolioItem) => (b.date ?? '').localeCompare(a.date ?? '')
  const others = items.filter((i) => !i.featured && i.type !== 'folder').sort(byDate)
  const gridItems = folder ? items.filter((i) => folder.children?.includes(i.id)).sort(byDate) : featured

  const sharing = project ? title(project.id) : folder ? title(folder.id) : tabLabel(tab)
  const canGoBack = !!project || !!folder

  return (
    <section className="share" aria-label={t('call.sharing', 'Shared screen')}>
      <div className="share-head">
        {canGoBack && (
          <button
            className="icon-btn"
            onClick={() => (project ? setUI((prev) => ({ ...prev, focusProjectId: null })) : setUI((prev) => ({ ...prev, openFolderId: null })))}
            aria-label={t('call.back', 'Back')}
          >
            <BackIcon />
          </button>
        )}
        <div className="share-status">
          {t('call.isSharing', '{{name}} is sharing', { name })} · <b>{sharing}</b>
        </div>
        <button className="icon-btn" onClick={stopSharing} aria-label={t('call.hideScreen', "Hide {{name}}'s screen", { name })}>
          <CloseIcon />
        </button>
      </div>

      <div className="share-tabs" role="tablist">
        {SHARE_TABS.map((id) => (
          <button key={id} role="tab" className="share-tab" aria-selected={tab === id} onClick={() => openTab(id)}>
            {tabLabel(id)}
          </button>
        ))}
      </div>

      <div className="share-body">
        {tab === 'portfolio' && project && (
          <ProjectDetail
            project={project}
            siblings={project.featured ? featured.filter((i) => i.type !== 'folder') : others}
            groups={[
              { label: t('call.featured', 'Featured'), items: featured.filter((i) => i.type !== 'folder') },
              { label: title('otherProjects'), items: others }
            ]}
            onOpen={(id) => setUI((prev) => ({ ...prev, focusProjectId: id }))}
          />
        )}

        {tab === 'portfolio' && !project && (
          <div className="project-grid">
            {gridItems.map((item) => (
              <button key={item.id} className="project-card" onClick={() => openProject(item)}>
                {item.image && <img src={item.image} alt="" loading="lazy" />}
                <div className="project-card-body">
                  <div className="project-card-head">
                    <span className="project-card-title">{title(item.id)}</span>
                    {item.type === 'folder' ? (
                      <small className="project-card-meta">
                        {t('call.projectsCount', '{{count}} projects', { count: item.children?.length ?? 0 })}
                      </small>
                    ) : (
                      folder && item.date && <small className="project-card-meta">{item.date.slice(0, 4)}</small>
                    )}
                  </div>
                  <p className="project-card-desc">{t(`portfolio.items.${item.id}.description`, { defaultValue: '' })}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {tab === 'resume' && <ResumeSection />}
        {tab === 'services' && <ServicesSection />}
        {tab === 'contact' && <ContactSection />}
      </div>
    </section>
  )
}

export const SharePanel = memo(SharePanelComponent)
