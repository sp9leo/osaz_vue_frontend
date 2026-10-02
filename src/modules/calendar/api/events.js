import { getDoctypeList, getResource } from '@/api/frappe'
import frappeApi from '@/api/frappe'

export const getEvents = async (filters = []) => {
  const fields = [
    'name',
    'subject',
    'starts_on',
    'ends_on',
    'description',
    'event_category',
    'color',
    'status',
    'modified',
    'location',
    'predvideno',
    'published',
    'owner',
    'custom_added_by',
  ]

  const result = await getDoctypeList('Dogodek', filters, fields, 'starts_on asc', 200)
  let data = result.data || result
  if (!Array.isArray(data)) {
    data = []
  }
  return data.sort((a, b) => new Date(a.starts_on) - new Date(b.starts_on))
}

// Frappe sets owner to the authenticated user on insert, and quick entry posts with the
// shared API key and no session, so custom_added_by is the real author when the DocType
// carries that field. Fall back to owner so events without it keep working.
export const getEventAuthor = (event) => event?.custom_added_by || event?.owner || ''

export const isEventAuthor = (event, identities = []) => {
  const names = identities.filter(Boolean)
  return [event?.custom_added_by, event?.owner]
    .filter(Boolean)
    .some((value) => names.some((name) => value === name || String(value).includes(name)))
}

// Frappe ANDs list filters and sets owner to the API key admin, so an event the
// current user entered through quick entry only matches on custom_added_by. Both
// fields are queried per identity and merged.
export const getEventsForIdentity = async (identities, filters = []) => {
  const unique = [...new Set(identities.filter(Boolean))]
  const queries = unique.flatMap((identity) => [
    getEvents([...filters, ['owner', '=', identity]]),
    getEvents([...filters, ['custom_added_by', '=', identity]]),
  ])

  const merged = new Map()
  for (const event of (await Promise.all(queries)).flat()) {
    merged.set(event.name, event)
  }

  return [...merged.values()].sort((a, b) => new Date(a.starts_on) - new Date(b.starts_on))
}

export const getUpcomingEvents = async () => {
  const today = new Date().toISOString().split('T')[0]
  return getEvents([
    ['starts_on', '>=', today],
    ['published', '=', 1]
  ])
}

export const getAllEvents = async (searchQuery = '', category = '') => {
  const filters = [
    ['published', '=', 1]
  ]

  if (searchQuery) {
    filters.push(['subject', 'like', `%${searchQuery}%`])
  }
  if (category) {
    filters.push(['event_category', '=', category])
  }

  return getEvents(filters)
}

export const getEventsInRange = async (startDate, endDate, limit = 100) => {
  return getEvents([
    ['starts_on', '>=', startDate],
    ['starts_on', '<=', endDate],
    ['published', '=', 1]
  ])
}

export const getEventCategories = async () => {
  const result = await getResource('Event Type', { fields: ['name'] })
  let data = result.data || result
  if (!Array.isArray(data)) {
    data = []
  }
  return data.map((item) => item.name)
}

export const getUsedEventCategories = async (limit = 500) => {
  const result = await getDoctypeList('Dogodek', [], ['event_category'], 'modified desc', limit)
  const data = result.data || result
  if (!Array.isArray(data)) {
    return []
  }
  return [...new Set(data.map((row) => row.event_category).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'sl'))
}

export const getEventByName = async (name) => {
  const result = await getResource(`Dogodek/${name}`)
  return result.data || result
}

export const createEvent = async (eventData) => {
  const response = await frappeApi.post('/api/resource/Dogodek', { data: eventData })
  return response.data
}

export const updateEvent = async (name, eventData) => {
  const response = await frappeApi.put(`/api/resource/Dogodek/${name}`, { data: eventData })
  return response.data
}