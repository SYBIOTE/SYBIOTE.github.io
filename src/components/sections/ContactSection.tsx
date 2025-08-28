import type { CSSProperties, FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import emailjs from '@emailjs/browser'

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
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      // Using EmailJS to send emails
      // You'll need to set up your EmailJS account and get these credentials
      const result = await emailjs.send(
        'service_n1cikoc', // Replace with your EmailJS service ID
        'template_aj5oot7', // Replace with your EmailJS template ID
        {
          from_name: formData.name,
          from_email: formData.email,
          message: formData.message,
          to_email: 'ghoshr698@gmail.com', // Your email address
        },
        'jtyEaVhw3Qlskk8aL' // Replace with your EmailJS public key
      )

      if (result.status === 200) {
        setSubmitStatus('success')
        setFormData({ name: '', email: '', message: '' })
      } else {
        throw new Error('Failed to send email')
      }
    } catch (error) {
      console.error('Error sending email:', error)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
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
        {submitStatus === 'success' && (
          <div style={{ 
            background: 'rgba(34, 197, 94, 0.1)', 
            border: '1px solid rgba(34, 197, 94, 0.3)', 
            borderRadius: '8px', 
            padding: '0.75rem', 
            marginBottom: '1rem',
            color: '#22c55e'
          }}>
            {t("contact.form.messageSent")}
          </div>
        )}
        {submitStatus === 'error' && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.3)', 
            borderRadius: '8px', 
            padding: '0.75rem', 
            marginBottom: '1rem',
            color: '#ef4444'
          }}>
            {t("contact.form.errorMessage") || "Failed to send message. Please try again."}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div style={fieldRow}>
            <input 
              required 
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder={t("contact.form.namePlaceholder")} 
              style={inputStyle} 
            />
            <input 
              required 
              name="email"
              type="email" 
              value={formData.email}
              onChange={handleInputChange}
              placeholder={t("contact.form.emailPlaceholder")} 
              style={inputStyle} 
            />
          </div>
          <div>
            <textarea 
              required 
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              placeholder={t("contact.form.messagePlaceholder")} 
              style={{ ...inputStyle, minHeight: '8rem', width: '100%', resize: 'vertical' }} 
            />
          </div>
          <button 
            type="submit" 
            disabled={isSubmitting}
            style={{ 
              ...buttonStyle, 
              opacity: isSubmitting ? 0.6 : 1,
              cursor: isSubmitting ? 'not-allowed' : 'pointer'
            }}
          >
            {isSubmitting ? t("contact.form.sendingButton") || "Sending..." : t("contact.form.sendButton")}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ContactSection


