<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SearchFilter from '@/components/SearchFilter.vue'
import MonthNav from '@/components/MonthNav.vue'
import EventCard from '@/components/EventCard.vue'
import { getAllEvents, getEvents, getEventCategories } from '@/modules/calendar/api/events'
import { checkAuth, getAuthUsername } from '@/api/frappe'

const route = useRoute()
const router = useRouter()

const events = ref([])
const categories = ref([])
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

const groupedByMonth = computed(() => {
  const grouped = {}
  
  for (const event of events.value) {
    if (!event.starts_on) continue
    
    const startStr = String(event.starts_on).trim()
    const endStr = event.ends_on ? String(event.ends_on).trim() : startStr
    
    const startDateOnly = startStr.split(' ')[0]
    const endDateOnly = endStr.split(' ')[0]
    
    const monthKey = startDateOnly.slice(0, 7)
    const year = startDateOnly.slice(0, 4)
    
    if (!grouped[monthKey]) {
      grouped[monthKey] = {
        month_key: monthKey,
        year: year,
        month_num: monthKey.slice(5, 7),
        events: []
      }
    }
    
    const now = getLocalISOString(new Date())
    event.is_now = startStr <= now && now <= (endStr || startStr)
    event.is_multiday = startDateOnly !== endDateOnly
    event.is_today = startDateOnly === new Date().toISOString().split('T')[0]
    
    grouped[monthKey].events.push(event)
  }
  
  // Sort events by date
  for (const monthKey in grouped) {
    grouped[monthKey].events.sort((a, b) => new Date(b.starts_on) - new Date(a.starts_on))
  }
  
  return grouped
})

const monthList = computed(() => {
  return Object.keys(groupedByMonth.value).sort().reverse()
})

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('sl-SI', { day: '2-digit', month: '2-digit' })
}

const formatWeekday = (dateStr) => {
  const date = new Date(dateStr)
  return weekDays[date.toLocaleDateString('en-US', { weekday: 'long' })] || ''
}

const scrollToMonth = (monthKey) => {
  const el = document.getElementById(`month-${monthKey}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

const fetchEvents = async () => {
  try {
    loading.value = true
    const user = await checkAuth()
    const username = getAuthUsername()
    currentUser.value = username || user || ''
    
    const searchQuery = route.query.q || ''
    const category = route.query.category || ''
    
    const publishedEvents = await getAllEvents(searchQuery, category)
    events.value = publishedEvents
    
    if (username || user) {
      const unpublishedEvents = await getEvents([
        ['published', '=', 0],
        ['owner', '=', username || user],
        ...(searchQuery ? [['subject', 'like', `%${searchQuery}%`]] : []),
        ...(category ? [['event_category', '=', category]] : []),
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

const fetchCategories = async () => {
  try {
    categories.value = await getEventCategories()
  } catch (e) {
    console.error('Error fetching categories:', e)
  }
}

const goToEvent = (name) => {
  router.push(`/event/${name}`)
}

watch(() => [route.query.q, route.query.category], () => {
  fetchEvents()
}, { immediate: true })

onMounted(() => {
  fetchCategories()
})
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <SearchFilter :categories="categories" />

    <div class="flex gap-6">
      <!-- Month Navigation -->
      <div class="w-48 shrink-0 hidden md:block">
        <div class="sticky top-4">
          <h5 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Meseci</h5>
          <div class="space-y-1">
            <a
              v-for="monthKey in monthList"
              :key="monthKey"
              href="#"
              class="block py-2 px-3 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
              @click.prevent="scrollToMonth(monthKey)"
            >
              <span class="font-medium">{{ monthNames[monthKey.slice(5, 7)] }}</span>
              <span class="text-xs text-gray-400 ml-1">{{ groupedByMonth[monthKey].year }}</span>
            </a>
          </div>
        </div>
      </div>

      <!-- Events -->
      <div class="flex-1">
        <!-- Loading -->
        <div v-if="loading" class="flex justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {{ error }}
        </div>

        <!-- Content -->
        <div v-else>
          <!-- Month Cards -->
          <div v-for="monthKey in monthList" :key="monthKey" :id="`month-${monthKey}`" class="mb-8">
            <!-- Month Header -->
            <div class="bg-white rounded-t-xl shadow-sm border-b border-gray-100 px-6 py-4">
              <div class="flex justify-between items-center">
                <h3 class="text-lg font-bold text-gray-800">
                  {{ monthNames[monthKey.slice(5, 7)] }} {{ groupedByMonth[monthKey].year }}
                </h3>
                <span class="text-sm text-gray-500">{{ groupedByMonth[monthKey].events.length }} dogodkov</span>
              </div>
            </div>

            <!-- Events -->
            <div class="bg-white rounded-b-xl shadow-sm border-x border-b border-gray-100">
              <div v-for="(event, idx) in groupedByMonth[monthKey].events" :key="event.name" 
                   class="border-b border-gray-50 last:border-b-0">
                <div class="flex p-4 hover:bg-gray-50 transition-colors">
                  <!-- Date Column -->
                  <div class="w-20 shrink-0 text-center">
                    <div class="text-2xl font-bold text-gray-800">{{ new Date(event.starts_on).getDate() }}</div>
                    <div class="text-xs text-gray-500 uppercase">{{ formatWeekday(event.starts_on) }}</div>
                  </div>

                  <!-- Event Details -->
                  <div class="flex-1 grid grid-cols-12 gap-4 items-start">
                    <!-- Time & Title -->
                    <div class="col-span-4">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="w-2 h-2 rounded-full" :style="{ background: event.color || '#ccc' }"></span>
                        <span class="font-semibold text-gray-800 cursor-pointer hover:text-blue-600" @click="goToEvent(event.name)">{{ event.subject }}</span>
                      </div>
                      <div class="text-sm text-gray-500">
                        <template v-if="event.is_multiday">
                          <i class="far fa-calendar mr-1"></i>
                          {{ formatDate(event.starts_on) }} → {{ event.ends_on ? formatDate(event.ends_on) : '?' }}
                        </template>
                        <template v-else>
                          <i class="far fa-clock mr-1"></i>
                          {{ formatDate(event.starts_on).split(' ')[1] }}
                          <span v-if="event.ends_on"> - {{ formatDate(event.ends_on).split(' ')[1] }}</span>
                        </template>
                      </div>
                      <div v-if="event.location" class="text-xs text-gray-400 mt-1">
                        <i class="fas fa-map-marker-alt mr-1"></i>{{ event.location }}
                      </div>
                    </div>

                    <!-- Description -->
                    <div class="col-span-5 text-sm text-gray-600">
                      <template v-if="event.description">
                        {{ event.description.replace(/<[^>]*>/g, '').slice(0, 100) }}{{ event.description.length > 100 ? '...' : '' }}
                      </template>
                      <span v-else class="text-gray-400 italic">Brez opisa</span>
                    </div>

                    <!-- Category -->
                    <div class="col-span-3 text-right">
                      <span v-if="event.event_category"
                            class="inline-block px-2 py-1 rounded text-xs font-semibold"
                            :style="{ backgroundColor: event.color + '15', color: event.color }">
                        {{ event.event_category }}
                      </span>
                      <div v-if="event.is_now" class="mt-2">
                        <span class="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full">V teku</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="monthList.length === 0" class="text-center py-12 bg-white rounded-lg shadow-sm border">
            <p class="text-gray-500">Ni najdenih dogodkov za izbrane filtre.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
