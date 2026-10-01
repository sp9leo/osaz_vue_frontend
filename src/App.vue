<script setup>
import { ref, watch } from 'vue'
import { RouterView, RouterLink, useRoute, useRouter } from 'vue-router'
import { checkAuth, getAuthUsername, isFrappeAdmin, logout } from '@/api/frappe'
import QuickEventModal from '@/components/QuickEventModal.vue'

const route = useRoute()
const router = useRouter()

const isLoggedIn = ref(false)
const isAdmin = ref(false)
const currentUser = ref('')
const showQuickEvent = ref(false)

const checkLoginStatus = async () => {
  const user = await checkAuth()
  if (user) {
    isLoggedIn.value = true
    currentUser.value = user
    isAdmin.value = await isFrappeAdmin(getAuthUsername() || user)
  } else {
    isLoggedIn.value = false
    isAdmin.value = false
    currentUser.value = ''
  }
}

const handleLogout = async () => {
  await logout()
  isLoggedIn.value = false
  isAdmin.value = false
  currentUser.value = ''
  router.push('/')
}

watch(() => route.fullPath, checkLoginStatus, { immediate: true })
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <nav class="bg-white shadow-sm border-b border-gray-200 mb-6">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-14">
          <div class="flex items-center">
            <span class="text-xl font-semibold text-gray-800">OSAZ</span>
            <div class="ml-8 flex space-x-1">
            <RouterLink
                to="/"
                class="px-3 py-2 rounded-md text-sm font-medium transition-colors"
                :class="route.name === 'dashboard' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'"
              >
                Nadzorna plošča
                </RouterLink>
              <RouterLink
                to="/koledar"
                class="px-3 py-2 rounded-md text-sm font-medium transition-colors"
                :class="route.name === 'koledar' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'"
              >
                Koledar
              </RouterLink>
              
              
              <RouterLink
                to="/archive"
                class="px-3 py-2 rounded-md text-sm font-medium transition-colors"
                :class="route.name === 'archive' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'"
              >
                Arhiv
              </RouterLink>
              <a
  href="https://noco.osaz.si/calendar/supervision"
  target="_blank"
  rel="noopener noreferrer"
  class="px-3 py-2 rounded-md text-sm font-medium transition-colors text-gray-600 hover:text-gray-900 hover:bg-gray-50"
>
  Dežurstva
</a>
              
                
            </div>
          </div>
          <div class="flex items-center">
            <button
              @click="showQuickEvent = true"
              class="mr-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors"
            >
              <i class="fas fa-bolt mr-1"></i>
              Hitri vpis
            </button>
            <RouterLink
              v-if="isLoggedIn"
              to="/event/new"
              class="mr-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
            >
              <i class="fas fa-plus mr-1"></i>
              Dodaj dogodek
            </RouterLink>
            <RouterLink
              v-if="isLoggedIn"
              to="/obvestilo/new"
              class="mr-4 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
            >
              <i class="fas fa-bullhorn mr-1"></i>
              Dodaj obvestilo
            </RouterLink>

            <RouterLink
              v-if="isAdmin"
              to="/admin/uporabniki"
              class="mr-4 px-3 py-1.5 bg-gray-700 hover:bg-gray-800 text-white text-sm font-medium rounded-md transition-colors"
            >
              <i class="fas fa-key mr-1"></i>
              PIN-i
            </RouterLink>
            
            <span v-if="isLoggedIn" class="text-sm text-gray-500 mr-4">
              Prijavljen kot: <span class="font-semibold text-gray-700">{{ currentUser }}</span>
            </span>
            
            <RouterLink
              v-if="!isLoggedIn"
              to="/login"
              class="text-sm text-gray-600 hover:text-gray-900"
            >
              Prijava
            </RouterLink>
            
            <button
              v-else
              @click="handleLogout"
              class="text-sm text-red-600 hover:text-red-800"
            >
              Odjava
            </button>
          </div>
        </div>
      </div>
    </nav>
    <RouterView />
    <QuickEventModal :show="showQuickEvent" @close="showQuickEvent = false" />
  </div>
</template>
