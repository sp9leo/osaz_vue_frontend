import { getQuickEntryUsers } from '@/modules/admin/api/hitrivpis'

// These two must stay in sync with the PINs already stored in HitriVpis.
// Changing them invalidates every PIN that has been set so far.
export const PBKDF2_ITERATIONS = 600000
export const PIN_LENGTH = 6

const DEFAULT_SALT = 'osaz-hitri-vpis'

// crypto.subtle only exists in a secure context, so the PIN flow cannot work on a
// page served over plain HTTP. getRandomValues does work, which is why only the
// derivation was failing.
export const PIN_CRYPTO_UNAVAILABLE =
  'Preverjanje PIN zahteva HTTPS. Spletno mesto je odprto prek HTTP - odpri ga prek https:// ali na localhost.'

export const isPinCryptoAvailable = () => typeof crypto !== 'undefined' && !!crypto.subtle

let usersCache = null

const toHex = (bytes) => Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')

export const randomSalt = () => {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return toHex(bytes)
}

export const derivePin = async (pin, salt) => {
  if (!isPinCryptoAvailable()) {
    throw new Error(PIN_CRYPTO_UNAVAILABLE)
  }
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt || DEFAULT_SALT), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    256
  )
  return toHex(new Uint8Array(bits))
}

export const fetchQuickEntryUsers = async (force = false) => {
  if (usersCache && !force) return usersCache
  usersCache = await getQuickEntryUsers(true)
  return usersCache
}

export const invalidateQuickEntryUsers = () => {
  usersCache = null
}

export const authenticatePin = async (pin) => {
  const users = await fetchQuickEntryUsers()
  if (!users.length) return null

  // One site-wide salt is shared by all rows, so a single derive per login is enough.
  const salt = users.find((user) => user.sol)?.sol || DEFAULT_SALT
  const hash = await derivePin(pin, salt)
  const matches = users.filter((user) => String(user.pin_hash || '').trim().toLowerCase() === hash)

  if (matches.length > 1) {
    console.warn('Hitri vpis: več uporabnikov ima enak PIN:', matches.map((u) => u.display).join(', '))
  }

  return matches[0] || null
}