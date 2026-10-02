// Local mock of the Frappe endpoints, for developing without the server.
//
// This is only reachable in a dev build: frappe.js installs it behind
// import.meta.env.DEV, which Vite replaces with false when building for
// production, so none of this reaches a deployed bundle.
//
// It covers what quick entry and the PIN admin page touch:
//   POST /api/method/intranet.api.verify_pin
//   GET  /api/resource/HitriVpis          PUT /api/resource/HitriVpis/<name>
//   GET  /api/resource/Dogodek            POST /api/resource/Dogodek
//   GET  /api/resource/Event Type         GET  /api/resource/Obvestila
//   POST /api/method/login                GET  /api/resource/User/<name>
//
// Data lives in localStorage, so PINs set in the admin page survive a reload.

const STORE_KEY = 'mock-frappe-store'

export const TEMP_ADMIN = {
  usr: 'temp.admin@osaz.si',
  pwd: 'temp1234',
}

const ISO = (daysAgo, hour = 9) => {
  const date = new Date()
  date.setDate(date.getDate() + daysAgo)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString().slice(0, 19).replace('T', ' ')
}

const seed = () => ({
  hitrivpis: [
    {
      name: 'Blatnik_Tea',
      display: 'Blatnik Tea',
      priimek_ime: 'Blatnik_Tea',
      user: 'tea.blatnik@o-azilb.si',
      dovoljen: 1,
      pin: '111111',
    },
    {
      name: 'Bobek_Sandi',
      display: 'Bobek Sandi',
      priimek_ime: 'Bobek_Sandi',
      user: 'sandi.bobek@o-azilb.si',
      dovoljen: 1,
      pin: '222222',
    },
    {
      name: 'Kos_Miha',
      display: 'Kos Miha',
      priimek_ime: 'Kos_Miha',
      user: 'miha.kos@o-azilb.si',
      dovoljen: 0,
      pin: '333333',
    },
    {
      name: 'Golob_Ana',
      display: 'Golob Ana',
      priimek_ime: 'Golob_Ana',
      user: 'ana.golob@o-azilb.si',
      dovoljen: 1,
      pin: '',
    },
  ],
  dogodek: [
    {
      name: 'EV-00001',
      subject: 'Zasedanje strokovnega sveta',
      starts_on: ISO(2),
      ends_on: ISO(2, 11),
      description: 'Zasedanje strokovnega sveta OŠ.',
      event_category: 'Dogodek',
      location: 'zbornica',
      status: 'Open',
      published: 1,
      predvideno: 0,
      color: '#4463F0',
      owner: 'Administrator',
      custom_added_by: 'Blatnik Tea',
      modified: ISO(1),
      creation: ISO(3),
    },
    {
      name: 'EV-00002',
      subject: 'Učiteljska konferenca',
      starts_on: ISO(-4),
      ends_on: ISO(-4, 13),
      description: 'Redna učiteljska konferenca pred prvim ocenjevalnim obdobjem.',
      event_category: 'Dogodek',
      location: 'velika dvorana',
      status: 'Open',
      published: 1,
      predvideno: 1,
      color: '#4463F0',
      owner: 'Administrator',
      custom_added_by: 'Bobek Sandi',
      modified: ISO(-2),
      creation: ISO(-6),
    },
    {
      name: 'EV-00003',
      subject: 'Neobjavljen: načrt izleta',
      starts_on: ISO(5),
      ends_on: ISO(5, 14),
      description: 'Osnutek, še ni objavljen.',
      event_category: 'Dnevi dejavnosti',
      location: '',
      status: 'Open',
      published: 0,
      predvideno: 0,
      color: '#ECAD4B',
      owner: 'Administrator',
      custom_added_by: 'Blatnik Tea',
      modified: ISO(0),
      creation: ISO(1),
    },
  ],
  obvestila: [
    {
      name: 'OB-00001',
      title: 'Zasedanje sveta staršev',
      content: 'Zasedanje sveta staršev bo v četrtek ob 18.00 v zbornici.',
      zacetek: ISO(0, 7),
      velja_do: ISO(7),
      public: 1,
      important: 1,
      owner: 'Administrator',
      modified: ISO(0),
      creation: ISO(0),
    },
  ],
  counters: { dogodek: 3, obvestila: 1 },
})

const load = () => {
  try {
    const stored = localStorage.getItem(STORE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {
    // A corrupt store should not stop the dev server, fall through to a fresh seed.
  }
  const fresh = seed()
  save(fresh)
  return fresh
}

const save = (state) => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state))
  } catch {
    // Nothing to do: the mock still works in memory for this session.
  }
}

const reset = () => {
  localStorage.removeItem(STORE_KEY)
}

