import frappeApi from '@/api/frappe'

export const DOCTYPE = 'HitriVpis'

const FIELDS = ['name', 'display', 'priimek_ime', 'user', 'aktivna', 'pin_hash', 'sol']

// Identity fields (display, priimek_ime, user, aktivna) are maintained in Frappe.
// The app only ever writes the PIN hash and the site-wide salt.
//
// The shared API key is dropped on every HitriVpis call on purpose. The DocType is
// readable by Guest, and Frappe does not fall back to Guest permissions once a
// request carries an Authorization header, so with the key attached the request is
// authorized as the API key user - which has no role on this DocType and gets a 403.
// Without it the request is Guest (numpad) or the logged-in Administrator (admin
// page), both of which are allowed. As a bonus the key can no longer be used to read
// the PIN hashes.
const readParams = (filters) => ({
  params: {
    fields: JSON.stringify(FIELDS),
    filters: JSON.stringify(filters),
    order_by: 'display asc',
    limit: 200,
  },
  headers: { Authorization: null },
  skipInterceptor: true,
})

export const getQuickEntryUsers = async (onlyActive = false) => {
  const filters = onlyActive ? [['aktivna', '=', 1]] : []
  const response = await frappeApi.get(`/api/resource/${DOCTYPE}`, readParams(filters))
  const data = response.data?.data || response.data
  if (!Array.isArray(data)) {
    return []
  }
  return data
}

export const getQuickEntryUser = async (name) => {
  const response = await frappeApi.get(`/api/resource/${DOCTYPE}/${name}`, {
    headers: { Authorization: null },
    skipInterceptor: true,
  })
  return response.data?.data || response.data
}

// The PIN write is a session call as well: with the key, Frappe would authorize it
// as the API key user and the admin check in the UI would be the only thing standing
// between an anonymous visitor and the PINs.
export const updateQuickEntryUser = async (name, userData) => {
  const response = await frappeApi.put(`/api/resource/${DOCTYPE}/${name}`, {
    data: userData,
    skipInterceptor: true,
    headers: { Authorization: null },
  })
  return response.data
}