import { useState, useCallback, type CSSProperties } from 'react'
import { useLocaleContent, saveLocaleContent } from '../../../content/useContent'
import type { LocaleCode, LocaleContent, CoreInfo } from '../../../content/types'
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

const sectionStyle: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '12px',
  padding: '1.5rem'
}

const sectionTitleStyle: CSSProperties = {
  fontSize: '0.9rem',
  fontWeight: 600,
  color: 'rgba(255, 255, 255, 0.9)',
  marginBottom: '1.25rem'
}

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: '1rem'
}

const fieldStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column'
}

const labelStyle: CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'rgba(255, 255, 255, 0.6)',
  marginBottom: '0.375rem'
}

const inputStyle: CSSProperties = {
  padding: '0.75rem',
  borderRadius: '8px',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  background: 'rgba(255, 255, 255, 0.05)',
  color: 'rgba(255, 255, 255, 0.95)',
  fontSize: '0.875rem',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s ease'
}

const hintStyle: CSSProperties = {
  fontSize: '0.7rem',
  color: 'rgba(255, 255, 255, 0.4)',
  marginTop: '0.375rem'
}

const coreFields: Array<{ key: keyof CoreInfo; label: string; hint?: string }> = [
  { key: 'name', label: 'Full Name', hint: 'Your display name' },
  { key: 'role', label: 'Role / Title', hint: 'e.g., Software, Game & XR Developer' },
  { key: 'email', label: 'Email Address' },
  { key: 'phone', label: 'Phone Number' },
  { key: 'city', label: 'City / Location' },
  { key: 'website', label: 'Website URL' },
  { key: 'freelance', label: 'Freelance Status', hint: 'e.g., Available, Not Available' }
]

export const CoreEditor = () => {
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

  const updateCoreField = (field: keyof CoreInfo, value: string) => {
    setContent((prev) => {
      const newContent = JSON.parse(JSON.stringify(prev)) as LocaleContent
      if (!newContent.core) {
        newContent.core = {} as CoreInfo
      }
      newContent.core[field] = value
      return newContent
    })
    setHasChanges(true)
  }

  const updateProfileField = (path: string[], value: string) => {
    setContent((prev) => {
      const newContent = JSON.parse(JSON.stringify(prev)) as LocaleContent
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let obj: any = newContent
      for (let i = 0; i < path.length - 1; i++) {
        if (!obj[path[i]]) {
          obj[path[i]] = {}
        }
        obj = obj[path[i]]
      }
      obj[path[path.length - 1]] = value
      return newContent
    })
    setHasChanges(true)
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div>
            <h2 style={titleStyle}>Core Information</h2>
            <p style={{ margin: '0.25rem 0 0', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.8rem' }}>
              Basic site information and contact details
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

      {/* Contact Information */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Contact Information</h3>
        <div style={gridStyle}>
          {coreFields.map((field) => (
            <div key={field.key} style={fieldStyle}>
              <label style={labelStyle}>{field.label}</label>
              <input
                style={inputStyle}
                value={content.core?.[field.key] || ''}
                onChange={(e) => updateCoreField(field.key, e.target.value)}
                placeholder={field.label}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(30, 136, 229, 0.5)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'
                }}
              />
              {field.hint && <span style={hintStyle}>{field.hint}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* About Section */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Profile / About</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>About Title</label>
            <input
              style={inputStyle}
              value={content.profile?.about?.title || ''}
              onChange={(e) => updateProfileField(['profile', 'about', 'title'], e.target.value)}
              placeholder="About"
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(30, 136, 229, 0.5)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'
              }}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Summary</label>
            <textarea
              style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
              value={content.profile?.about?.summary || ''}
              onChange={(e) => updateProfileField(['profile', 'about', 'summary'], e.target.value)}
              placeholder="Hello there, I am {{name}}. I bend reality with coffee and code."
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(30, 136, 229, 0.5)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'
              }}
            />
            <span style={hintStyle}>Use {"{{name}}"} to insert your name dynamically</span>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Quote</label>
            <textarea
              style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
              value={content.profile?.about?.quote || ''}
              onChange={(e) => updateProfileField(['profile', 'about', 'quote'], e.target.value)}
              placeholder="Your favorite quote"
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(30, 136, 229, 0.5)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'
              }}
            />
          </div>
        </div>
      </div>

      {/* Contact Form */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Contact Section</h3>
        <div style={fieldStyle}>
          <label style={labelStyle}>Contact Description</label>
          <textarea
            style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
            value={content.contact?.description || ''}
            onChange={(e) => updateProfileField(['contact', 'description'], e.target.value)}
            placeholder="Need to build any 3D or immersive application..."
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'rgba(30, 136, 229, 0.5)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default CoreEditor
