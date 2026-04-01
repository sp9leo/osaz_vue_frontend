<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { checkAuth, getResource, getAuthUsername } from '@/api/frappe'
import { updateEvent, getEventCategories } from '@/modules/calendar/api/events'

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const error = ref(null)
const categories = ref([])
const eventName = route.params.name
const currentUser = ref('')

const form = ref({
  subject: '',
  starts_on: '',
  ends_on: '',
  description: '',
  event_category: '',
  location: '',
  custom_predvideno: 0,
  status: 'Open',
  published: 1,
})

const fetchCategories = async () => {
  try {
    categories.value = await getEventCategories()
  } catch (e) {
    console.error('Error fetching categories:', e)
  }
}

const fetchEvent = async () => {
  try {
    loading.value = true
    const response = await getResource(`Dogodek/${eventName}`)
    const event = response.data || response
    const user = await checkAuth()
    const username = getAuthUsername()
    currentUser.value = username || user || ''
    
    form.value = {
      subject: event.subject || '',
      starts_on: formatDateTimeLocal(event.starts_on),
      ends_on: event.ends_on ? formatDateTimeLocal(event.ends_on) : '',
      description: event.description || '',
      event_category: event.event_category || '',
      location: event.location || '',
      custom_predvideno: event.custom_predvideno ? true : false,
      status: event.status || 'Open',
      published: event.published ? true : false,
    }
  } catch (e) {
    error.value = 'Napaka pri nalaganju dogodka: ' + e.message
  } finally {
    loading.value = false
  }
}

const formatDateTimeLocal = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

const handleSubmit = async () => {
  if (!form.value.subject || !form.value.starts_on) {
    error.value = 'Prosim, izpolnite obvezna polja (naslov in začetek)'
    return
  }

  try {
    loading.value = true
    error.value = null
    
    const eventData = {
      subject: form.value.subject,
      starts_on: form.value.starts_on.replace('T', ' '),
      ends_on: form.value.ends_on ? form.value.ends_on.replace('T', ' ') : null,
      description: form.value.description,
      event_category: form.value.event_category,
      location: form.value.location,
      custom_predvideno: form.value.custom_predvideno ? 1 : 0,
      status: form.value.status,
      published: form.value.published ? 1 : 0,
    }
    
    await updateEvent(eventName, eventData)
    router.push(`/event/${eventName}`)
  } catch (e) {
    error.value = 'Napaka pri shranjevanju dogodka: ' + (e.message || 'Neznana napaka')
    console.error('Error updating event:', e)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  const user = await checkAuth()
  const username = getAuthUsername()
  if (!user && !username) {
    router.push(`/login?redirect=/event/${eventName}/edit`)
    return
  }
  
  await fetchCategories()
  await fetchEvent()
})
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <div class="max-w-2xl mx-auto">
      <div class="bg-white rounded-lg shadow-sm">
        <div class="p-6 border-b border-gray-100">
          <h2 class="text-xl font-bold text-gray-800">Uredi dogodek</h2>
        </div>

        <form @submit.prevent="handleSubmit" class="p-6">
          <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {{ error }}
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Naslov dogodka <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.subject"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Vnesite naslov dogodka"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Začetek <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="form.starts_on"
                  type="datetime-local"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Konec
                </label>
                <input
                  v-model="form.ends_on"
                  type="datetime-local"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Kategorija
              </label>
              <select
                v-model="form.event_category"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Izberite kategorijo</option>
                <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Lokacija
              </label>
              <input
                v-model="form.location"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Vnesite lokacijo"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Dodal
              </label>
              <input
                :value="currentUser"
                type="text"
                readonly
                class="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Opis
              </label>
              <textarea
                v-model="form.description"
                rows="4"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Vnesite opis dogodka"
              ></textarea>
            </div>

            <div class="flex items-center gap-4">
              <div class="flex items-center gap-2">
                <input
                  v-model="form.published"
                  type="checkbox"
                  id="published"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  :checked="form.published"
                />
                <label for="published" class="text-sm text-gray-700">
                  Objavljen
                </label>
              </div>

              <div class="flex items-center gap-2">
                <input
                  v-model="form.custom_predvideno"
                  type="checkbox"
                  id="predvideno"
                  class="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  :checked="form.custom_predvideno"
                />
                <label for="predvideno" class="text-sm text-gray-700">
                  Predvideno
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
