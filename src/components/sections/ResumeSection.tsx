import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

const container: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  padding: '0.75rem 0rem',
  color: 'rgba(240, 245, 255, 0.9)',
  overflowY: 'auto',
  overflowX: 'hidden',
}

const sectionCard: CSSProperties = {
  background: 'rgba(126, 126, 126, 0.19)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  padding: '0.75rem 0.85rem',
  marginBottom: '0.6rem',
  backdropFilter: 'blur(8px)',
  transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  cursor: 'pointer',
  boxShadow: 'none'
}

const subTitle: CSSProperties = {
  color: 'rgba(255, 255, 255, 0.95)',
  fontSize: '0.9rem',
  fontWeight: 600,
  marginBottom: '0.5rem'
}

const item: CSSProperties = {
  padding: '0.45rem 0',
  borderTop: '1px solid rgba(255,255,255,0.06)'
}

const itemHeader: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '1rem',
  marginBottom: '0.5rem'
}

const itemContent: CSSProperties = {
  width: '100%'
}

// Reusable Components
interface SectionCardProps {
  title: string
  children: ReactNode
}

const SectionCard = ({ title, children }: SectionCardProps) => (
  <div 
    style={sectionCard}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = 'radial-gradient(ellipse at center, rgba(255,255,255,0.02) 0%, rgba(255, 255, 255, 0.02) 70%, rgba(30,136,229,0.12) 100%)'
      e.currentTarget.style.borderColor = 'rgba(30,136,229,0.3)'
      e.currentTarget.style.transform = 'translateY(-2px)'
      e.currentTarget.style.boxShadow = '0 0.5rem 1rem rgba(30,136,229,0.15)'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'rgba(126, 126, 126, 0.19)'
      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
      e.currentTarget.style.transform = 'translateY(0)'
      e.currentTarget.style.boxShadow = 'none'
    }}
  >
    <div style={subTitle}>{title}</div>
    {children}
  </div>
)

interface ItemHeaderProps {
  title: string
  period?: string
}

const ItemHeader = ({ title, period }: ItemHeaderProps) => (
  <div style={itemHeader}>
    <div style={{ 
      fontWeight: 600, 
      color: 'rgba(255, 255, 255, 0.9)',
      fontSize: '1rem'
    }}>{title}</div>
    {period && <div style={{ 
      color: 'rgba(220, 230, 255, 0.8)', 
      whiteSpace: 'nowrap',
      fontSize: '0.9rem'
    }}>{period}</div>}
  </div>
)

interface ExperienceItemProps {
  title: string
  period: string
  achievements: string[]
}

const ExperienceItem = ({ title, period, achievements }: ExperienceItemProps) => (
  <div style={item}>
    <ItemHeader title={title} period={period} />
    <div style={itemContent}>
      <ul style={{ marginTop: '0.25rem', paddingLeft: '1.25rem', color: 'rgba(240, 245, 255, 0.85)' }}>
        {achievements.map((achievement: string, index: number) => (
          <li key={index}>{achievement}</li>
        ))}
      </ul>
    </div>
  </div>
)

interface EducationItemProps {
  degree: string
  institution: string
  period: string
}

const EducationItem = ({ degree, institution, period }: EducationItemProps) => (
  <div style={{ paddingTop: '0.25rem' }}>
    <div style={{ ...item, borderTop: 'none' }}>
      <ItemHeader title={degree} period={period} />
      <div style={itemContent}>
        <div style={{ color: 'rgba(220, 230, 255, 0.8)', fontSize: '0.9rem' }}>{institution}</div>
      </div>
    </div>
  </div>
)

interface ContactListProps {
  items: Array<{ label: string; value: string; isEmail?: boolean }>
}

const ContactList = ({ items }: ContactListProps) => (
  <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', color: 'rgba(240, 245, 255, 0.85)' }}>
    {items.map((item, index) => (
      <li key={index}>
        {item.isEmail ? (
          <a href={`mailto:${item.value}`} style={{ color: 'rgba(255, 255, 255, 0.9)', textDecoration: 'none', opacity: 0.9 }}>{item.value}</a>
        ) : (
          item.value
        )}
      </li>
    ))}
  </ul>
)

interface LeadershipListProps {
  items: Array<{ text: string; link?: { url: string; label: string } }>
}

