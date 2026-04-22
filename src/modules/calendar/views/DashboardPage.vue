<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import WeatherWidget from '@/components/WeatherWidget.vue'
import EventCard from '@/components/EventCard.vue'
import EditObvestiloModal from '@/components/EditObvestiloModal.vue'
import { getEventsInRange } from '@/modules/calendar/api/events'
import { getAllObvestila } from '@/modules/calendar/api/obvestila'
import { checkAuth, getAuthUsername } from '@/api/frappe'

const router = useRouter()

const todayEvents = ref([])
const weekEvents = ref([])
const announcements = ref([])
const loading = ref(true)
const loadingObvestila = ref(true)
const isLoggedIn = ref(false)
const currentUser = ref('')
const refreshInterval = 60000
const expandedObvestila = ref(new Set())
const showEditModal = ref(false)
const editingObvestilo = ref(null)

let refreshTimer = null

const openEditModal = (obvestilo) => {
  editingObvestilo.value = obvestilo
  showEditModal.value = true
}

const closeEditModal = () => {
  showEditModal.value = false
  editingObvestilo.value = null
}

const onObvestiloSaved = () => {
  fetchObvestila()
}

const parseDate = (dateStr) => {
  if (!dateStr) return null
  const str = String(dateStr).trim()
  if (str.includes(' ')) {
    const [date, time] = str.split(' ')
    const [year, month, day] = date.split('-')
    return new Date(year, month - 1, day)
  }
  return new Date(str)
}

const isObvestiloValid = (item) => {
  if (!item.zacetek) return true
  
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  
  const zacetek = parseDate(item.zacetek)
  if (!zacetek || isNaN(zacetek.getTime())) return true
  zacetek.setHours(0, 0, 0, 0)
  
  if (now < zacetek) return false
  
  let veljaDo = parseDate(item.custom_velja_do)
  if (veljaDo && !isNaN(veljaDo.getTime())) {
    veljaDo.setHours(23, 59, 59, 999)
    return now <= veljaDo
  }
  
  return true
}

const validAnnouncements = computed(() => {
  return announcements.value.filter(a => {
    const publicValue = a.public
    const isPublic = publicValue === 1 || publicValue === true || publicValue === '1'
    if (!isPublic) return false
    if (isLoggedIn.value) return true
    return isObvestiloValid(a)
  })
})

const importantAnnouncements = computed(() => {
  return validAnnouncements.value.filter(a => a.important === 1 || a.important === true || a.important === '1')
})

const checkLogin = async () => {
  const user = await checkAuth()
  const username = getAuthUsername()
  isLoggedIn.value = !!(user || username)
  currentUser.value = username || user || ''
}

watch(isLoggedIn, (newVal) => {
  if (newVal) {
    fetchObvestila()
  }
})

const getPlainText = (content) => {
  if (!content) return ''
  return content.replace(/<[^>]*>/g, '')
}

const isLongContent = (content, maxLen = 100) => {
  if (!content) return false
  return getPlainText(content).length > maxLen
}

const getPreview = (content, maxLen = 100) => {
  if (!content) return ''
  const plain = getPlainText(content)
  return plain.length > maxLen ? plain.slice(0, maxLen) + '...' : plain
}

const toggleExpand = (name) => {
  if (expandedObvestila.value.has(name)) {
    expandedObvestila.value.delete(name)
  } else {
    expandedObvestila.value.add(name)
  }
  expandedObvestila.value = new Set(expandedObvestila.value)
}

const weekDaysShort = {
  'Monday': 'Pon', 'Tuesday': 'Tor', 'Wednesday': 'Sre',
  'Thursday': 'Čet', 'Friday': 'Pet', 'Saturday': 'Sob', 'Sunday': 'Ned',
}

const monthNames = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'Maj', '06': 'Jun', '07': 'Jul', '08': 'Avg',
  '09': 'Sep', '10': 'Okt', '11': 'Nov', '12': 'Dec',
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('sl-SI', { day: '2-digit', month: '2-digit' })
}

const formatDayHeader = (dateStr) => {
  const date = new Date(dateStr)
  const dayName = weekDaysShort[date.toLocaleDateString('en-US', { weekday: 'long' })] || ''
  const dayNum = date.getDate()
  const month = monthNames[String(date.getMonth() + 1).padStart(2, '0')]
  return `${dayName}, ${dayNum}. ${month}.`
}

const getWeekRange = () => {
  const today = new Date()
  const endDate = new Date(today)
  endDate.setDate(endDate.getDate() + 6)
  
  const todayStr = today.toISOString().split('T')[0]
  const endDateStr = endDate.toISOString().split('T')[0]
  
  return { start: todayStr, end: endDateStr }
}

