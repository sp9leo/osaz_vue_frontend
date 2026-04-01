<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { checkAuth, getAuthUsername } from '@/api/frappe'
import { getObvestiloByName, updateObvestilo } from '@/modules/calendar/api/obvestila'

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const error = ref(null)
const obvestiloName = route.params.name
const currentUser = ref('')

const form = ref({
  title: '',
  content: '',
  zacetek: '',
  custom_velja_do: '',
  important: false,
  public: true,
})

const fetchObvestilo = async () => {
  try {
    loading.value = true
    const response = await getObvestiloByName(obvestiloName)
    const obvestilo = response.data || response
    
    form.value = {
      title: obvestilo.title || '',
      content: obvestilo.content || '',
      zacetek: obvestilo.zacetek || '',
      custom_velja_do: obvestilo.custom_velja_do || '',
      important: obvestilo.important ? true : false,
      public: obvestilo.public !== 0,
    }
  } catch (e) {
    error.value = 'Napaka pri nalaganju obvestila: ' + e.message
  } finally {
    loading.value = false
  }
}

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
      zacetek: form.value.zacetek || null,
      custom_velja_do: form.value.custom_velja_do || null,
      important: form.value.important ? 1 : 0,
      public: form.value.public ? 1 : 0,
    }
    
    await updateObvestilo(obvestiloName, obvestiloData)
    router.push('/dashboard')
  } catch (e) {
    error.value = 'Napaka pri shranjevanju obvestila: ' + (e.message || 'Neznana napaka')
    console.error('Error updating obvestilo:', e)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  const user = await checkAuth()
  const username = getAuthUsername()
  if (!user && !username) {
    router.push(`/login?redirect=/obvestilo/${obvestiloName}/edit`)
    return
  }
  currentUser.value = username || user || ''
  await fetchObvestilo()
})
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <div class="max-w-2xl mx-auto">
      <div class="bg-white rounded-lg shadow-sm">
        <div class="p-6 border-b border-gray-100">
          <h2 class="text-xl font-bold text-gray-800">Uredi obvestilo</h2>
        </div>

        <form @submit.prevent="handleSubmit" class="p-6">
          <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {{ error }}
          </div>

          <div v-if="loading && !form.title" class="flex justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>

          <div v-else class="space-y-4">
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
                  v-model="form.custom_velja_do"
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
                rows="6"
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
              Shrani spremembe
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