const LeadershipList = ({ items }: LeadershipListProps) => (
  <ul style={{ marginTop: '0.25rem', paddingLeft: '1.25rem', color: 'rgba(240, 245, 255, 0.85)' }}>
    {items.map((item, index) => (
      <li key={index}>
        {item.text}
        {item.link && (
          <>
            {" "}
            <a href={item.link.url} target="_blank" rel="noreferrer" style={{ color: 'rgba(255, 255, 255, 0.9)', textDecoration: 'none', opacity: 0.9 }}>
              ({item.link.label})
            </a>
          </>
        )}
      </li>
    ))}
  </ul>
)

export const ResumeSection = () => {
  const { t } = useTranslation()
  
  // Data preparation
  const contactItems = [
    { label: 'location', value: t("core.city"), isEmail: false },
    { label: 'phone', value: t("core.phone"), isEmail: false },
    { label: 'email', value: t("core.email"), isEmail: true }
  ]

  const leadershipItems = [
    {
      text: t("resume.leadership.items.godotDojo"),
      link: { url: "https://github.com/Godot-Dojo", label: "link" }
    },
    {
      text: t("resume.leadership.items.gameClub"),
      link: { url: "https://youtu.be/HeLcvAUvC6U", label: "video" }
    },
    { text: t("resume.leadership.items.codingChallenge") },
    { text: t("resume.leadership.items.armyAward") },
    {
      text: t("resume.leadership.items.arProgram"),
      link: { url: "https://drive.google.com/file/d/1H37C3t_RPoISL1FuQ4TYG1dktKXXzbNB/view?usp=sharing", label: "certificate" }
    },
    {
      text: t("resume.leadership.items.googleCloud"),
      link: { url: "https://www.cloudskillsboost.google/public_profiles/d7e0f762-b53d-4ce8-aa1c-06e9a37029a5", label: "profile" }
    },
    { text: t("resume.leadership.items.interests") }
  ]

  const experienceJobs = [
    {
      title: t("resume.experience.jobs.infiniteReality.title"),
      period: t("resume.experience.jobs.infiniteReality.period"),
      achievements: t("resume.experience.jobs.infiniteReality.achievements", { returnObjects: true }) as string[]
    },
    {
      title: t("resume.experience.jobs.etherealEngine.title"),
      period: t("resume.experience.jobs.etherealEngine.period"),
      achievements: t("resume.experience.jobs.etherealEngine.achievements", { returnObjects: true }) as string[]
    },
    {
      title: t("resume.experience.jobs.metawarp.title"),
      period: t("resume.experience.jobs.metawarp.period"),
      achievements: t("resume.experience.jobs.metawarp.achievements", { returnObjects: true }) as string[]
    },
    {
      title: t("resume.experience.jobs.jioTesseract.title"),
      period: t("resume.experience.jobs.jioTesseract.period"),
      achievements: t("resume.experience.jobs.jioTesseract.achievements", { returnObjects: true }) as string[]
    },
    {
      title: t("resume.experience.jobs.prodigalTech.title"),
      period: t("resume.experience.jobs.prodigalTech.period"),
      achievements: t("resume.experience.jobs.prodigalTech.achievements", { returnObjects: true }) as string[]
    }
  ]
  
  return (
    <div style={container} className='no-scrollbar'>
      
      
      <SectionCard title={t("resume.summary.title")}>
          <div style={{ color: 'rgba(240, 245, 255, 0.9)', fontSize: '0.95rem', lineHeight: 1.5 }}>
          {t("resume.summary.content")}
        </div>
        <ContactList items={contactItems} />
      </SectionCard>

      <SectionCard title={t("resume.education.title")}>
        <EducationItem
          degree={t("resume.education.degree")}
          institution={t("resume.education.institution")}
          period={t("resume.education.period")}
        />
      </SectionCard>

      <SectionCard title={t("resume.leadership.title")}>
        <LeadershipList items={leadershipItems} />
      </SectionCard>

      <SectionCard title={t("resume.experience.title")}>
        <div style={{ paddingTop: '0.25rem' }}>
          {experienceJobs.map((job, index) => (
            <ExperienceItem
              key={index}
              title={job.title}
              period={job.period}
              achievements={job.achievements}
            />
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

export default ResumeSection


