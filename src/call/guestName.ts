/**
 * The name a visitor gave in the waiting room, remembered in this browser so the next visit's
 * waiting room and every contact form (in the call, after it, and on the AI twin page) start with it.
 */

const NAME_KEY = 'call.guestName'

export const readGuestName = (): string => {
  try {
    return localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

export const saveGuestName = (name: string) => {
  try {
    localStorage.setItem(NAME_KEY, name)
  } catch {
    // storage unavailable
  }
}
