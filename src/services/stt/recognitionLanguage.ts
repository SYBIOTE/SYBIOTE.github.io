/**
 * Which language and accent speech recognition listens for: the site's UI language, in the
 * visitor's own regional variant when the browser has one (an Indian visitor using English is
 * recognised as en-IN, not en-US), else a sensible default region.
 */

const DEFAULT_REGIONS: Record<string, string> = {
  en: 'en-US',
  de: 'de-DE',
  es: 'es-ES',
  fr: 'fr-FR',
  hi: 'hi-IN',
  ja: 'ja-JP'
}

export const recognitionLanguage = (uiLanguage: string, browserLanguages: readonly string[] = navigator.languages ?? []): string => {
  const language = uiLanguage.slice(0, 2).toLowerCase()
  const regional = browserLanguages.find((l) => l.toLowerCase().startsWith(`${language}-`))
  return regional ?? DEFAULT_REGIONS[language] ?? uiLanguage
}