const groupedWeekEvents = computed(() => {
  const grouped = {}
  const now = new Date().toISOString()
  const today = now.split('T')[0]
  
  for (const event of weekEvents.value) {
    if (!event.starts_on) continue
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

const todayGroupedEvents = computed(() => {
  const now = new Date().toISOString()
  const today = now.split('T')[0]
  
  for (const event of todayEvents.value) {
    if (!event.starts_on) continue
    const startStr = String(event.starts_on).trim()
    const endStr = event.ends_on ? String(event.ends_on).trim() : startStr
    
    const startDateOnly = startStr.split(' ')[0].split('T')[0]
    const endDateOnly = endStr.split(' ')[0].split('T')[0]
    
    event.is_now = event.starts_on <= now && now <= (event.ends_on || event.starts_on)
    event.is_today = startDateOnly === today
    event.is_multiday = startDateOnly !== endDateOnly
  }
  
  return todayEvents.value
})

const fetchEvents = async () => {
  try {
    loading.value = true
    
    const today = new Date().toISOString().split('T')[0]
    const todayEnd = today + ' 23:59:59'
    const weekRange = getWeekRange()
    
    const todayData = await getEventsInRange(today, todayEnd)
    const weekData = await getEventsInRange(weekRange.start + ' 00:00:00', weekRange.end + ' 23:59:59')
    
    todayEvents.value = (todayData || []).sort((a, b) => new Date(a.starts_on) - new Date(b.starts_on))
    weekEvents.value = (weekData || []).sort((a, b) => new Date(a.starts_on) - new Date(b.starts_on))
  } catch (e) {
    console.error('Error fetching events:', e)
  } finally {
    loading.value = false
  }
}

const fetchObvestila = async () => {
  try {
    loadingObvestila.value = true
    const data = await getAllObvestila()
    announcements.value = data || []
  } catch (e) {
    console.error('Error fetching obvestila:', e)
  } finally {
    loadingObvestila.value = false
  }
}

const goToCalendar = () => {
  router.push('/')
}

const startAutoRefresh = () => {
  refreshTimer = setInterval(() => {
    fetchEvents()
    fetchObvestila()
  }, refreshInterval)
}

onMounted(async () => {
  await checkLogin()
  await Promise.all([fetchEvents(), fetchObvestila()])
  startAutoRefresh()
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})
</script>

<template>
  <div class="container mx-auto px-4 py-4">
    <!-- Important Announcements Banner -->
    <div v-if="importantAnnouncements.length > 0" class="mb-4">
      <div class="bg-red-50 border border-red-200 rounded-lg p-4">
        <div class="flex items-center gap-2 mb-2">
          <i class="fas fa-exclamation-triangle text-red-500"></i>
          <h3 class="font-bold text-red-700">Pomembna obvestila</h3>
        </div>
        <div class="space-y-2">
          <div v-for="item in importantAnnouncements" :key="item.name" class="bg-white rounded-lg p-3 shadow-sm">
            <div class="flex justify-between items-start">
              <h4 class="font-semibold text-gray-800">{{ item.title }}</h4>
              <div class="flex items-center gap-2">
                <button v-if="isLoggedIn" 
                        @click="openEditModal(item)"
                        class="text-xs text-blue-600 hover:text-blue-800">
                  <i class="fas fa-edit"></i>
                </button>
                <button v-if="item.content && isLongContent(item.content)" 
                        @click="toggleExpand(item.name)"
                        class="text-xs text-gray-500 hover:text-gray-700">
                  {{ expandedObvestila.has(item.name) ? 'Manj' : 'Preberi več' }}
                </button>
              </div>
            </div>
            <div v-if="item.content" class="mt-1">
              <div v-if="expandedObvestila.has(item.name)" 
                   class="text-sm text-gray-600 prose prose-sm max-w-none" 
                   v-html="item.content"></div>
              <p v-else class="text-sm text-gray-600">{{ getPreview(item.content) }}</p>
            </div>
            <span class="text-xs text-gray-400 mt-1 block">{{ formatDate(item.zacetek) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-8rem)]">
      <!-- Left Column: Info & Alerts -->
      <div class="flex flex-col gap-4">
        <!-- Weather Widget -->
        <WeatherWidget />
        
        <!-- Announcements -->
        <div class="bg-white rounded-lg shadow-sm p-4 flex-1 overflow-auto">
          <h3 class="text-lg font-bold text-gray-800 mb-3 flex items-center">
            <i class="fas fa-bullhorn text-blue-500 mr-2"></i>
            Obvestila
          </h3>
          
          <div v-if="loadingObvestila" class="flex justify-center py-4">
            <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          </div>
          
          <div v-else-if="validAnnouncements.length === 0" class="text-center text-gray-400 py-4">
            <p>Ni obvestil</p>
          </div>
          
          <div v-else class="space-y-3">
            <div v-for="item in validAnnouncements" :key="item.name" 
                 class="border-l-4 border-blue-500 pl-3 py-1 group">
              <div class="flex justify-between items-start">
                <h4 class="font-semibold text-gray-800 text-sm">{{ item.title }}</h4>
                <button v-if="isLoggedIn" 
                        @click="openEditModal(item)"
                        class="text-xs text-blue-600 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition-opacity">
                  <i class="fas fa-edit"></i>
                </button>
              </div>
              <div v-if="item.content" class="mt-0.5">
                <div v-if="expandedObvestila.has(item.name)" 
                     class="text-xs text-gray-500 prose prose-xs max-w-none" 
                     v-html="item.content"></div>
                <p v-else class="text-xs text-gray-500">{{ getPreview(item.content, 80) }}</p>
                <button v-if="isLongContent(item.content, 80)" 
                        @click="toggleExpand(item.name)"
                        class="text-xs text-blue-600 hover:text-blue-800 mt-0.5">
                  {{ expandedObvestila.has(item.name) ? 'Manj' : 'Preberi več' }}
                </button>
              </div>
              <span class="text-xs text-gray-400">{{ formatDate(item.zacetek) }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Middle Column: Today's Events -->
      <div class="flex flex-col">
        <div class="bg-white rounded-lg shadow-sm p-4 flex-1 flex flex-col overflow-hidden">
          <div class="flex justify-between items-center mb-3">
            <h3 class="text-lg font-bold text-gray-800 flex items-center">
              <i class="fas fa-calendar-day text-green-500 mr-2"></i>
              Današnji dogodki
              <span v-if="todayEvents.length > 0" class="ml-2 bg-green-100 text-green-600 text-xs font-bold px-2 py-0.5 rounded-full">
                {{ todayEvents.length }}
              </span>
            </h3>
          </div>
          
          <div v-if="loading" class="flex justify-center items-center flex-1">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
          </div>
           
          <div v-else-if="todayEvents.length === 0" class="flex-1 flex items-center justify-center text-gray-400">
            <div class="text-center">
              <i class="fas fa-calendar-times text-3xl mb-2"></i>
              <p>Ni dogodkov danes</p>
            </div>
          </div>
          
          <div v-else class="flex-1 overflow-auto space-y-1">
            <div
              v-for="event in todayGroupedEvents.slice(0, 5)"
              :key="event.name"
              class="cursor-pointer"
              @click="router.push(`/event/${event.name}`)"
            >
              <EventCard
                :event="event"
                layout="dashboard"
              />
            </div>
          </div>
          
          <div v-if="todayEvents.length > 5" class="mt-2 pt-2 border-t border-gray-100">
            <button @click="goToCalendar" class="text-sm text-blue-600 hover:text-blue-800 font-medium">
              Prikaži vse ({{ todayEvents.length }}) <i class="fas fa-arrow-right ml-1"></i>
            </button>
          </div>
        </div>
      </div>
      
      <!-- Right Column: This Week -->
      <div class="flex flex-col">
        <div class="bg-white rounded-lg shadow-sm p-4 flex-1 flex flex-col overflow-hidden">
          <div class="flex justify-between items-center mb-3">
            <h3 class="text-lg font-bold text-gray-800 flex items-center">
              <i class="fas fa-calendar-week text-purple-500 mr-2"></i>
              Ta teden
              <span v-if="weekEvents.length > 0" class="ml-2 bg-purple-100 text-purple-600 text-xs font-bold px-2 py-0.5 rounded-full">
                {{ weekEvents.length }}
              </span>
            </h3>
          </div>
          
          <div v-if="loading" class="flex justify-center items-center flex-1">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
          </div>
          
          <div v-else-if="weekEvents.length === 0" class="flex-1 flex items-center justify-center text-gray-400">
            <div class="text-center">
              <i class="fas fa-calendar text-3xl mb-2"></i>
              <p>Ni dogodkov ta teden</p>
            </div>
          </div>
          
          <div v-else class="flex-1 overflow-auto space-y-1">
            <div v-for="group in groupedWeekEvents.slice(0, 7)" :key="group.date_group" class="mb-2">
              <div class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                {{ formatDayHeader(group.date_group) }}
              </div>
              <div class="space-y-1">
                <div v-for="event in group.events.slice(0, 3)" :key="event.name"
                     class="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                     @click="router.push(`/event/${event.name}`)">
                  <span v-if="event.starts_on" class="text-xs text-gray-400 w-10 shrink-0">
                    {{ new Date(event.starts_on).toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' }) }}
                  </span>
                  <span class="text-sm text-gray-700 truncate flex-1">{{ event.subject }}</span>
                  <span v-if="event.event_category" 
                        class="shrink-0 px-1.5 py-0.5 rounded text-xs"
                        :style="{ backgroundColor: (event.color || '#888') + '15', color: event.color || '#888' }">
                    {{ event.event_category }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div v-if="weekEvents.length > 5" class="mt-2 pt-2 border-t border-gray-100">
            <button @click="goToCalendar" class="text-sm text-blue-600 hover:text-blue-800 font-medium">
              Prikaži vse ({{ weekEvents.length }}) <i class="fas fa-arrow-right ml-1"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <EditObvestiloModal 
    v-if="showEditModal && editingObvestilo"
    :show="showEditModal"
    :obvestilo="editingObvestilo"
    @close="closeEditModal"
    @saved="onObvestiloSaved"
  />
</template>
