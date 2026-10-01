import { createRouter, createWebHistory } from 'vue-router'
import { checkAuth, getAuthUsername, isFrappeAdmin } from '@/api/frappe'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/modules/calendar/views/DashboardPage.vue'),
  },
  {
    path: '/koledar',
    name: 'koledar',
    component: () => import('@/modules/calendar/views/HomePage.vue'),
  },
  {
    path: '/archive',
    name: 'archive',
    component: () => import('@/modules/calendar/views/ArchivePage.vue'),
  },
  {
    path: '/event/:name',
    name: 'event-detail',
    component: () => import('@/modules/calendar/views/EventDetailPage.vue'),
  },
  {
    path: '/event/new',
    name: 'event-new',
    component: () => import('@/modules/calendar/views/AddEventPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/event/:name/edit',
    name: 'event-edit',
    component: () => import('@/modules/calendar/views/EditEventPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/obvestilo/new',
    name: 'obvestilo-new',
    component: () => import('@/modules/calendar/views/AddObvestiloPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/obvestilo/:name/edit',
    name: 'obvestilo-edit',
    component: () => import('@/modules/calendar/views/EditObvestiloPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/admin/uporabniki',
    name: 'admin-uporabniki',
    component: () => import('@/modules/admin/views/UsersPage.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginPage.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to, from, next) => {
  if (!to.meta.requiresAuth && !to.meta.requiresAdmin) {
    next()
    return
  }

  const user = await checkAuth()
  if (!user) {
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }

  if (to.meta.requiresAdmin) {
    const isAdmin = await isFrappeAdmin(getAuthUsername() || user)
    if (!isAdmin) {
      next({ name: 'home' })
      return
    }
  }

  next()
})

export default router
