<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { login, checkAuth, setAuthUser } from '@/api/frappe'

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const error = ref(null)
const username = ref('')
const password = ref('')

onMounted(async () => {
  const user = await checkAuth()
  if (user) {
    const redirect = route.query.redirect || '/'
    router.push(redirect)
  }
})

const handleLogin = async () => {
  if (!username.value || !password.value) {
    error.value = 'Prosim, vnesite uporabniško ime in geslo'
    return
  }
  
  try {
    loading.value = true
    error.value = null
    await login(username.value, password.value)
    await setAuthUser(username.value)
    
    try {
      const baseUrl = import.meta.env.DEV ? '' : import.meta.env.VITE_FRAPPE_URL
      const r = await fetch(baseUrl + '/api/method/frappe.boot.get_boot_info', {
        credentials: 'include'
      })
      const d = await r.json()
      if (d.csrf_token) window.csrf_token = d.csrf_token
    } catch (e) {}
    
    const redirect = route.query.redirect || '/'
    router.push(redirect)
  } catch (e) {
    console.error('Login error:', e)
    error.value = 'Napačno uporabniško ime ali geslo'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="container py-12">
    <div class="flex justify-center">
      <div class="w-full max-w-md">
        <div class="bg-white rounded-lg shadow-sm p-6">
          <h3 class="text-center text-xl font-bold text-gray-800 mb-4">Prijava</h3>
          
          <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {{ error }}
          </div>

          <form @submit.prevent="handleLogin">
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2" for="username">
                Uporabniško ime
              </label>
              <input
                id="username"
                v-model="username"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Vnesite uporabniško ime"
                :disabled="loading"
              />
            </div>

            <div class="mb-6">
              <label class="block text-gray-700 text-sm font-bold mb-2" for="password">
                Geslo
              </label>
              <input
                id="password"
                v-model="password"
                type="password"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Vnesite geslo"
                :disabled="loading"
                @keyup.enter="handleLogin"
              />
            </div>

            <button 
              type="submit"
              class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50" 
              :disabled="loading"
            >
              <span v-if="loading" class="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></span>
              Prijava
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
