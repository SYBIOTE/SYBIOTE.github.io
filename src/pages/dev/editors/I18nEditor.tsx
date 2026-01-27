import { useState, useCallback, type CSSProperties, useMemo } from 'react'
import { useLocaleContent, saveAllLocales } from '../../../content/useContent'
import { LOCALE_CODES, LOCALE_NAMES, type LocaleCode, type LocaleContent } from '../../../content/types'
import { SaveButton } from '../components/SaveButton'

// Styles
const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem'
}

const headerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '1rem'
}

const titleStyle: CSSProperties = {
  fontSize: '1.125rem',
  fontWeight: 600,
  color: 'rgba(255, 255, 255, 0.95)'
}

const filterContainerStyle: CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  flexWrap: 'wrap'
}

const filterButtonStyle: CSSProperties = {
  padding: '0.5rem 0.875rem',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '6px',
  background: 'transparent',
  color: 'rgba(255, 255, 255, 0.6)',
  cursor: 'pointer',
  fontSize: '0.75rem',
  fontWeight: 500,
  transition: 'all 0.2s ease'
}

const activeFilterStyle: CSSProperties = {
  ...filterButtonStyle,
  background: 'rgba(30, 136, 229, 0.2)',
  borderColor: 'rgba(30, 136, 229, 0.4)',
  color: 'rgba(255, 255, 255, 0.95)'
}

const searchInputStyle: CSSProperties = {
  padding: '0.5rem 0.875rem',
  borderRadius: '6px',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  background: 'rgba(255, 255, 255, 0.05)',
  color: 'rgba(255, 255, 255, 0.95)',
  fontSize: '0.8rem',
  outline: 'none',
  width: '200px'
}

const tableContainerStyle: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.02)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '12px',
  overflow: 'hidden'
}

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse'
}

const thStyle: CSSProperties = {
  padding: '0.875rem 1rem',
  textAlign: 'left',
  fontSize: '0.7rem',
  fontWeight: 600,
  color: 'rgba(255, 255, 255, 0.6)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  background: 'rgba(255, 255, 255, 0.03)',
  position: 'sticky',
  top: 0,
  zIndex: 1
}

const tdStyle: CSSProperties = {
  padding: '0.5rem',
  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  verticalAlign: 'top'
}

const keyTdStyle: CSSProperties = {
  ...tdStyle,
  padding: '0.875rem 1rem',
  fontSize: '0.75rem',
  fontFamily: 'monospace',
  color: 'rgba(255, 255, 255, 0.5)',
  width: '180px',
  minWidth: '180px'
}

const inputStyle: CSSProperties = {
  padding: '0.5rem',
  borderRadius: '4px',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  background: 'rgba(255, 255, 255, 0.03)',
  color: 'rgba(255, 255, 255, 0.95)',
  fontSize: '0.8rem',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  resize: 'vertical',
  minHeight: '32px'
}

// Sections to show in the filter
type SectionFilter = 'all' | 'core' | 'portfolio' | 'resume' | 'services' | 'contact' | 'sections' | 'labels'

// Helper to flatten object keys
function flattenObject(obj: Record<string, unknown>, prefix = ''): Array<{ key: string; value: string }> {
  const result: Array<{ key: string; value: string }> = []
  
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key
    
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result.push(...flattenObject(value as Record<string, unknown>, newKey))
    } else if (typeof value === 'string') {
      result.push({ key: newKey, value })
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === 'string') {
          result.push({ key: `${newKey}[${index}]`, value: item })
        }
      })
    }
  }
  
  return result
}

// Helper to get value from nested object
function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const parts = path.split('.')
  let current: unknown = obj
  
  for (const part of parts) {
    // Handle array notation like achievements[0]
    const arrayMatch = part.match(/^(.+)\[(\d+)\]$/)
    if (arrayMatch) {
      current = (current as Record<string, unknown>)?.[arrayMatch[1]]
      current = (current as unknown[])?.[parseInt(arrayMatch[2])]
    } else {
      current = (current as Record<string, unknown>)?.[part]
    }
  }
  
  return typeof current === 'string' ? current : ''
}

