/**
 * Resume tab of the shared screen: summary with contact chips, an experience timeline,
 * skills as chip groups, then achievements and education side by side.
 * Styles live in call.css (.rtab*), next to the post-call resume page it mirrors.
 */

import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { LinkedInIcon, MailIcon, MapPinIcon, XLogoIcon } from '../../call/callIcons'
import type { ExperienceJob, LeadershipItem, SkillGroup } from '../../content/types'
import { getSortedJobs, useResumeData } from '../../content/useContent'

const displayUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')

/** "Technical Advisor — Nira Animates" -> role and company */
const splitTitle = (title: string) => {
  const at = title.indexOf(' — ')
  return at < 0 ? { role: title, company: '' } : { role: title.slice(0, at), company: title.slice(at + 3) }
}

const Chip = ({ icon, href, children }: { icon: ReactNode; href?: string; children: ReactNode }) =>
  href ? (
    <a className="rtab-chip" href={href} target={href.startsWith('mailto:') ? undefined : '_blank'} rel="noreferrer">
      {icon}
      {children}
    </a>
  ) : (
    <span className="rtab-chip">
      {icon}
      {children}
    </span>
  )

export const ResumeSection = () => {
  const { t } = useTranslation()
  const resumeData = useResumeData()

  const jobs = t('resume.experience.jobs', { returnObjects: true }) as Record<string, ExperienceJob>
  const sortedJobs = getSortedJobs(resumeData)
  const order = sortedJobs.map((job) => job.id)
  const orderedJobs = [...order.filter((id) => jobs[id]), ...Object.keys(jobs).filter((id) => !order.includes(id))].map(
    (id) => ({ id, ...jobs[id], ...sortedJobs.find((job) => job.id === id) })
  )
  const leadership = Object.values(t('resume.leadership.items', { returnObjects: true }) as Record<string, LeadershipItem>)
  const skills = Object.values((t('resume.skills.groups', { returnObjects: true }) as Record<string, SkillGroup> | string) || {}).filter(
    (group): group is SkillGroup => typeof group === 'object'
  )

  return (
    <div className="rtab">
      <header className="rtab-intro">
        <p className="rtab-summary">{t('resume.summary.content')}</p>
        <div className="rtab-chips">
          <Chip icon={<MapPinIcon />}>{t('core.city')}</Chip>
          <Chip icon={<MailIcon />} href={`mailto:${t('core.email')}`}>
            {t('core.email')}
          </Chip>
          <Chip icon={<LinkedInIcon />} href={t('core.linkedin')}>
            {displayUrl(t('core.linkedin'))}
          </Chip>
          <Chip icon={<XLogoIcon />} href={t('core.x')}>
            {displayUrl(t('core.x'))}
          </Chip>
        </div>
      </header>

      <section>
        <h3 className="rtab-label">{t('resume.experience.title')}</h3>
        <ol className="timeline rtab-timeline">
          {orderedJobs.map((job) => {
            const { role, company } = splitTitle(job.title)
            // "Jun 2025 — Present" in any language: the end has no year
            const current = !/\d/.test(job.period.split('—').pop() ?? '')
            return (
              <li key={job.id} className={current ? 'current' : undefined}>
                <div className="rtab-job-head">
                  {job.logo && (
                    <span className="rtab-logo">
                      <img src={job.logo} alt="" className={job.logoInvert ? 'invert' : undefined} loading="lazy" />
                    </span>
                  )}
                  <div className="rtab-job-title">
                    <h4>{role}</h4>
                    {company && <span className="rtab-company">{company}</span>}
                  </div>
                  <span className="rtab-period">{job.period}</span>
                </div>
                {job.achievements?.length > 0 && (
                  <ul>
                    {job.achievements.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ol>
      </section>

      {skills.length > 0 && (
        <section>
          <h3 className="rtab-label">{t('resume.skills.title')}</h3>
          <div className="rtab-skills">
            {skills.map((group) => (
              <div key={group.name} className="rtab-skill-group">
                <span>{group.name}</span>
                <div className="tags">
                  {group.items.split(',').map((skill) => (
                    <span key={skill}>{skill.trim()}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="rtab-split">
        <section className="rtab-card">
          <h3 className="rtab-label">{t('resume.leadership.title')}</h3>
          <ul className="rtab-awards">
            {leadership.map((item) => (
              <li key={item.text}>
                {item.text}
                {item.link && (
                  <>
                    {' '}
                    <a href={item.link} target="_blank" rel="noreferrer">
                      {item.linkLabel || 'link'}
                    </a>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
        <section className="rtab-card">
          <h3 className="rtab-label">{t('resume.education.title')}</h3>
          <h4>{t('resume.education.degree')}</h4>
          <p className="rtab-muted">{t('resume.education.institution')}</p>
          <span className="rtab-period">{t('resume.education.period')}</span>
        </section>
      </div>
    </div>
  )
}

export default ResumeSection
