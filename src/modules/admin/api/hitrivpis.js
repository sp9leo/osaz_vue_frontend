import { getDoctypeList, getResource } from '@/api/frappe'
import frappeApi from '@/api/frappe'

export const DOCTYPE = 'HitriVpis'

const FIELDS = ['name', 'display', 'priimek_ime', 'user', 'aktivna', 'pin_hash', 'sol']

export const getQuickEntryUsers = async (onlyActive = false) => {
  const filters = onlyActive ? [['aktivna', '=', 1]] : []
  const result = await getDoctypeList(DOCTYPE, filters, FIELDS, 'display asc', 200)
  const data = result.data || result
  if (!Array.isArray(data)) {
    return []
  }
  return data
}

export const getQuickEntryUser = async (name) => {
  const result = await getResource(`${DOCTYPE}/${name}`)
  return result.data || result
}

// Identity fields (display, priimek_ime, user, aktivna) are maintained in Frappe.
// The app only ever writes the PIN hash and the site-wide salt.
export const updateQuickEntryUser = async (name, userData) => {
  const response = await frappeApi.put(`/api/resource/${DOCTYPE}/${name}`, { data: userData, skipInterceptor: true })
  return response.data
}