// Helper to set value in nested object
function setNestedValue(obj: Record<string, unknown>, path: string, value: string): Record<string, unknown> {
  const result = JSON.parse(JSON.stringify(obj)) as Record<string, unknown>
  const parts = path.split('.')
  let current = result
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    const arrayMatch = part.match(/^(.+)\[(\d+)\]$/)
    
    if (arrayMatch) {
      if (!current[arrayMatch[1]]) {
        current[arrayMatch[1]] = []
      }
      current = current[arrayMatch[1]] as Record<string, unknown>
      const index = parseInt(arrayMatch[2])
      if (!current[index]) {
        current[index] = {}
      }
      current = current[index] as Record<string, unknown>
    } else {
      if (!current[part]) {
        current[part] = {}
      }
      current = current[part] as Record<string, unknown>
    }
  }
  
  const lastPart = parts[parts.length - 1]
  const arrayMatch = lastPart.match(/^(.+)\[(\d+)\]$/)
  
  if (arrayMatch) {
    if (!current[arrayMatch[1]]) {
      current[arrayMatch[1]] = []
    }
    (current[arrayMatch[1]] as unknown[])[parseInt(arrayMatch[2])] = value
  } else {
    current[lastPart] = value
  }
  
  return result
}

export const I18nEditor = () => {
  const initialLocales = useLocaleContent()
  const [locales, setLocales] = useState<Record<LocaleCode, LocaleContent>>(initialLocales)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [filter, setFilter] = useState<SectionFilter>('all')
  const [search, setSearch] = useState('')

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    const success = await saveAllLocales(locales)
    setIsSaving(false)
    if (success) {
      setHasChanges(false)
    }
    return success
  }, [locales])

  const updateLocaleValue = (locale: LocaleCode, path: string, value: string) => {
    setLocales((prev) => ({
      ...prev,
      [locale]: setNestedValue(prev[locale] as unknown as Record<string, unknown>, path, value) as unknown as LocaleContent
    }))
    setHasChanges(true)
  }

  // Get all translatable keys from English locale
  const allKeys = useMemo(() => {
    return flattenObject(locales.en as unknown as Record<string, unknown>)
      .map(item => item.key)
      .filter(key => {
        // Filter out non-translatable keys
        if (key.startsWith('settings.')) return false
        if (key.startsWith('chat.')) return false
        return true
      })
  }, [locales.en])

  // Filter keys based on section
  const filteredKeys = useMemo(() => {
    let keys = allKeys

    // Filter by section
    if (filter !== 'all') {
      keys = keys.filter(key => key.startsWith(`${filter}.`))
    }

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase()
      keys = keys.filter(key => {
        if (key.toLowerCase().includes(searchLower)) return true
        // Also search in values
        for (const locale of LOCALE_CODES) {
          const value = getNestedValue(locales[locale] as unknown as Record<string, unknown>, key)
          if (value.toLowerCase().includes(searchLower)) return true
        }
        return false
      })
    }

    return keys
  }, [allKeys, filter, search, locales])

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h2 style={titleStyle}>Translations</h2>
          <p style={{ margin: '0.25rem 0 0', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.8rem' }}>
            {filteredKeys.length} keys • Side-by-side editing for all 6 languages
          </p>
        </div>
        <SaveButton
          onSave={handleSave}
          isSaving={isSaving}
          hasChanges={hasChanges}
        />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={filterContainerStyle}>
          {(['all', 'core', 'portfolio', 'resume', 'services', 'contact', 'sections', 'labels'] as SectionFilter[]).map((f) => (
            <button
              key={f}
              style={filter === f ? activeFilterStyle : filterButtonStyle}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <input
          style={searchInputStyle}
          placeholder="Search keys or values..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div style={tableContainerStyle}>
        <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Key</th>
                {LOCALE_CODES.map((locale) => (
                  <th key={locale} style={{ ...thStyle, minWidth: '150px' }}>
                    {LOCALE_NAMES[locale]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredKeys.map((key) => (
                <tr key={key}>
                  <td style={keyTdStyle}>{key}</td>
                  {LOCALE_CODES.map((locale) => {
                    const value = getNestedValue(locales[locale] as unknown as Record<string, unknown>, key)
                    const isLong = value.length > 50

                    return (
                      <td key={locale} style={tdStyle}>
                        {isLong ? (
                          <textarea
                            style={{ ...inputStyle, minHeight: '60px' }}
                            value={value}
                            onChange={(e) => updateLocaleValue(locale, key, e.target.value)}
                            placeholder={`[${locale}]`}
                          />
                        ) : (
                          <input
                            style={inputStyle}
                            value={value}
                            onChange={(e) => updateLocaleValue(locale, key, e.target.value)}
                            placeholder={`[${locale}]`}
                          />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredKeys.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255, 255, 255, 0.5)' }}>
          No translation keys found matching your filters.
        </div>
      )}
    </div>
  )
}

export default I18nEditor
