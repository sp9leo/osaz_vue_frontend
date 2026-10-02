import frappeApi from '@/api/frappe'
import { PIN_LENGTH } from '@/api/quickEntry'

export const DOCTYPE = 'HitriVpis'

const FIELDS = ['name', 'display', 'priimek_ime', 'user', 'dovoljen', 'pin']

// Identity fields (display, priimek_ime, user) are maintained in Frappe; the app
// writes only pin and dovoljen. Nothing on this DocType is readable by Guest, so
// every call here goes out session-authorized, with the shared API key stripped:
// the roster page needs a logged-in Administrator, and the PIN check happens on the
// server in intranet/api.py rather than here.
const sessionOnly = {
  headers: { Authorization: null },
  skipInterceptor: true,
}

export const getQuickEntryUsers = async () => {
  const response = await frappeApi.get(`/api/resource/${DOCTYPE}`, {
    ...sessionOnly,
    params: {
      fields: JSON.stringify(FIELDS),
      order_by: 'display asc',
      limit: 200,
    },
  })
  const data = response.data?.data || response.data
  if (!Array.isArray(data)) {
    return []
  }
  return data
}

export const getQuickEntryUser = async (name) => {
  const response = await frappeApi.get(`/api/resource/${DOCTYPE}/${name}`, sessionOnly)
  return response.data?.data || response.data
}

export const updateQuickEntryUser = async (name, userData) => {
  const response = await frappeApi.put(`/api/resource/${DOCTYPE}/${name}`, {
    ...sessionOnly,
    data: userData,
  })
  return response.data
}

const PIN_ERROR = 'Preverjanje PIN ni uspelo: '

// The PIN is compared in Frappe, so it never reaches the browser and the roster
// needs no Guest permission. Skip the interceptor so a failure here shows a
// message on the numpad instead of redirecting to /login.
export const verifyPin = async (pin) => {
  try {
    const response = await frappeApi.post('/api/method/intranet.api.verify_pin', {
      ...sessionOnly,
      data: { pin: String(pin || '').slice(0, PIN_LENGTH) },
    })
    const result = response.data?.message || response.data || {}
    return { ok: !!result.ok, retry: !!result.retry, user: result.user || null }
  } catch (e) {
    const status = e.response?.status
    if (status === 404) {
      throw new Error('Preverjanje PIN ni nastavljeno na strežniku')
    }
    throw new Error(PIN_ERROR + (e.message || 'Neznana napaka'))
  }
}