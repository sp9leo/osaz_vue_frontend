<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import WeatherWidget from '@/components/WeatherWidget.vue'
import EventCard from '@/components/EventCard.vue'
import { getUpcomingEvents, getEvents } from '@/modules/calendar/api/events'
import { checkAuth, getAuthUsername } from '@/api/frappe'

const router = useRouter()
const events = ref([])
const loading = ref(true)
const error = ref(null)
const currentUser = ref('')

const monthNames = {
  '01': 'Januar', '02': 'Februar', '03': 'Marec', '04': 'April',
  '05': 'Maj', '06': 'Junij', '07': 'Julij', '08': 'Avgust',
  '09': 'September', '10': 'Oktober', '11': 'November', '12': 'December',
}

const weekDays = {
  'Monday': 'Ponedeljek', 'Tuesday': 'Torek', 'Wednesday': 'Sreda',
  'Thursday': 'Četrtek', 'Friday': 'Petek', 'Saturday': 'Sobota', 'Sunday': 'Nedelja',
}

const groupedEvents = computed(() => {
  if (!events.value || !Array.isArray(events.value)) {
    return []
  }
  
  const grouped = {}
  const now = new Date().toISOString()
  const today = now.split('T')[0]

  for (const event of events.value) {
    if (!event.starts_on) continue
    
    // Parse dates properly - handle both "2026-03-17 11:04:10" and "2026-03-17T11:04:10" formats
    const startStr = String(event.starts_on).trim()
    const endStr = event.ends_on ? String(event.ends_on).trim() : startStr
    
    const startDateOnly = startStr.split(' ')[0].split('T')[0]
    const endDateOnly = endStr.split(' ')[0].split('T')[0]

    event.is_now = event.starts_on <= now && now <= (event.ends_on || event.starts_on)
    event.is_today = startDateOnly === today
    event.is_multiday = startDateOnly !== endDateOnly

    if (!grouped[startDateOnly]) {
      grouped[startDateOnly] = []
    }
    grouped[startDateOnly].push(event)
  }

  const sorted = []
  for (const date of Object.keys(grouped).sort()) {
    sorted.push({
      date_group: date,
      events: grouped[date].sort((a, b) => new Date(a.starts_on) - new Date(b.starts_on)),
    })
  }
  return sorted
})

const hasMultidayEvents = computed(() => {
  return groupedEvents.value.some(group => 
    group.events.some(event => event.is_multiday)
  )
})

const multidayEvents = computed(() => {
  const all = []
  for (const group of groupedEvents.value) {
    for (const event of group.events) {
      if (event.is_multiday) {
        all.push(event)
      }
    }
  }
  return all
})

const formatWeekday = (dateStr) => {
  const date = new Date(dateStr)
  return weekDays[date.toLocaleDateString('en-US', { weekday: 'long' })] || ''
}

const formatDay = (dateStr) => {
  const date = new Date(dateStr)
  return date.getDate()
}

const formatMonth = (dateStr) => {
  const date = new Date(dateStr)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return monthNames[month] || ''
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('sl-SI', { day: '2-digit', month: '2-digit' })
}

const fetchEvents = async () => {
  try {
    loading.value = true
    const user = await checkAuth()
    const username = getAuthUsername()
    currentUser.value = username || user || ''
    
    const publishedEvents = await getUpcomingEvents()
    events.value = publishedEvents
    
    if (username || user) {
      const unpublishedEvents = await getEvents([
        ['starts_on', '>=', new Date().toISOString().split('T')[0]],
        ['published', '=', 0],
        ['owner', '=', username || user]
      ])
      
      const existingNames = new Set(events.value.map(e => e.name))
      for (const event of unpublishedEvents) {
        if (!existingNames.has(event.name)) {
          events.value.push(event)
        }
      }
    }
  } catch (e) {
    error.value = e.message
    console.error('Error fetching events:', e)
  } finally {
    loading.value = false
  }
}

const goToEvent = (name) => {
  router.push(`/event/${name}`)
}

onMounted(fetchEvents)
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <!-- Header -->
    <div class="flex justify-between items-start mb-6">
      <h3 class="text-2xl font-bold text-gray-800">Pregled aktivnosti</h3>
      <WeatherWidget />
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
      {{ error }}
    </div>

    <!-- Content -->
    <div v-else class="flex gap-6">
      <!-- Main Timeline -->
      <div class="flex-1">
        <div v-for="group in groupedEvents" :key="group.date_group" class="mb-8">
          <!-- Date Header -->
          <div class="flex items-center mb-4">
            <div class="bg-white shadow-sm border rounded-lg text-center py-2 px-4 min-w-[80px]">
              <div class="text-2xl font-bold text-blue-600">{{ formatDay(group.date_group) }}</div>
              <div class="text-xs text-gray-500 uppercase">{{ formatMonth(group.date_group) }}</div>
            </div>
            <div class="ml-4">
              <h5 class="text-lg font-semibold text-gray-600">
                {{ formatWeekday(group.date_group) }}
                <span v-if="group.events[0]?.is_today" class="ml-2 px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">Danes</span>
              </h5>
            </div>
          </div>

          <!-- Events Timeline -->
          <div class="border-l-2 border-gray-200 ml-4 pl-6 space-y-3">
            <!-- Single-day events -->
            <EventCard
              v-for="item in group.events.filter(e => !e.is_multiday)"
              :key="item.name"
              :event="item"
              layout="default"
            />

            <!-- Multiday events -->
            <EventCard
              v-for="item in group.events.filter(e => e.is_multiday)"
              :key="item.name"
              :event="item"
              layout="multiday"
            />
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="groupedEvents.length === 0" class="text-center py-12 bg-white rounded-lg shadow-sm border">
          <p class="text-gray-500">Ni dogodkov.</p>
        </div>
      </div>

      <!-- Sidebar - Multiday Events -->
      <div v-if="hasMultidayEvents" class="w-64 shrink-0">
        <div class="sticky top-4">
          <h5 class="font-semibold text-gray-700 mb-3">Večdnevni dogodki</h5>
          <div class="space-y-2">
            <div v-for="event in multidayEvents" :key="event.name" 
                 class="bg-white rounded-lg shadow-sm border p-3 hover:shadow-md transition-shadow cursor-pointer"
                 @click="goToEvent(event.name)">
              <p class="font-semibold text-gray-800 text-sm">{{ event.subject }}</p>
              <div class="flex items-center text-xs text-gray-500 mt-1">
                <i class="far fa-calendar mr-1 text-blue-500"></i>
                {{ formatDate(event.starts_on) }} → {{ formatDate(event.ends_on) }}
              </div>
              <div v-if="event.location" class="flex items-center text-xs text-gray-500 mt-1">
                <i class="fas fa-map-marker-alt mr-1 text-blue-500"></i>
                {{ event.location }}
              </div>
              <span v-if="event.event_category" 
                    class="inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded"
                    :style="{ backgroundColor: event.color + '15', color: event.color }">
                {{ event.event_category }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
