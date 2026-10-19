/**
 * The "screen" Rahul shares during the call. Driven by AvatarUIState, so both the
 * avatar's actions ([[show_project:id]], [[open:resume]]) and the visitor can change it.
 */

import { useSimpleStore } from '@hexafield/simple-store/react'
import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { LinkIcons, MediaCarousel } from '../components/portfolio'
import { ContactSection } from '../components/sections/ContactSection'
import { ResumeSection } from '../components/sections/ResumeSection'
import { ServicesSection } from '../components/sections/ServicesSection'
import type { PortfolioItem } from '../content/types'
import { getSortedPortfolioItems, usePortfolioContent } from '../content/useContent'
import { AvatarUIState } from '../services/actions/avatarActions'
import { BackIcon, CloseIcon } from './callIcons'
import { isShareTab, SHARE_TABS, type ShareTab } from './shareTabs'

const SharePanelComponent = () => {
  const { t } = useTranslation()
  const [{ openSectionId, focusProjectId }, setUI] = useSimpleStore(AvatarUIState)
  const items = getSortedPortfolioItems(usePortfolioContent())
  const [folderId, setFolderId] = useState<string | null>(null)

  const tab: ShareTab = isShareTab(openSectionId) ? openSectionId : 'portfolio'
  const project = tab === 'portfolio' && focusProjectId ? items.find((i) => i.id === focusProjectId) : undefined
  const folder = folderId ? items.find((i) => i.id === folderId) : undefined

  const title = (id: string) => t(`portfolio.items.${id}.title`)
  const tabLabel = (id: ShareTab) => t(`sections.${id}`)

  const openTab = (id: ShareTab) => {
    setFolderId(null)
    setUI({ openSectionId: id, focusProjectId: null })
  }
  const openProject = (item: PortfolioItem) => {
    if (item.type === 'folder') {
      setFolderId(item.id)
      setUI((prev) => ({ ...prev, focusProjectId: null }))
    } else {
      setUI((prev) => ({ ...prev, focusProjectId: item.id }))
    }
  }
  const stopSharing = () => setUI({ openSectionId: null, focusProjectId: null })

  // Top-level grid hides items that live inside a folder
  const childIds = new Set(items.flatMap((i) => (i.type === 'folder' ? (i.children ?? []) : [])))
  const gridItems = folder ? items.filter((i) => folder.children?.includes(i.id)) : items.filter((i) => !childIds.has(i.id))

  const sharing = project ? title(project.id) : folder ? title(folder.id) : tabLabel(tab)
  const canGoBack = !!project || !!folder

  return (
    <section className="share" aria-label={t('call.sharing', 'Shared screen')}>
      <div className="share-head">
        {canGoBack && (
          <button
            className="icon-btn"
            onClick={() => (project ? setUI((prev) => ({ ...prev, focusProjectId: null })) : setFolderId(null))}
            aria-label={t('call.back', 'Back')}
          >
            <BackIcon />
          </button>
        )}
        <div className="share-status">
          {t('call.isSharing', 'Rahul is sharing')} · <b>{sharing}</b>
        </div>
        <button className="icon-btn" onClick={stopSharing} aria-label={t('call.stopSharing', 'Stop sharing')}>
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
          <article className="project-detail">
            <h2>{title(project.id)}</h2>
            <MediaCarousel
              mainImage={project.image}
              videoId={project.videoId}
              videos={project.videos}
              gallery={project.gallery}
              title={title(project.id)}
            />
            <p>
              {t(`portfolio.items.${project.id}.extendedDescription`, { defaultValue: '' }) ||
                t(`portfolio.items.${project.id}.description`)}
            </p>
            {project.links && project.links.length > 0 && <LinkIcons links={project.links} />}
          </article>
        )}

        {tab === 'portfolio' && !project && (
          <div className="project-grid">
            {gridItems.map((item) => (
              <button key={item.id} className="project-card" onClick={() => openProject(item)}>
                {item.image && <img src={item.image} alt="" loading="lazy" />}
                <span>{title(item.id)}</span>
                {item.type === 'folder' && (
                  <small>
                    {t('call.projectsCount', '{{count}} projects', { count: item.children?.length ?? 0 })}
                  </small>
                )}
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
