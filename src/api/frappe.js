import axios from 'axios'

const isDev = import.meta.env.DEV
const API_BASE_URL = isDev ? '' : import.meta.env.VITE_FRAPPE_URL || ''
const API_KEY = import.meta.env.VITE_FRAPPE_API_KEY || ''
const API_SECRET = import.meta.env.VITE_FRAPPE_API_SECRET || ''

const frappeApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
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

const addCsrfToken = (config) => {
  const csrfToken = document.cookie.match(/sid=([^;]+)/)?.[1]
  if (csrfToken) {
    config.headers['X-Frappe-CSRF-Token'] = csrfToken
  }
  return config
}

frappeApi.interceptors.request.use(addCsrfToken)
frappeApiRead.interceptors.request.use(addCsrfToken)

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

export default frappeApi