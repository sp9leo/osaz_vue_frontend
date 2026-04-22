<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { checkAuth, getAuthUsername } from '@/api/frappe'
import frappeApi from '@/api/frappe'

const route = useRoute()

const router = useRouter()

const loading = ref(false)
const error = ref(null)
const currentUser = ref('')

const form = ref({
  title: '',
  content: '',
  zacetek: '',
  velja_do: '',
  important: false,
  public: true,
})

const handleSubmit = async () => {
  if (!form.value.title || !form.value.content) {
    error.value = 'Prosim, izpolnite obvezna polja (naslov in besedilo)'
    return
  }

  try {
    loading.value = true
    error.value = null
    
    const obvestiloData = {
      title: form.value.title,
      content: form.value.content,
      zacetek: form.value.zacetek ? form.value.zacetek + ' 00:00:00' : null,
      velja_do: form.value.velja_do ? form.value.velja_do + ' 00:00:00' : null,
      important: form.value.important ? 1 : 0,
      'public': form.value.public ? 1 : 0,
    }
    
    console.log('Creating obvestilo with data:', obvestiloData)
    
    const result = await frappeApi.post('/api/resource/Obvestila', { data: obvestiloData })
    router.push('/dashboard')
  } catch (e) {
    const message = e.response?.data?.message || e.message || 'Neznana napaka'
    error.value = 'Napaka pri shranjevanju: ' + message
    console.error('Error creating obvestilo:', e.response?.data || e)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  const user = await checkAuth()
  const username = getAuthUsername()
  if (!user && !username) {
    router.push('/login?redirect=/obvestilo/new')
    return
  }
  currentUser.value = user || username || ''
})
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <div class="max-w-2xl mx-auto">
      <div class="bg-white rounded-lg shadow-sm">
        <div class="p-6 border-b border-gray-100">
          <h2 class="text-xl font-bold text-gray-800">Novo obvestilo</h2>
        </div>

        <form @submit.prevent="handleSubmit" class="p-6">
          <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {{ error }}
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Naslov <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.title"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Vnesite naslov obvestila"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Začetek
                </label>
                <input
                  v-model="form.zacetek"
                  type="date"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Velja do
                </label>
                <input
                  v-model="form.velja_do"
                  type="date"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Besedilo <span class="text-red-500">*</span>
              </label>
              <textarea
                v-model="form.content"
                rows="4"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Vnesite besedilo obvestila"
              ></textarea>
            </div>

            <div class="flex items-center gap-6">
              <div class="flex items-center gap-2">
                <input
                  v-model="form.important"
                  type="checkbox"
                  id="important"
                  class="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <label for="important" class="text-sm text-gray-700">
                  Pomembno
                </label>
              </div>

              <div class="flex items-center gap-2">
                <input
                  v-model="form.public"
                  type="checkbox"
                  id="public"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label for="public" class="text-sm text-gray-700">
                  Javno
                </label>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
            <button
              type="button"
              class="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              @click="router.back()"
            >
              Prekliči
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              :disabled="loading"
            >
              <span v-if="loading" class="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></span>
              Shrani obvestilo
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
