/**
 * The "Get yours" form on the AI twin landing page (ai-twin.html). Sends through the same EmailJS
 * setup as the contact tab in the call, tagged so the enquiry stands out in the inbox.
 */

import { readGuestName } from '../../call/guestName'
import { sendContactMessage } from '../../services/contact/sendMessage'

const EMAIL = 'ghoshr698@gmail.com'

const form = document.querySelector<HTMLFormElement>('#contact')
const status = form?.querySelector<HTMLElement>('.status')
const button = form?.querySelector<HTMLButtonElement>('button[type="submit"]')

const show = (text: string, kind: 'ok' | 'error' | '' = '') => {
  if (!status) return
  status.textContent = text
  status.className = `status ${kind}`.trim()
}

// Visitors who've been on a call here already told us their name
const nameField = form?.querySelector<HTMLInputElement>('[name="name"]')
if (nameField && !nameField.value) nameField.value = readGuestName()

// "Get yours" links jump here: put the cursor in the first field still to fill
const focusForm = () => {
  if (location.hash !== '#contact') return
  const fields = form?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea') ?? []
  ;[...fields].find((field) => !field.value)?.focus({ preventScroll: true })
}
window.addEventListener('hashchange', focusForm)
focusForm()

form?.addEventListener('submit', async (event) => {
  event.preventDefault()
  if (!form.reportValidity()) return
  const data = new FormData(form)
  const field = (name: string) => String(data.get(name) ?? '').trim()

  if (button) button.disabled = true
  show('Sending…')
  try {
    await sendContactMessage({
      name: field('name'),
      email: field('email'),
      message: `[AI twin enquiry, from rahulghosh.com/ai-twin]\n\n${field('message')}`
    })
    form.reset()
    if (nameField) nameField.value = readGuestName()
    show("Thanks! I'll get back to you by email soon.", 'ok')
  } catch {
    show(`That didn't send. Try again, or email ${EMAIL} directly.`, 'error')
  } finally {
    if (button) button.disabled = false
  }
})
