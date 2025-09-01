import type { CSSProperties, FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useState, useEffect } from 'react'
import emailjs from '@emailjs/browser'

const container: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  padding: '0.75rem 0rem',
  color: 'rgba(240, 245, 255, 0.9)',
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
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(255,255,255,0.08)',
  color: 'rgba(240, 245, 255, 0.95)',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  fontSize: '0.95rem',
  transition: 'border-color 0.2s ease, background 0.2s ease'
}

const buttonStyle: CSSProperties = {
  marginTop: '0.5rem',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  border: '1px solid rgba(255,255,255,0.2)',
  background: 'rgba(255,255,255,0.1)',
  color: 'rgba(255, 255, 255, 0.95)',
  borderRadius: '9999px',
  padding: '0.5rem 0.8rem',
  cursor: 'pointer',
  backdropFilter: 'blur(10px)',
  fontSize: '0.9rem',
  fontWeight: 500,
  transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  boxShadow: 'none'
}

// Add CSS animation keyframes
const fadeInOutKeyframes = `
  @keyframes fadeInOut {
    0% { opacity: 0; transform: translateY(-10px); }
    20% { opacity: 1; transform: translateY(0); }
    80% { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(-10px); }
  }
`

export const ContactSection = () => {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  // Add CSS animation to document head
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = fadeInOutKeyframes
    document.head.appendChild(style)
    
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  // Auto-hide success message after 3 seconds
  useEffect(() => {
    if (submitStatus === 'success') {
      const timer = setTimeout(() => {
        setSubmitStatus('idle')
      }, 3000)
      
      return () => clearTimeout(timer)
    }
  }, [submitStatus])

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
          name: formData.name,
          email: formData.email,
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
        <div style={{ color: 'rgba(220, 230, 255, 0.85)', fontSize: '0.95rem', marginBottom: '0.5rem', lineHeight: 1.5 }}>
          {t("contact.description")}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(200, 210, 230, 0.8)' }}>
          <span style={{ opacity: 0.9, fontWeight: 500 }}>{t("labels.email")}</span>
          <a href="https://mail.google.com/mail/?view=cm&to=ghoshr698@gmail.com" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(240, 245, 255, 0.95)', textDecoration: 'none', opacity: 0.9 }}>{t("core.email")}</a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(200, 210, 230, 0.8)' }}>
          <span style={{ opacity: 0.9, fontWeight: 500 }}>{t("labels.phone")}</span>
          <span style={{ color: 'rgba(240, 245, 255, 0.95)', opacity: 0.9 }}>{t("core.phone")}</span>
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
            color: '#22c55e',
            animation: 'fadeInOut 3s ease-in-out',
            opacity: 1
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
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(30,136,229,0.3) 0%, rgba(30,136,229,0.15) 100%)'
                e.currentTarget.style.borderColor = 'rgba(30,136,229,0.4)'
                e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 0.5rem 1rem rgba(30,136,229,0.25)'
              }
            }}
            onMouseLeave={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
                e.currentTarget.style.transform = 'scale(1) translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }
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


