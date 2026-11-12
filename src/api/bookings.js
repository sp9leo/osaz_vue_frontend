import { frappeApiRead } from './frappe'

// Bookings app whitelisted methods (guest-readable, no session required).
// The OSAZ frontend talks to the same Frappe site, so these resolve through /api.
const BOOKINGS_API = '/api/method/bookings.api'

const unwrap = (response, fallback) => response?.data?.message ?? fallback

export const getBookingRooms = async () => {
  try {
    const response = await frappeApiRead.get(`${BOOKINGS_API}.get_rooms`)
    const rooms = unwrap(response, [])
    return Array.isArray(rooms) ? rooms : []
  } catch (error) {
    console.error('Could not load booking rooms:', error)
    return []
  }
}

/**
 * Public occupancy grid for one room. Returns
 * `{ slots: [{ start, end, label }], grid: [{ date, time, status }] }`
 * and never booker names or contact details.
 */
export const getPublicRoomWeek = async (room, startDate, endDate) => {
  try {
    const response = await frappeApiRead.get(`${BOOKINGS_API}.get_public_room_week`, {
      params: { room, start_date: startDate, end_date: endDate },
    })
    return unwrap(response, null)
  } catch (error) {
    console.error(`Could not load occupancy for room ${room}:`, error)
    return null
  }
}