const matches = (value, condition) => {
  const [field, operator, wanted] = condition
  const actual = value[field]

  switch (operator) {
    case '=':
      // Frappe compares loosely here: 1 and true are the same stored flag.
      return String(actual ?? '') === String(wanted ?? '')
    case '!=':
      return String(actual ?? '') !== String(wanted ?? '')
    case '>':
      return actual > wanted
    case '<':
      return actual < wanted
    case '>=':
      return actual >= wanted
    case '<=':
      return actual <= wanted
    case 'like': {
      const pattern = String(wanted).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*')
      return new RegExp(`^${pattern}$`, 'i').test(String(actual ?? ''))
    }
    default:
      return true
  }
}

const pick = (row, fields) => {
  if (!fields || !fields.length) return { ...row }
  const out = {}
  for (const field of fields) {
    out[field] = row[field] ?? null
  }
  return out
}

const sortRows = (rows, orderBy) => {
  if (!orderBy) return rows
  const [field, direction = 'asc'] = orderBy.split(/\s+/)
  const sign = direction.toLowerCase() === 'desc' ? -1 : 1
  return [...rows].sort((a, b) => {
    const left = a[field] ?? ''
    const right = b[field] ?? ''
    if (left === right) return 0
    return (left > right ? 1 : -1) * sign
  })
}

const listResource = (state, doctype, params) => {
  const collection = state[String(doctype).toLowerCase()]
  if (!collection) {
    throw Object.assign(new Error(`DOCTYPE_NOT_FOUND: ${doctype}`), { status: 404 })
  }

  let filters = []
  try {
    filters = JSON.parse(params.filters || '[]')
  } catch {
    filters = []
  }
  if (!Array.isArray(filters)) filters = []

  let fields = null
  try {
    fields = JSON.parse(params.fields || 'null')
  } catch {
    fields = null
  }

  const rows = collection.filter((row) => filters.every((condition) => matches(row, condition)))
  const ordered = sortRows(rows, params.order_by)
  const limit = Number(params.limit) || 20

  return ordered.slice(0, limit).map((row) => pick(row, fields))
}

const oneResource = (state, doctype, name) => {
  const collection = state[String(doctype).toLowerCase()]
  const row = collection?.find((item) => item.name === name)
  if (!row) {
    throw Object.assign(new Error(`NOT_FOUND: ${doctype} ${name}`), { status: 404 })
  }
  return { ...row }
}

const insertResource = (state, doctype, body) => {
  const key = String(doctype).toLowerCase()
  const collection = state[key]
  if (!collection) {
    throw Object.assign(new Error(`DOCTYPE_NOT_FOUND: ${doctype}`), { status: 404 })
  }

  const prefix = doctype === 'Dogodek' ? 'EV' : doctype === 'Obvestila' ? 'OB' : doctype
  state.counters[key] = (state.counters[key] || collection.length) + 1
  const name = `${prefix}-${String(state.counters[key]).padStart(5, '0')}`

  // Frappe fills owner, created and modified itself.
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const row = { ...body, name, owner: 'Administrator', creation: now, modified: now }

  collection.push(row)
  save(state)
  return { ...row }
}

const updateResource = (state, doctype, name, body) => {
  const collection = state[String(doctype).toLowerCase()]
  const index = collection?.findIndex((item) => item.name === name)
  if (index === undefined || index === -1) {
    throw Object.assign(new Error(`NOT_FOUND: ${doctype} ${name}`), { status: 404 })
  }

  collection[index] = {
    ...collection[index],
    ...body,
    name,
    modified: new Date().toISOString().slice(0, 19).replace('T', ' '),
  }
  save(state)
  return { ...collection[index] }
}

const verifyPin = (state, body) => {
  const pin = String(body?.pin ?? '')
  if (!/^[0-9]{6}$/.test(pin)) return { ok: false }

  // Mirrors intranet/api.py: allowed rows only, no early exit, identity only.
  let match = null
  for (const row of state.hitrivpis) {
    if (!row.dovoljen) continue
    if (row.pin === pin) match = row
  }
  if (!match) return { ok: false }

  return {
    ok: true,
    user: {
      name: match.name,
      display: match.display,
      priimek_ime: match.priimek_ime,
      user: match.user,
    },
  }
}

