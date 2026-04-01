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
    'custom_predvideno',
    'published',
    'owner',
  ]

  const result = await getDoctypeList('Dogodek', filters, fields, 'starts_on asc', 200)
  return result.data || result
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
  const data = result.data || result
  return data.map((item) => item.name)
}

export const getEventByName = async (name) => {
  const result = await getResource(`Dogodek/${name}`)
  return result.data || result
}

export const createEvent = async (eventData) => {
  const response = await frappeApi.post('/api/resource/Dogodek', eventData)
  return response.data
}

export const updateEvent = async (name, eventData) => {
  const response = await frappeApi.put(`/api/resource/Dogodek/${name}`, eventData)
  return response.data
}
