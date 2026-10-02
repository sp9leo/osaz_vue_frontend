import axios from 'axios'

const API_BASE_URL = ''
const API_KEY = import.meta.env.VITE_FRAPPE_API_KEY || ''
const API_SECRET = import.meta.env.VITE_FRAPPE_API_SECRET || ''

export const getCsrfToken = () => {
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === 'frappecsrf') {
      return decodeURIComponent(value)
    }
  }
  return null
}

const csrfToken = getCsrfToken()

const frappeApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(csrfToken && { 'X-Frappe-CSRF-Token': csrfToken }),
  },
})

const frappeApiRead = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

if (API_KEY && API_SECRET) {
  frappeApi.defaults.headers.common['Authorization'] = `token ${API_KEY}:${API_SECRET}`
  frappeApiRead.defaults.headers.common['Authorization'] = `token ${API_KEY}:${API_SECRET}`
}

// Offline development: serve Frappe from local data instead of the real server.
// import.meta.env.DEV is false in a production build, so the mock and its data
// are dropped from the bundle. Set VITE_USE_MOCK=false to reach the real server
// while running the dev server.
if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK !== 'false') {
  const { installMock, mockHelpers } = await import('@/dev/mockFrappe')
  installMock([frappeApi, frappeApiRead])
  window.__frappeMock = mockHelpers
}

frappeApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.config?.skipInterceptor) {
      return Promise.reject(error)
    }
    if (error.response?.status === 401 || error.response?.status === 403) {
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

frappeApi.interceptors.request.use((config) => {
  // Read the token per request: after login it only exists in the cookie,
  // the module-level capture happens before there is a session.
  const token = window.csrf_token || getCsrfToken()
  if (token) {
    config.headers['X-Frappe-CSRF-Token'] = token
  }
  return config
})

export const getResource = async (doctype, params = {}) => {
  try {
    const response = await frappeApiRead.get(`/api/resource/${doctype}`, { params })
    return response.data || {}
  } catch (error) {
    console.error('API Error:', error)
    throw error
  }
}

export const getDoctypeList = async (doctype, filters = [], fields = [], orderBy = null, limit = 100) => {
  const params = {
    fields: JSON.stringify(fields),
    filters: JSON.stringify(filters),
    limit,
  }
  if (orderBy) {
    params.order_by = orderBy
  }
  return getResource(doctype, params)
}

export const callMethod = async (method, args = {}) => {
  const response = await frappeApi.post('/api/method/' + method, args)
  return response.data
}

export const login = async (usr, pwd) => {
  const response = await frappeApi.post('/api/method/login', { usr, pwd })
  
  // Refresh CSRF token after login (token may have changed)
  const newCsrfToken = getCsrfToken()
  if (newCsrfToken) {
    frappeApi.defaults.headers.common['X-Frappe-CSRF-Token'] = newCsrfToken
  }
  
  return response.data
}

export const logout = async () => {
  try {
    await frappeApi.get('/api/method/logout')
  } catch (error) {
    console.log('Logout API call completed')
  }
  localStorage.removeItem('frappe_user')
  localStorage.removeItem('frappe_user_fullname')
  return {}
}

export const checkAuth = async () => {
  return localStorage.getItem('frappe_user_fullname') || localStorage.getItem('frappe_user')
}

export const getAuthUsername = () => {
  return localStorage.getItem('frappe_user')
}

export const setAuthUser = async (username) => {
  localStorage.setItem('frappe_user', username)
  
  try {
    const response = await frappeApiRead.get(`/api/resource/User/${username}`)
    const userData = response.data?.data || response.data
    if (userData?.full_name) {
      localStorage.setItem('frappe_user_fullname', userData.full_name)
    }
  } catch (error) {
    console.log('Could not fetch user full name:', error)
  }
}

const ADMIN_ROLES = ['Administrator', 'System Manager']

const readUserRoles = async (username, useSession) => {
  const config = useSession ? { headers: { Authorization: null } } : {}
  const response = await frappeApiRead.get(`/api/resource/User/${username}`, config)
  const userData = response.data?.data || response.data
  return Array.isArray(userData?.roles) ? userData.roles : []
}

export const isFrappeAdmin = async (username) => {
  if (!username) return false

  try {
    // Has Role is a child table, which /api/resource refuses to list (403), so the
    // roles come from the user document. The session is tried first, because a user
    // may always read itself; the API key is the fallback.
    let roles
    try {
      roles = await readUserRoles(username, true)
    } catch {
      roles = await readUserRoles(username, false)
    }
    return roles.some((role) => ADMIN_ROLES.includes(role.role))
  } catch (error) {
    console.log('Could not check user roles:', error?.response?.status || error)
    return false
  }
}

export default frappeApi
