import { useState, useEffect } from 'react'
import type { PortfolioContent, LocaleContent, LocaleCode, ResumeData } from './types'

// Import portfolio data - Vite will handle HMR for JSON imports
import portfolioData from './data/portfolio.json'
import resumeData from './data/resume.json'

// Import content files (editable via dev panel)
import enContent from '../i18n/locales/content/en.json'
import deContent from '../i18n/locales/content/de.json'
import esContent from '../i18n/locales/content/es.json'
import frContent from '../i18n/locales/content/fr.json'
import hiContent from '../i18n/locales/content/hi.json'
import jaContent from '../i18n/locales/content/ja.json'

const locales: Record<LocaleCode, LocaleContent> = {
  en: enContent as unknown as LocaleContent,
  de: deContent as unknown as LocaleContent,
  es: esContent as unknown as LocaleContent,
  fr: frContent as unknown as LocaleContent,
  hi: hiContent as unknown as LocaleContent,
  ja: jaContent as unknown as LocaleContent
}

// Hook to get portfolio content with HMR support
export function usePortfolioContent(): PortfolioContent {
  const [content, setContent] = useState<PortfolioContent>(portfolioData as PortfolioContent)

  useEffect(() => {
    // HMR support for portfolio data
    if (import.meta.hot) {
      import.meta.hot.accept('./data/portfolio.json', (newModule) => {
        if (newModule) {
          setContent(newModule.default as PortfolioContent)
        }
      })
    }
  }, [])

  return content
}

// Hook to get all locale content
export function useLocaleContent(): Record<LocaleCode, LocaleContent> {
  const [content, setContent] = useState<Record<LocaleCode, LocaleContent>>(locales)

  useEffect(() => {
    // HMR support for content files
    if (import.meta.hot) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateLocale = (locale: LocaleCode) => (newModule: any) => {
        if (newModule?.default) {
          setContent(prev => ({
            ...prev,
            [locale]: newModule.default as LocaleContent
          }))
        }
      }

      import.meta.hot.accept('../i18n/locales/content/en.json', updateLocale('en'))
      import.meta.hot.accept('../i18n/locales/content/de.json', updateLocale('de'))
      import.meta.hot.accept('../i18n/locales/content/es.json', updateLocale('es'))
      import.meta.hot.accept('../i18n/locales/content/fr.json', updateLocale('fr'))
      import.meta.hot.accept('../i18n/locales/content/hi.json', updateLocale('hi'))
      import.meta.hot.accept('../i18n/locales/content/ja.json', updateLocale('ja'))
    }
  }, [])

  return content
}

// API functions to save content (calls Vite dev server middleware)
export async function savePortfolioContent(data: PortfolioContent): Promise<boolean> {
  try {
    const response = await fetch('/api/content/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return response.ok
  } catch (error) {
    console.error('Failed to save portfolio content:', error)
    return false
  }
}

export async function saveLocaleContent(locale: LocaleCode, data: LocaleContent): Promise<boolean> {
  try {
    const response = await fetch(`/api/content/i18n/${locale}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return response.ok
  } catch (error) {
    console.error(`Failed to save ${locale} locale:`, error)
    return false
  }
}

export async function saveAllLocales(data: Record<LocaleCode, LocaleContent>): Promise<boolean> {
  try {
    const results = await Promise.all(
      (Object.keys(data) as LocaleCode[]).map(locale => 
        saveLocaleContent(locale, data[locale])
      )
    )
    return results.every(Boolean)
  } catch (error) {
    console.error('Failed to save all locales:', error)
    return false
  }
}

// Utility to get sorted portfolio items
export function getSortedPortfolioItems(content: PortfolioContent) {
  return [...content.items].sort((a, b) => a.order - b.order)
}

// Hook to get resume data with HMR support
export function useResumeData(): ResumeData {
  const [content, setContent] = useState<ResumeData>(resumeData as ResumeData)

  useEffect(() => {
    // HMR support for resume data
    if (import.meta.hot) {
      import.meta.hot.accept('./data/resume.json', (newModule) => {
        if (newModule) {
          setContent(newModule.default as ResumeData)
        }
      })
    }
  }, [])

  return content
}

// API function to save resume data
export async function saveResumeData(data: ResumeData): Promise<boolean> {
  try {
    const response = await fetch('/api/content/resume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return response.ok
  } catch (error) {
    console.error('Failed to save resume data:', error)
    return false
  }
}

// Utility to get sorted jobs
export function getSortedJobs(resumeData: ResumeData) {
  return [...resumeData.jobs].sort((a, b) => a.order - b.order)
}
