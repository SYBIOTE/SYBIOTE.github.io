/**
 * Post-call contact form: a standalone page shown from the "You left the call" screen
 * without rejoining. Sends through the same EmailJS setup as the in-call contact panel.
 */

import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { sendContactMessage } from '../../services/contact/sendMessage'
import { BackIcon } from '../callIcons'

const PROFILE_IMAGE = '/assets/img/profile-img.jpg'

interface Props {
  onBack: () => void
  /** Prefilled from the waiting room's name field */
  defaultName?: string
}

export const ContactPage = ({ onBack, defaultName = '' }: Props) => {
  const { t } = useTranslation()
  const [form, setForm] = useState({ name: defaultName, email: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    try {
      await sendContactMessage(form)
      setStatus('sent')
    } catch (error) {
      logger.error('Contact form:', error)
      setStatus('error')
    }
  }

  return (
    <div className="postcall">
      <header className="postcall-bar">
        <button className="pill ghost back" onClick={onBack}>
          <BackIcon /> {t('call.back', 'Back')}
        </button>
      </header>

      <div className="contact-card">
        <header className="contact-head">
          <img src={PROFILE_IMAGE} alt="" />
          <div>
            <h1>{t('call.contact.title', 'Leave Rahul a message')}</h1>
            <p>{t('contact.description')}</p>
          </div>
        </header>

        {status === 'sent' ? (
          <div className="contact-sent" role="status">
            <h2>{t('call.contact.sentTitle', 'Message sent')}</h2>
            <p>{t('call.contact.sentBody', 'Thanks! Rahul reads every message and will reply by email.')}</p>
            <button className="pill ghost" onClick={onBack}>
              {t('call.back', 'Back')}
            </button>
          </div>
        ) : (
          <form className="contact-form" onSubmit={submit}>
            <div className="contact-row">
              <label htmlFor="contact-name">
                <span>{t('call.contact.name', 'Your name')}</span>
                <input id="contact-name" value={form.name} onChange={update('name')} required autoComplete="name" />
              </label>
              <label htmlFor="contact-email">
                <span>{t('call.contact.email', 'Your email')}</span>
                <input id="contact-email" type="email" value={form.email} onChange={update('email')} required autoComplete="email" />
              </label>
            </div>
            <label htmlFor="contact-message">
              <span>{t('call.contact.message', 'Message')}</span>
              <textarea
                id="contact-message"
                rows={6}
                value={form.message}
                onChange={update('message')}
                required
                placeholder={t('call.contact.placeholder', 'What are you building, and how can Rahul help?')}
              />
            </label>
            {status === 'error' && (
              <p className="contact-error" role="alert">
                {t('call.contact.error', 'That didn’t send. Try again, or email {{email}} directly.', { email: t('core.email') })}
              </p>
            )}
            <div className="contact-actions">
              <span className="muted selectable">{t('core.email')}</span>
              <button className="pill primary" type="submit" disabled={status === 'sending'}>
                {status === 'sending' ? t('call.contact.sending', 'Sending…') : t('call.contact.send', 'Send message')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
