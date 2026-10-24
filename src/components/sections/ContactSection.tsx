/**
 * Contact tab of the shared screen: availability and ways to reach Rahul on one side, the
 * message form on the other (stacked when narrow). Styles live in call.css (.ctab*, .contact-form).
 */

import type { FormEvent, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CheckIcon, CopyIcon, LinkedInIcon, MailIcon, PhoneIcon, XLogoIcon } from '../../call/callIcons'
import { sendContactMessage } from '../../services/contact/sendMessage'

const displayUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')

interface MethodProps {
  icon: ReactNode
  label: string
  value: string
  href?: string
  action?: ReactNode
}

const Method = ({ icon, label, value, href, action }: MethodProps) => {
  const body = (
    <>
      <span className="ctab-method-icon">{icon}</span>
      <span className="ctab-method-text">
        <small>{label}</small>
        <span>{value}</span>
      </span>
    </>
  )
  return (
    <li className="ctab-method">
      {href ? (
        <a href={href} target={href.startsWith('mailto:') ? undefined : '_blank'} rel="noreferrer">
          {body}
        </a>
      ) : (
        <div>{body}</div>
      )}
      {action}
    </li>
  )
}

export const ContactSection = () => {
  const { t } = useTranslation()
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [copied, setCopied] = useState(false)
  const email = t('core.email')

  // The "sent" note fades back to the empty form after a few seconds
  useEffect(() => {
    if (status !== 'sent') return
    const timer = setTimeout(() => setStatus('idle'), 4000)
    return () => clearTimeout(timer)
  }, [status])

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    try {
      await sendContactMessage(form)
      setStatus('sent')
      setForm({ name: '', email: '', message: '' })
    } catch (error) {
      logger.error('Error sending email:', error)
      setStatus('error')
    }
  }

  const copyEmail = () => {
    navigator.clipboard?.writeText(email).then(
      () => setCopied(true),
      () => {}
    )
  }

  return (
    <div className="ctab">
      <aside className="ctab-info">
        <span className="ctab-status">
          <i aria-hidden="true" />
          {t('labels.freelance')} {t('core.freelance')}
        </span>
        <h3>{t('call.contact.heading', "Let's build something")}</h3>
        <p>{t('contact.description')}</p>
        <ul className="ctab-methods">
          <Method
            icon={<MailIcon />}
            label={t('call.email', 'Email')}
            value={email}
            href={`mailto:${email}`}
            action={
              <button
                type="button"
                className="icon-btn ctab-copy"
                onClick={copyEmail}
                aria-label={copied ? t('call.copied', 'Copied') : t('call.copyEmail', 'Copy email')}
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
              </button>
            }
          />
          <Method icon={<LinkedInIcon />} label={t('call.linkedin', 'LinkedIn')} value={displayUrl(t('core.linkedin'))} href={t('core.linkedin')} />
          <Method icon={<XLogoIcon />} label={t('call.x', 'X')} value={displayUrl(t('core.x'))} href={t('core.x')} />
          <Method icon={<PhoneIcon />} label={t('call.phone', 'Phone')} value={t('core.phone')} />
        </ul>
      </aside>

      <form className="contact-form ctab-form" onSubmit={submit}>
        <div className="contact-row">
          <label htmlFor="ctab-name">
            <span>{t('call.contact.name', 'Your name')}</span>
            <input id="ctab-name" value={form.name} onChange={update('name')} required autoComplete="name" />
          </label>
          <label htmlFor="ctab-email">
            <span>{t('call.contact.email', 'Your email')}</span>
            <input id="ctab-email" type="email" value={form.email} onChange={update('email')} required autoComplete="email" />
          </label>
        </div>
        <label htmlFor="ctab-message">
          <span>{t('call.contact.message', 'Message')}</span>
          <textarea
            id="ctab-message"
            rows={5}
            value={form.message}
            onChange={update('message')}
            required
            placeholder={t('call.contact.placeholder', 'What are you building, and how can Rahul help?')}
          />
        </label>
        {status === 'sent' && (
          <p className="ctab-note ok" role="status">
            {t('contact.form.messageSent')}
          </p>
        )}
        {status === 'error' && (
          <p className="contact-error" role="alert">
            {t('call.contact.error', 'That didn’t send. Try again, or email {{email}} directly.', { email })}
          </p>
        )}
        <button className="pill primary" type="submit" disabled={status === 'sending'}>
          {status === 'sending' ? t('call.contact.sending', 'Sending…') : t('call.contact.send', 'Send message')}
        </button>
      </form>
    </div>
  )
}

export default ContactSection
