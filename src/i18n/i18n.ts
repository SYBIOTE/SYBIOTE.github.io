import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import content files (editable via dev panel)
import enContent from './locales/content/en.json'
import deContent from './locales/content/de.json'
import esContent from './locales/content/es.json'
import frContent from './locales/content/fr.json'
import hiContent from './locales/content/hi.json'
import jaContent from './locales/content/ja.json'

// Import UI files (fixed strings)
import enUI from './locales/ui/en.json'
import deUI from './locales/ui/de.json'
import esUI from './locales/ui/es.json'
import frUI from './locales/ui/fr.json'
import hiUI from './locales/ui/hi.json'
import jaUI from './locales/ui/ja.json'

// Helper to deep merge objects
function deepMerge<T extends Record<string, unknown>>(target: T, source: Record<string, unknown>): T {
  const output = { ...target } as Record<string, unknown>
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      output[key] = deepMerge(
        (output[key] || {}) as Record<string, unknown>,
        source[key] as Record<string, unknown>
      )
    } else {
      output[key] = source[key]
    }
  }
  return output as T
}

export const defaultNS = 'translation'
export const resources = {
  en: {
    translation: deepMerge(enContent, enUI)
  },
  de: {
    translation: deepMerge(deContent, deUI)
  },
  es: {
    translation: deepMerge(esContent, esUI)
  },
  fr: {
    translation: deepMerge(frContent, frUI)
  },
  hi: {
    translation: deepMerge(hiContent, hiUI)
  },
  ja: {
    translation: deepMerge(jaContent, jaUI)
  }
} as const

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    defaultNS,
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    
    // Language detection options
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'preferred-locale'
    },

    interpolation: {
      escapeValue: false // React already escapes values
    },

    // Debug mode for development
    debug: process.env.NODE_ENV === 'development'
  })

export default i18n
