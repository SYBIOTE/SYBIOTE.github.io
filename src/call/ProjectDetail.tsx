/**
 * One project on the shared screen, laid out like a case study: the story, then the media beside a
 * facts sheet (role, when, stack, links), then previous / next so Rahul can walk through them.
 */

import { memo, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { LinkChips, MediaCarousel } from '../components/portfolio'
import type { PortfolioItem } from '../content/types'
import { BackIcon, GridIcon } from './callIcons'

interface ProjectDetailProps {
  project: PortfolioItem
  /** The list it's being browsed in, for previous / next */
  siblings: PortfolioItem[]
  /** Every project, grouped, for jumping straight to another one */
  groups: { label: string; items: PortfolioItem[] }[]
  onOpen: (id: string) => void
}

/** The "Projects" switcher in the top-right corner */
const ProjectSwitcher = ({ current, groups, onOpen }: { current: string } & Pick<ProjectDetailProps, 'groups' | 'onOpen'>) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="project-switcher" ref={ref}>
      <button className="project-switcher-btn" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((o) => !o)}>
        <GridIcon />
        {t('call.allProjects', 'Projects')}
      </button>
      {open && (
        <div className="project-switcher-menu" role="menu">
          {groups.map((group) => (
            <div key={group.label} className="project-switcher-group">
              <span className="project-fact-label">{group.label}</span>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  role="menuitem"
                  aria-current={item.id === current || undefined}
                  onClick={() => {
                    setOpen(false)
                    onOpen(item.id)
                  }}
                >
                  {item.image && <img src={item.image} alt="" loading="lazy" className={item.imageFit === 'contain' ? 'contain' : undefined} />}
                  <span>{t(`portfolio.items.${item.id}.title`)}</span>
                  {item.date && !item.featured && <small>{item.date.slice(0, 4)}</small>}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const ProjectDetailComponent = ({ project, siblings, groups, onOpen }: ProjectDetailProps) => {
  const { t } = useTranslation()
  const key = `portfolio.items.${project.id}`
  const title = (id: string) => t(`portfolio.items.${id}.title`)

  const summary = t(`${key}.description`)
  const extended = t(`${key}.extendedDescription`, { defaultValue: '' })
  // A work project's role is that job's title on the resume ("Technical Advisor — Nira Animates")
  const role = project.job
    ? t(`resume.experience.jobs.${project.job}.title`, { defaultValue: '' }).split(' — ')[0]
    : t(`${key}.role`, { defaultValue: '' })

  const start = project.date?.slice(0, 4)
  const end = project.endDate === 'present' ? t('call.present', 'Present') : project.endDate?.slice(0, 4)
  const when = start && end && end !== start ? `${start} – ${end}` : start

  const index = siblings.findIndex((s) => s.id === project.id)
  const prev = index > 0 ? siblings[index - 1] : undefined
  const next = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : undefined

  const facts = [
    role && { label: t('call.fact.role', 'Role'), value: role },
    when && { label: t('call.fact.when', 'When'), value: when }
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <article className="project-detail">
      <header className="project-main">
        <div className="project-title-row">
          <h2>{title(project.id)}</h2>
          <ProjectSwitcher current={project.id} groups={groups} onOpen={onOpen} />
        </div>
        {/* The one-liner leads when there's a longer write-up below it */}
        {extended && <p className="project-tagline">{summary}</p>}
        <p className="project-body">{extended || summary}</p>
      </header>

      <div className="project-detail-grid">
        <div className="project-hero">
          <MediaCarousel
            mainImage={project.image}
            videoId={project.videoId}
            videos={project.videos}
            gallery={project.gallery}
            title={title(project.id)}
          />
        </div>
        {(facts.length > 0 || !!project.stack?.length || !!project.links?.length) && (
          <aside className="project-facts">
            {facts.map((fact) => (
              <div key={fact.label} className="project-fact">
                <span className="project-fact-label">{fact.label}</span>
                <span>{fact.value}</span>
              </div>
            ))}
            {!!project.stack?.length && (
              <div className="project-fact">
                <span className="project-fact-label">{t('call.fact.stack', 'Built with')}</span>
                <div className="project-stack">
                  {project.stack.map((tool) => (
                    <span key={tool}>{tool}</span>
                  ))}
                </div>
              </div>
            )}
            {!!project.links?.length && (
              <div className="project-fact">
                <span className="project-fact-label">{t('call.fact.links', 'Links')}</span>
                <LinkChips links={project.links} />
              </div>
            )}
          </aside>
        )}
      </div>

      {(prev || next) && (
        <nav className="project-pager" aria-label={t('call.moreProjects', 'More projects')}>
          {prev ? (
            <button className="project-pager-btn" onClick={() => onOpen(prev.id)}>
              <BackIcon />
              <span>
                <small>{t('call.previous', 'Previous')}</small>
                {title(prev.id)}
              </span>
            </button>
          ) : (
            <span />
          )}
          {next && (
            <button className="project-pager-btn next" onClick={() => onOpen(next.id)}>
              <span>
                <small>{t('call.next', 'Next')}</small>
                {title(next.id)}
              </span>
              <BackIcon />
            </button>
          )}
        </nav>
      )}
    </article>
  )
}

export const ProjectDetail = memo(ProjectDetailComponent)
