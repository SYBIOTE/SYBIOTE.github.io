import { useState, useCallback, type CSSProperties } from 'react'
import { useLocaleContent, saveLocaleContent } from '../../../content/useContent'
import type { LocaleCode, LocaleContent, ServiceItem } from '../../../content/types'
import { SaveButton } from '../components/SaveButton'
import { LocaleSelector } from '../components/LocaleSelector'

// Styles
const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem'
}

const headerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
}

const titleStyle: CSSProperties = {
  fontSize: '1.125rem',
  fontWeight: 600,
  color: 'rgba(255, 255, 255, 0.95)'
}

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
  gap: '1rem'
}

const cardStyle: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '12px',
  padding: '1.25rem'
}

const labelStyle: CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'rgba(255, 255, 255, 0.6)',
  marginBottom: '0.375rem',
  display: 'block'
}

const inputStyle: CSSProperties = {
  padding: '0.625rem',
  borderRadius: '6px',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  background: 'rgba(255, 255, 255, 0.05)',
  color: 'rgba(255, 255, 255, 0.95)',
  fontSize: '0.875rem',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  marginBottom: '0.75rem'
}

const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: '80px',
  resize: 'vertical',
  marginBottom: 0
}

const serviceKeyStyle: CSSProperties = {
  fontSize: '0.7rem',
  color: 'rgba(255, 255, 255, 0.4)',
  marginBottom: '0.75rem',
  fontFamily: 'monospace'
}

const addButtonStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  padding: '2rem',
  border: '2px dashed rgba(255, 255, 255, 0.2)',
  borderRadius: '12px',
  background: 'transparent',
  color: 'rgba(255, 255, 255, 0.5)',
  cursor: 'pointer',
  fontSize: '0.875rem',
  fontWeight: 500,
  transition: 'all 0.2s ease',
  minHeight: '180px'
}

const deleteButtonStyle: CSSProperties = {
  padding: '0.5rem 1rem',
  border: '1px solid rgba(239, 68, 68, 0.3)',
  borderRadius: '6px',
  background: 'transparent',
  color: 'rgba(239, 68, 68, 0.8)',
  cursor: 'pointer',
  fontSize: '0.75rem',
  marginTop: '0.75rem'
}

export const ServicesEditor = () => {
  const locales = useLocaleContent()
  const [selectedLocale, setSelectedLocale] = useState<LocaleCode>('en')
  const [content, setContent] = useState<LocaleContent>(locales.en)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const handleLocaleChange = (newLocale: LocaleCode) => {
    if (hasChanges) {
      if (!confirm('You have unsaved changes. Switch locale anyway?')) {
        return
      }
    }
    setSelectedLocale(newLocale)
    setContent(locales[newLocale])
    setHasChanges(false)
  }

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    const success = await saveLocaleContent(selectedLocale, content)
    setIsSaving(false)
    if (success) {
      setHasChanges(false)
    }
    return success
  }, [content, selectedLocale])

  const updateService = (serviceKey: string, field: keyof ServiceItem, value: string) => {
    setContent((prev) => {
      const newContent = JSON.parse(JSON.stringify(prev)) as LocaleContent
      if (!newContent.services) {
        newContent.services = { items: {} }
      }
      if (!newContent.services.items[serviceKey]) {
        newContent.services.items[serviceKey] = { name: '', desc: '' }
      }
      newContent.services.items[serviceKey][field] = value
      return newContent
    })
    setHasChanges(true)
  }

  const addService = () => {
    const newKey = `newService${Date.now()}`
    setContent((prev) => {
      const newContent = JSON.parse(JSON.stringify(prev)) as LocaleContent
      if (!newContent.services) {
        newContent.services = { items: {} }
      }
      newContent.services.items[newKey] = { name: 'New Service', desc: 'Description' }
      return newContent
    })
    setHasChanges(true)
  }

  const deleteService = (serviceKey: string) => {
    setContent((prev) => {
      const newContent = JSON.parse(JSON.stringify(prev)) as LocaleContent
      delete newContent.services?.items?.[serviceKey]
      return newContent
    })
    setHasChanges(true)
  }

  const serviceKeys = Object.keys(content.services?.items || {})

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div>
            <h2 style={titleStyle}>Services</h2>
            <p style={{ margin: '0.25rem 0 0', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.8rem' }}>
              {serviceKeys.length} services
            </p>
          </div>
          <LocaleSelector value={selectedLocale} onChange={handleLocaleChange} />
        </div>
        <SaveButton
          onSave={handleSave}
          isSaving={isSaving}
          hasChanges={hasChanges}
        />
      </div>

      <div style={gridStyle}>
        {serviceKeys.map((serviceKey) => {
          const service = content.services?.items?.[serviceKey]
          if (!service) return null

          return (
            <div key={serviceKey} style={cardStyle}>
              <div style={serviceKeyStyle}>Key: {serviceKey}</div>
              
              <label style={labelStyle}>Service Name</label>
              <input
                style={inputStyle}
                value={service.name || ''}
                onChange={(e) => updateService(serviceKey, 'name', e.target.value)}
                placeholder="Service name"
              />

              <label style={labelStyle}>Description</label>
              <textarea
                style={textareaStyle}
                value={service.desc || ''}
                onChange={(e) => updateService(serviceKey, 'desc', e.target.value)}
                placeholder="Service description"
              />

              <button
                style={deleteButtonStyle}
                onClick={() => deleteService(serviceKey)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                Delete Service
              </button>
            </div>
          )
        })}

        <button
          style={addButtonStyle}
          onClick={addService}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(30, 136, 229, 0.5)'
            e.currentTarget.style.color = 'rgba(30, 136, 229, 0.8)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)'
          }}
        >
          + Add Service
        </button>
      </div>
    </div>
  )
}

export default ServicesEditor
