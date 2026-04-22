<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getResource, checkAuth, getAuthUsername } from '@/api/frappe'

const route = useRoute()
const router = useRouter()

const event = ref(null)
const loading = ref(true)
const error = ref(null)
const currentUser = ref('')

const isOwner = computed(() => {
  if (!currentUser.value || !event.value?.owner) return false
  return event.value.owner === currentUser.value ||
         event.value.owner === localStorage.getItem('frappe_user') ||
         event.value.owner === localStorage.getItem('frappe_user_fullname') ||
         (currentUser.value && event.value.owner?.includes(currentUser.value))
})

const getLocalISOString = (date) => {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

const isNow = computed(() => {
  if (!event.value?.starts_on) return false
  const start = getLocalISOString(event.value.starts_on)
  const end = event.value.ends_on ? getLocalISOString(event.value.ends_on) : start
  const now = getLocalISOString(new Date())
  return start <= now && now <= end
})

const isMultiday = computed(() => {
  if (!event.value?.starts_on || !event.value?.ends_on) return false
  const start = String(event.value.starts_on).trim().split(' ')[0]
  const end = String(event.value.ends_on).trim().split(' ')[0]
  return start !== end
})

const isPast = computed(() => {
  if (!event.value?.starts_on) return false
  const eventEnd = event.value.ends_on ? new Date(event.value.ends_on) : new Date(event.value.starts_on)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)
  return eventEnd < yesterday
})

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('sl-SI', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const formatTime = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' })
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('sl-SI', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const fetchEvent = async () => {
  try {
    loading.value = true
    const response = await getResource(`Dogodek/${route.params.name}`)
    event.value = response.data || response
    const user = await checkAuth()
    const username = getAuthUsername()
    currentUser.value = username || user || ''
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  if (isPast.value) {
    router.push('/archive')
  } else {
    router.push('/')
  }
}

onMounted(fetchEvent)
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <!-- Back Button -->
    <button 
      @click="goBack"
      class="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
    >
      <i class="fas fa-arrow-left"></i>
      <span>Nazaj</span>
    </button>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
      {{ error }}
    </div>

    <!-- Event Detail -->
    <div v-else-if="event" class="bg-white rounded-lg shadow-sm">
      <!-- Header -->
      <div class="p-6 border-b border-gray-100">
        <div class="flex items-start gap-3 mb-3">
          <div class="w-3 h-3 rounded-full mt-1.5" :style="{ background: event.color || '#ccc' }"></div>
          <h1 class="text-2xl font-bold text-gray-800">{{ event.subject }}</h1>
        </div>

        <!-- Category & Status -->
        <div class="flex flex-wrap gap-2">
          <span v-if="event.event_category"
                class="inline-block px-3 py-1 rounded-full text-sm font-semibold"
                :style="{ backgroundColor: (event.color || '#ccc') + '20', color: event.color || '#666' }">
            {{ event.event_category }}
          </span>
          <span v-if="event.predvideno" class="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-600">
            <i class="fa fa-exclamation-triangle mr-1"></i> Predvideno
          </span>
          <span v-if="isNow" class="inline-block px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-600">
            <i class="fas fa-play mr-1"></i> V teku
          </span>
        </div>
      </div>

      <!-- Details -->
      <div class="p-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Date & Time -->
          <div>
            <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Čas</h3>
            
            <div v-if="isMultiday" class="space-y-2">
              <div class="flex items-center gap-2 text-gray-700">
                <i class="far fa-calendar text-blue-500 w-5"></i>
                <span>{{ formatDate(event.starts_on) }} → {{ event.ends_on ? formatDate(event.ends_on) : '?' }}</span>
              </div>
            </div>
            
            <div v-else class="space-y-2">
              <div class="flex items-center gap-2 text-gray-700">
                <i class="far fa-clock text-blue-500 w-5"></i>
                <span>{{ formatTime(event.starts_on) }}</span>
                <span v-if="event.ends_on">- {{ formatTime(event.ends_on) }}</span>
              </div>
              <div class="flex items-center gap-2 text-gray-500 text-sm">
                <i class="far fa-calendar text-gray-400 w-5"></i>
                <span>{{ formatDate(event.starts_on) }}</span>
              </div>
            </div>
          </div>

          <!-- Location -->
          <div v-if="event.location">
            <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Lokacija</h3>
            <div class="flex items-center gap-2 text-gray-700">
              <i class="fas fa-map-marker-alt text-blue-500 w-5"></i>
              <span>{{ event.location }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Description -->
      <div v-if="event.description" class="p-6 border-t border-gray-100">
        <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Opis</h3>
        <div class="prose prose-sm max-w-none text-gray-700" v-html="event.description"></div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 bg-gray-50 rounded-b-lg border-t border-gray-100">
        <div class="flex justify-between items-center text-sm text-gray-500">
          <span>
            <i class="fas fa-info-circle mr-1"></i>
            Zadnja sprememba: {{ formatDateTime(event.modified) }}<span v-if="event.owner"> - {{ event.owner }}</span>
          </span>
          <div class="flex items-center gap-2">
            <span class="font-mono text-xs">{{ event.name }}</span>
            <button v-if="isOwner" @click="router.push(`/event/${event.name}/edit`)" class="ml-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors">
              <i class="fas fa-edit mr-1"></i>Uredi
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
