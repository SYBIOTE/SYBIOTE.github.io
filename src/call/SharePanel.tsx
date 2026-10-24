/**
 * The "screen" Rahul shares during the call. Driven by AvatarUIState, so both the
 * avatar's actions ([[show_project:id]], [[open:resume]]) and the visitor can change it.
 */

import { useSimpleStore } from '@hexafield/simple-store/react'
import { memo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { ContactSection } from '../components/sections/ContactSection'
import { ResumeSection } from '../components/sections/ResumeSection'
import { ServicesSection } from '../components/sections/ServicesSection'
import type { PortfolioItem } from '../content/types'
import { getSortedPortfolioItems, usePortfolioContent } from '../content/useContent'
import { AvatarUIState } from '../services/actions/avatarActions'
import { BackIcon, BriefcaseIcon, CloseIcon, FileIcon, GridIcon, LockIcon, MailIcon } from './callIcons'
import { ProjectDetail } from './ProjectDetail'
import { isShareTab, SHARE_TABS, type ShareTab } from './shareTabs'

const TAB_ICONS: Record<ShareTab, ReactNode> = {
  portfolio: <GridIcon />,
  resume: <FileIcon />,
  services: <BriefcaseIcon />,
  contact: <MailIcon />
}

// otherProjects -> other-projects, for the address bar
const slug = (id: string) => id.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()

const SharePanelComponent = () => {
  const { t } = useTranslation()
  const name = t('core.name')
  const displayHost = t('core.website').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
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

  // The active tab is titled after the page it shows, like a browser tab
  const pageTitle = project ? title(project.id) : folder ? title(folder.id) : tabLabel(tab)
  const canGoBack = !!project || !!folder
  const path = [tab, folder && slug(folder.id), project && slug(project.id)].filter(Boolean).join('/')
  const goBack = () => (project ? setUI((prev) => ({ ...prev, focusProjectId: null })) : setUI((prev) => ({ ...prev, openFolderId: null })))

  return (
    <section className="share browser" aria-label={t('call.sharing', 'Shared screen')}>
      {/* Browser chrome: a tab per section, then the address bar */}
      <div className="browser-top">
        <div className="browser-tabs" role="tablist">
          {SHARE_TABS.map((id) => (
            <button key={id} role="tab" className="browser-tab" aria-selected={tab === id} onClick={() => openTab(id)} title={tabLabel(id)}>
              <span className="browser-favicon">{TAB_ICONS[id]}</span>
              <span className="browser-tab-title">{tab === id ? pageTitle : tabLabel(id)}</span>
            </button>
          ))}
        </div>
        <button className="icon-btn browser-close" onClick={stopSharing} aria-label={t('call.hideScreen', "Hide {{name}}'s screen", { name })}>
          <CloseIcon />
        </button>
      </div>
      <div className="browser-bar">
        <button className="icon-btn browser-nav" onClick={goBack} disabled={!canGoBack} aria-label={t('call.back', 'Back')}>
          <BackIcon />
        </button>
        <div className="browser-url">
          <LockIcon />
          <span>
            {displayHost}
            <b>/{path}</b>
          </span>
        </div>
        <span className="browser-sharing">
          <i aria-hidden="true" />
          {t('call.isSharing', '{{name}} is sharing', { name })}
        </span>
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
