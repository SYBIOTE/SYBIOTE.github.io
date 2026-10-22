// Portfolio link types
export type PortfolioLinkType = 'github' | 'demo' | 'itch' | 'youtube' | 'website' | 'download'

export interface PortfolioLink {
  type: PortfolioLinkType
  url: string
}

// Portfolio content types
export interface PortfolioItem {
  id: string
  image?: string
  videoId?: string
  videos?: string[]            // additional video IDs for carousel
  order: number
  type?: 'folder' | 'project'  // default: 'project'
  children?: string[]          // only if type is 'folder'
  gallery?: string[]           // additional images for carousel
  links?: PortfolioLink[]      // external links
}

export interface PortfolioContent {
  items: PortfolioItem[]
}

// Resume data types (for ordering)
export interface ResumeJobData {
  id: string
  order: number
}

export interface ResumeData {
  jobs: ResumeJobData[]
}

// Resume content types (for i18n structure)
export interface ExperienceJob {
  title: string
  period: string
  achievements: string[]
}

export interface ResumeExperience {
  title: string
  jobs: Record<string, ExperienceJob>
}

export interface ResumeEducation {
  title: string
  degree: string
  institution: string
  period: string
}

// Leadership item with optional link
export interface LeadershipItem {
  text: string
  link?: string
  linkLabel?: string
}

export interface ResumeLeadership {
  title: string
  items: Record<string, LeadershipItem>
}

// A line of skills, e.g. { name: 'Frontend', items: 'React, Next.js, Vite' }
export interface SkillGroup {
  name: string
  items: string
}

export interface ResumeSkills {
  title: string
  groups: Record<string, SkillGroup>
}

export interface ResumeSummary {
  title: string
  content: string
}

export interface ResumeContent {
  summary: ResumeSummary
  education: ResumeEducation
  leadership: ResumeLeadership
  skills?: ResumeSkills
  experience: ResumeExperience
}

// Services content types (for i18n structure)
export interface ServiceItem {
  name: string
  desc: string
}

export interface ServicesContent {
  items: Record<string, ServiceItem>
}

// Core info types (for i18n structure)
export interface CoreInfo {
  name: string
  email: string
  phone: string
  city: string
  website: string
  freelance: string
  role: string
}

// Portfolio i18n item (text content only)
export interface PortfolioI18nItem {
  title: string
  description: string
  extendedDescription?: string  // longer description for modal view
}

export interface PortfolioI18n {
  items: Record<string, PortfolioI18nItem>
}

// Full locale structure
export interface LocaleContent {
  core: CoreInfo
  sections: Record<string, string>
  labels: Record<string, string>
  profile: {
    about: {
      title: string
      summary: string
      quote: string
    }
  }
  settings: Record<string, unknown>
  contact: {
    description: string
    form: Record<string, string>
  }
  chat: Record<string, unknown>
  resume: ResumeContent
  services: ServicesContent
  portfolio: PortfolioI18n
}

// Available locales
export type LocaleCode = 'en' | 'de' | 'es' | 'fr' | 'hi' | 'ja'

export const LOCALE_CODES: LocaleCode[] = ['en', 'de', 'es', 'fr', 'hi', 'ja']

export const LOCALE_NAMES: Record<LocaleCode, string> = {
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  hi: 'हिन्दी',
  ja: '日本語'
}
