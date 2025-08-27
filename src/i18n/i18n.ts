import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import translation files
import enTranslations from './locales/en.json'
import esTranslations from './locales/es.json'
import frTranslations from './locales/fr.json'
import deTranslations from './locales/de.json'
import jaTranslations from './locales/ja.json'
import hiTranslations from './locales/hi.json'

export const defaultNS = 'translation'
export const resources = {
  en: {
    translation: enTranslations
  },
  es: {
    translation: esTranslations
  },
  fr: {
    translation: frTranslations
  },
  de: {
    translation: deTranslations
  },
  ja: {
    translation: jaTranslations
  },
  hi: {
    translation: hiTranslations
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
