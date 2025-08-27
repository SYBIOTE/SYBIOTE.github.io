import type { CSSProperties, FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

const container: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  padding: '0.75rem 0rem',
  color: '#E6EAF2',
  overflowY: 'auto',
  overflowX: 'hidden'
}

const card: CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  padding: '0.75rem',
  backdropFilter: 'blur(8px)'
}

const fieldRow: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '0.5rem',
  marginBottom: '0.5rem'
}

const inputStyle: CSSProperties = {
  padding: '0.6rem 0.75rem 0.6rem 0.75rem',
  borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.06)',
  color: '#E6EAF2',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box'
}

const buttonStyle: CSSProperties = {
  marginTop: '0.5rem',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(255,255,255,0.06)',
  color: '#fff',
  borderRadius: '9999px',
  padding: '0.5rem 0.8rem',
  cursor: 'pointer',
  backdropFilter: 'blur(10px)'
}

export const ContactSection = () => {
  const { t } = useTranslation()
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    alert(t("contact.form.messageSent"))
  }
  return (
    <div style={container}  className='no-scrollbar'>
      <div style={{ ...card, marginBottom: '0.75rem' }}>
        <div style={{ color: '#A8B3C8', fontSize: '0.95rem', marginBottom: '0.5rem' }}>
          {t("contact.description")}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#C9D4E5' }}>
          <span style={{ opacity: 0.85 }}>{t("labels.email")}</span>
          <a href="https://mail.google.com/mail/?view=cm&to=ghoshr698@gmail.com" target="_blank" rel="noopener noreferrer" style={{ color: '#E6EAF2', textDecoration: 'none', opacity: 0.9 }}>{t("core.email")}</a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#C9D4E5' }}>
          <span style={{ opacity: 0.85 }}>{t("labels.phone")}</span>
          <span style={{ color: '#E6EAF2', opacity: 0.9 }}>{t("core.phone")}</span>
        </div>
      </div>
      <div style={card}>
        <form onSubmit={handleSubmit}>
          <div style={fieldRow}>
            <input required placeholder={t("contact.form.namePlaceholder")} style={inputStyle} />
            <input required type="email" placeholder={t("contact.form.emailPlaceholder")} style={inputStyle} />
          </div>
          <div>
            <textarea required placeholder={t("contact.form.messagePlaceholder")} style={{ ...inputStyle, minHeight: '8rem', width: '100%', resize: 'vertical' }} />
          </div>
          <button type="submit" style={buttonStyle}>{t("contact.form.sendButton")}</button>
        </form>
      </div>
    </div>
  )
}

export default ContactSection


