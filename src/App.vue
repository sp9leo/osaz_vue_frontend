<script setup>
import { ref, watch } from 'vue'
import { RouterView, RouterLink, useRoute, useRouter } from 'vue-router'
import { checkAuth, logout } from '@/api/frappe'

const route = useRoute()
const router = useRouter()

const isLoggedIn = ref(false)
const currentUser = ref('')

const checkLoginStatus = async () => {
  const user = await checkAuth()
  if (user) {
    isLoggedIn.value = true
    currentUser.value = user
  } else {
    isLoggedIn.value = false
    currentUser.value = ''
  }
}

const handleLogout = async () => {
  await logout()
  isLoggedIn.value = false
  currentUser.value = ''
  router.push('/')
}

watch(() => route.fullPath, checkLoginStatus, { immediate: true })
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <nav class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-14">
          <div class="flex items-center">
            <span class="text-xl font-semibold text-gray-800">OSAZ</span>
            <div class="ml-8 flex space-x-1">
              <RouterLink
                to="/"
                class="px-3 py-2 rounded-md text-sm font-medium transition-colors"
                :class="route.name === 'home' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'"
              >
                Koledar
              </RouterLink>
              <RouterLink
                to="/dashboard"
                class="px-3 py-2 rounded-md text-sm font-medium transition-colors"
                :class="route.name === 'dashboard' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'"
              >
                Nadzorna plošča
              </RouterLink>
              <RouterLink
                to="/archive"
                class="px-3 py-2 rounded-md text-sm font-medium transition-colors"
                :class="route.name === 'archive' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'"
              >
                Arhiv
              </RouterLink>
            </div>
          </div>
          <div class="flex items-center">
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
  </div>
</template>
