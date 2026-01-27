import { type CSSProperties } from 'react'
import { LOCALE_CODES, LOCALE_NAMES, type LocaleCode } from '../../../content/types'

interface TranslationFieldProps {
  label: string
  translationKey: string
  values: Record<LocaleCode, string>
  onChange: (locale: LocaleCode, value: string) => void
  multiline?: boolean
}

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  marginBottom: '1rem'
}

const labelStyle: CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'rgba(255, 255, 255, 0.7)'
}

const keyStyle: CSSProperties = {
  fontSize: '0.65rem',
  fontFamily: 'monospace',
  color: 'rgba(255, 255, 255, 0.4)',
  marginLeft: '0.5rem'
}

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
  gap: '0.5rem'
}

const fieldContainerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem'
}

const localeTagStyle: CSSProperties = {
  fontSize: '0.65rem',
  fontWeight: 600,
  color: 'rgba(255, 255, 255, 0.5)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
}

const inputStyle: CSSProperties = {
  padding: '0.5rem',
  borderRadius: '6px',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  background: 'rgba(255, 255, 255, 0.03)',
  color: 'rgba(255, 255, 255, 0.95)',
  fontSize: '0.8rem',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s ease'
}

const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: '60px',
  resize: 'vertical'
}

export const TranslationField = ({
  label,
  translationKey,
  values,
  onChange,
  multiline = false
}: TranslationFieldProps) => {
  return (
    <div style={containerStyle}>
      <div>
        <span style={labelStyle}>{label}</span>
        <span style={keyStyle}>{translationKey}</span>
      </div>

      <div style={gridStyle}>
        {LOCALE_CODES.map((locale) => (
          <div key={locale} style={fieldContainerStyle}>
            <span style={localeTagStyle}>{LOCALE_NAMES[locale]}</span>
            {multiline ? (
              <textarea
                style={textareaStyle}
                value={values[locale] || ''}
                onChange={(e) => onChange(locale, e.target.value)}
                placeholder={`[${locale}]`}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(30, 136, 229, 0.4)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                }}
              />
            ) : (
              <input
                style={inputStyle}
                value={values[locale] || ''}
                onChange={(e) => onChange(locale, e.target.value)}
                placeholder={`[${locale}]`}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(30, 136, 229, 0.4)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default TranslationField
