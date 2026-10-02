export const PIN_LENGTH = 6

const SESSION_KEY = 'quick_entry_user'

// Quick entry behaves like the reports app: the PIN is checked on the server and
// the tab stays signed in until it is closed. Frappe owns that check, so no PIN
// ever reaches the browser.
export const signIn = (user) => {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user))
}

export const getSession = () => {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

export const signOut = () => {
  sessionStorage.removeItem(SESSION_KEY)
}

export const authorName = (user) => user?.user || user?.display || user?.priimek_ime || ''

export const randomPin = () => {
  const digits = new Uint32Array(PIN_LENGTH)
  crypto.getRandomValues(digits)
  return Array.from(digits, (value) => value % 10).join('')
}