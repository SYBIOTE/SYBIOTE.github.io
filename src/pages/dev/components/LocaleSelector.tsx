import { type CSSProperties } from 'react'
import { LOCALE_CODES, LOCALE_NAMES, type LocaleCode } from '../../../content/types'

const selectorContainerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem'
}

const labelStyle: CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'rgba(255, 255, 255, 0.6)'
}

const selectStyle: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.08)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '6px',
  padding: '0.375rem 0.75rem',
  color: 'rgba(255, 255, 255, 0.9)',
  fontSize: '0.875rem',
  cursor: 'pointer',
  outline: 'none',
  minWidth: '120px'
}

interface LocaleSelectorProps {
  value: LocaleCode
  onChange: (locale: LocaleCode) => void
  label?: string
}

export const LocaleSelector = ({ value, onChange, label = 'Language:' }: LocaleSelectorProps) => {
  return (
    <div style={selectorContainerStyle}>
      <span style={labelStyle}>{label}</span>
      <select
        style={selectStyle}
        value={value}
        onChange={(e) => onChange(e.target.value as LocaleCode)}
      >
        {LOCALE_CODES.map((code) => (
          <option key={code} value={code} style={{ background: '#1a1d21', color: 'white' }}>
            {LOCALE_NAMES[code]} ({code.toUpperCase()})
          </option>
        ))}
      </select>
    </div>
  )
}
