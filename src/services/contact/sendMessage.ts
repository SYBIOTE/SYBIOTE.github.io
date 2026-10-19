import emailjs from '@emailjs/browser'

export interface ContactMessage {
  name: string
  email: string
  message: string
}

/** Sends a visitor's message to Rahul through EmailJS. Throws if it couldn't be sent. */
export const sendContactMessage = async ({ name, email, message }: ContactMessage): Promise<void> => {
  const result = await emailjs.send(
    'service_n1cikoc',
    'template_aj5oot7',
    { name, email, message, to_email: 'ghoshr698@gmail.com' },
    'jtyEaVhw3Qlskk8aL'
  )
  if (result.status !== 200) throw new Error(`EmailJS returned ${result.status}`)
}
