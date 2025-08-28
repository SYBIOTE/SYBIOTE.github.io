export type SupportedLocale = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'hi'

export const SUPPORTED_LOCALES: SupportedLocale[] = ['en', 'es', 'fr', 'de', 'ja', 'hi']

export const LOCALE_NAMES: Record<SupportedLocale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  ja: '日本語',
  hi: 'हिन्दी'
}