const route = (method, url, params, body) => {
  const state = load()
  const path = url.split('?')[0]

  if (path === '/api/method/intranet.api.verify_pin' && method === 'POST') {
    return { message: verifyPin(state, body) }
  }

  if (path === '/api/method/login' && method === 'POST') {
    if (body?.usr === TEMP_ADMIN.usr && body?.pwd === TEMP_ADMIN.pwd) {
      return { message: 'Logged In', home_page: '/' }
    }
    throw Object.assign(new Error('INVALID_LOGIN'), { status: 401 })
  }

  if (path === '/api/method/logout') {
    return { message: 'Logged Out' }
  }

  if (path.startsWith('/api/resource/User/')) {
    const username = decodeURIComponent(path.replace('/api/resource/User/', ''))
    if (username !== TEMP_ADMIN.usr) {
      throw Object.assign(new Error('NOT_FOUND'), { status: 404 })
    }
    return {
      data: {
        name: TEMP_ADMIN.usr,
        full_name: 'Začasni Administrator',
        // isFrappeAdmin looks for one of these on the user document.
        roles: [{ role: 'Administrator' }],
      },
    }
  }

  if (path === '/api/resource/HitriVpis' && method === 'GET') {
    return { data: listResource(state, 'HitriVpis', params) }
  }

  if (path.startsWith('/api/resource/HitriVpis/') && method === 'GET') {
    return { data: oneResource(state, 'HitriVpis', decodeURIComponent(path.split('/').pop())) }
  }

  if (path.startsWith('/api/resource/HitriVpis/') && method === 'PUT') {
    const name = decodeURIComponent(path.split('/').pop())
    return { data: updateResource(state, 'HitriVpis', name, body) }
  }

  if (path === '/api/resource/HitriVpis' && method === 'POST') {
    return { data: insertResource(state, 'HitriVpis', body) }
  }

  if (path === '/api/resource/Dogodek' && method === 'GET') {
    return { data: listResource(state, 'Dogodek', params) }
  }

  if (path.startsWith('/api/resource/Dogodek/') && method === 'GET') {
    return { data: oneResource(state, 'Dogodek', decodeURIComponent(path.split('/').pop())) }
  }

  if (path.startsWith('/api/resource/Dogodek/') && method === 'PUT') {
    const name = decodeURIComponent(path.split('/').pop())
    return { data: updateResource(state, 'Dogodek', name, body) }
  }

  if (path === '/api/resource/Dogodek' && method === 'POST') {
    return { data: insertResource(state, 'Dogodek', body) }
  }

  if (path === '/api/resource/Event Type' && method === 'GET') {
    return { data: [{ name: 'Dogodek' }, { name: 'Dnevi dejavnosti' }, { name: 'Odpoved' }] }
  }

  if (path === '/api/resource/Obvestila' && method === 'GET') {
    return { data: listResource(state, 'Obvestila', params) }
  }

  if (path.startsWith('/api/resource/Obvestila/') && method === 'GET') {
    return { data: oneResource(state, 'Obvestila', decodeURIComponent(path.split('/').pop())) }
  }

  if (path === '/api/resource/Obvestila' && method === 'POST') {
    return { data: insertResource(state, 'Obvestila', body) }
  }

  if (path.startsWith('/api/resource/Obvestila/') && method === 'PUT') {
    const name = decodeURIComponent(path.split('/').pop())
    return { data: updateResource(state, 'Obvestila', name, body) }
  }

  throw Object.assign(new Error(`MOCK has no route for ${method} ${path}`), { status: 404 })
}

export const isMockEnabled = () =>
  import.meta.env.DEV && import.meta.env.VITE_USE_MOCK !== 'false'

// Exposed so the dev console can start over: __frappeMock.reset()
export const mockHelpers = { reset }

// Axios v1 adapter: takes a config, returns a response or rejects.
export const mockAdapter = async (config) => {
  // Small delay so loading states are visible while developing.
  await new Promise((resolve) => setTimeout(resolve, 120))

  const method = String(config.method || 'get').toUpperCase()
  let params = config.params || {}
  let body = config.data

  if (typeof params === 'string') {
    try {
      params = Object.fromEntries(new URLSearchParams(params))
    } catch {
      params = {}
    }
  }
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      body = undefined
    }
  }

  const response = (payload) => ({
    data: payload,
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  })

  try {
    return response(route(method, config.url || '', params, body))
  } catch (error) {
    const status = error.status || 500
    return Promise.reject(
      Object.assign(error, {
        config,
        response: {
          data: { exception: error.message, exc_type: status === 404 ? 'DoesNotExistError' : 'ValidationError' },
          status,
          statusText: status === 404 ? 'Not Found' : 'Error',
          headers: {},
          config,
        },
        isAxiosError: true,
      })
    )
  }
}

export const installMock = (instances) => {
  for (const instance of instances) {
    instance.defaults.adapter = mockAdapter
  }
  console.info(
    '%c[mock] Frappe je nadomeščen z lokalnimi podatki.',
    'color: #16a34a; font-weight: bold',
    '| admin:',
    TEMP_ADMIN.usr,
    TEMP_ADMIN.pwd,
    '| PIN-i: 111111 Blatnik Tea, 222222 Bobek Sandi, 333333 Kos Miha (brez dostopa), Golob Ana brez PIN-a',
    '| __frappeMock.reset()',
  )
}