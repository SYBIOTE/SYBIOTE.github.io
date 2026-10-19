/**
 * Post-call resume: a standalone, document-style resume (not the in-call panel), shown from
 * the "You left the call" screen without rejoining.
 */

import { useTranslation } from 'react-i18next'

import type { ExperienceJob, LeadershipItem } from '../../content/types'
import { getSortedJobs, useResumeData } from '../../content/useContent'
import { BackIcon } from '../callIcons'

const PROFILE_IMAGE = '/assets/img/profile-img.jpg'

interface Props {
  onBack: () => void
  onContact: () => void
}

export const ResumePage = ({ onBack, onContact }: Props) => {
  const { t } = useTranslation()
  const resumeData = useResumeData()

  const jobs = t('resume.experience.jobs', { returnObjects: true }) as Record<string, ExperienceJob>
  const order = getSortedJobs(resumeData).map((job) => job.id)
  const orderedJobs = [...order.filter((id) => jobs[id]), ...Object.keys(jobs).filter((id) => !order.includes(id))].map(
    (id) => ({ id, ...jobs[id] })
  )
  const leadership = Object.values(t('resume.leadership.items', { returnObjects: true }) as Record<string, LeadershipItem>)
  const services = Object.values(t('services.items', { returnObjects: true }) as Record<string, { name: string }>)
  const website = t('core.website')

  return (
    <div className="postcall">
      <header className="postcall-bar">
        <button className="pill ghost back" onClick={onBack}>
          <BackIcon /> {t('call.back', 'Back')}
        </button>
        <button className="pill primary" onClick={onContact}>
          {t('call.ended.message', 'Leave Rahul a message')}
        </button>
      </header>

      <article className="resume-doc">
        <header className="resume-head">
          <img src={PROFILE_IMAGE} alt="" />
          <div>
            <h1>{t('core.name')}</h1>
            <p className="resume-role">{t('core.role')}</p>
            <p className="resume-contact">
              <span>{t('core.city')}</span>
              <span className="selectable">{t('core.email')}</span>
              <a href={website} target="_blank" rel="noreferrer">
                {website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </a>
            </p>
          </div>
        </header>

        <section>
          <h2>{t('resume.summary.title')}</h2>
          <p className="resume-summary">{t('resume.summary.content')}</p>
        </section>

        <section>
          <h2>{t('resume.experience.title')}</h2>
          <ol className="timeline">
            {orderedJobs.map((job) => (
              <li key={job.id}>
                <div className="timeline-head">
                  <h3>{job.title}</h3>
                  <span className="period">{job.period}</span>
                </div>
                {job.achievements?.length > 0 && (
                  <ul>
                    {job.achievements.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </section>

        <div className="resume-columns">
          <section>
            <h2>{t('resume.education.title')}</h2>
            <h3>{t('resume.education.degree')}</h3>
            <p className="muted">{t('resume.education.institution')}</p>
            <p className="period">{t('resume.education.period')}</p>
          </section>
          <section>
            <h2>{t('resume.leadership.title')}</h2>
            <ul className="plain">
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
        </div>

        {services.length > 0 && (
          <section>
            <h2>{t('call.resume.focus', 'What I do')}</h2>
            <div className="tags">
              {services.map((service) => (
                <span key={service.name}>{service.name}</span>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  )
}
