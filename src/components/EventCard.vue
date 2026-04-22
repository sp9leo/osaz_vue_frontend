<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { checkAuth, getAuthUsername } from '@/api/frappe'

const props = defineProps({
  event: {
    type: Object,
    required: true,
  },
  layout: {
    type: String,
    default: 'default',
  },
})

const router = useRouter()
const showFullDescription = ref(false)
const currentUser = ref('')
const currentUserFull = ref('')

onMounted(async () => {
  const user = await checkAuth()
  const username = getAuthUsername()
  currentUser.value = username || ''
  currentUserFull.value = user || ''
})

const isOwner = computed(() => {
  if (!currentUser.value) return false
  return props.event.owner === currentUser.value || 
         props.event.owner === currentUserFull.value ||
         props.event.owner === localStorage.getItem('frappe_user') ||
         props.event.owner === localStorage.getItem('frappe_user_fullname') ||
         (currentUser.value && props.event.owner?.includes(currentUser.value))
})

const isPublished = computed(() => {
  return props.event.published === 1 || props.event.published === true
})

const isNow = computed(() => {
  if (!props.event.starts_on) return false
  const now = new Date().toISOString()
  const start = props.event.starts_on
  const end = props.event.ends_on || start
  return start <= now && now <= end
})

const goToEvent = () => {
  router.push(`/event/${props.event.name}`)
}

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
  return date.toLocaleString('sl-SI', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const formatPrettyDate = (dateStr) => {
  if (!dateStr) return ''
  const eventDate = new Date(dateStr)
  const now = new Date()
  const diffMs = now - eventDate
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  
  const futureMs = eventDate - now
  const futureMins = Math.floor(futureMs / 60000)
  const futureHours = Math.floor(futureMins / 60)
  const futureDays = Math.floor(futureHours / 24)
  
  if (futureMins < 0) {
    if (diffMins < 60) {
      return `Pred ${diffMins} min`
    } else if (diffHours < 24) {
      return `Pred ${diffHours} ${diffHours === 1 ? 'uro' : (diffHours < 3 ? 'urama' : 'urami')}`
    } else if (diffDays === 1) {
      return 'Včeraj'
    } else if (diffDays < 7) {
      return `Pred ${diffDays} dnevi`
    } else {
      return eventDate.toLocaleDateString('sl-SI', { day: '2-digit', month: '2-digit' })
    }
  } else if (futureMins < 60) {
    return `Čez ${futureMins} min`
  } else if (futureHours < 24) {
    return `Čez ${futureHours} ${futureHours === 1 ? 'uro' : (futureHours < 5 ? 'uri' : 'ur')}`
  } else if (futureDays === 1) {
    return 'Jutri'
  } else if (futureDays < 7) {
    return `Čez ${futureDays} dni`
  } else {
    return eventDate.toLocaleDateString('sl-SI', { day: '2-digit', month: '2-digit' })
  }
}

const rawDescription = computed(() => props.event.description || '')

const cleanDescription = computed(() => {
  const desc = rawDescription.value
  return desc.replace(/<[^>]*>/g, '')
})

const descriptionId = computed(() => `desc-${props.event.name.replace(/\./g, '-')}`)
const isLongDescription = computed(() => cleanDescription.value.length > 120)
const preview = computed(() => cleanDescription.value.slice(0, 120))

const toggleDescription = () => {
  showFullDescription.value = !showFullDescription.value
}
</script>

<template>
  <!-- Default Layout (single-day events) -->
  <div v-if="layout === 'default'" class="bg-white rounded-lg shadow-sm border-0 mb-3 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
    <div class="p-4">
      <div class="grid grid-cols-12 gap-4">
        <div class="col-span-3">
          <div class="flex items-center mb-1">
            <div class="mr-2" :style="{ width: '8px', height: '8px', background: event.color || '#ccc', borderRadius: '50%' }"></div>
            <h6 class="font-bold mb-0 text-gray-800 cursor-pointer hover:text-blue-600" @click="goToEvent" :title="event.name">{{ event.subject }}</h6>
          </div>
          <div class="text-gray-500 text-sm mt-1">
            <span v-if="!isNow" class="font-semibold text-gray-400">{{ formatPrettyDate(event.starts_on) }}</span>
            <template v-if="!isNow && event.starts_on"><br></template>
            <i v-if="event.starts_on" class="far fa-clock mr-2 text-blue-500"></i>
            <template v-if="event.starts_on">
              {{ formatTime(event.starts_on) }}<span v-if="event.ends_on"> - {{ formatTime(event.ends_on) }}</span>
            </template>
            
            <span v-if="isNow" class="inline-block px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full ml-2">V teku</span>
            <div v-if="event.location" class="mt-1">
              <i class="fas fa-map-signs mr-2 text-blue-500"></i>
              {{ event.location }}
            </div>
          </div>
        </div>

        <div class="col-span-7">
          <div v-if="isLongDescription && !showFullDescription" class="text-gray-500 text-sm break-words">
            {{ preview }}...
          </div>
          <button 
            v-if="isLongDescription" 
            class="text-blue-600 text-sm font-semibold cursor-pointer hover:underline bg-none border-none p-0"
            @click="toggleDescription"
          >
            {{ showFullDescription ? 'Skrij opis' : 'Prikaži celoten opis' }}
          </button>
          <div v-if="showFullDescription" class="mt-2 text-sm text-gray-500 border-l-2 pl-2 prose prose-sm max-w-none" v-html="rawDescription"></div>
          <div v-if="!isLongDescription && !showFullDescription" class="text-gray-500 text-sm break-words" v-html="rawDescription || 'Brez opisa.'"></div>
        </div>

        <div class="col-span-2 text-right mt-2 md:mt-0">
          <span v-if="event.event_category" 
                class="inline-block py-1 px-3 rounded-full text-xs font-bold"
                :style="{ backgroundColor: event.color + '15', color: event.color, border: '1px solid ' + event.color + '30' }">
            {{ event.event_category }}
          </span>
          <span v-if="event.predvideno" class="inline-block py-1 px-3 rounded-full text-xs font-bold text-red-600 mt-1">
            <i class="fa fa-exclamation-triangle" aria-hidden="true"></i> Predvideno
          </span>
          <span v-if="isOwner && isPublished" class="inline-block py-1 px-3 rounded-full text-xs font-bold bg-green-100 text-green-600 mt-1 ml-1">
            <i class="fas fa-check mr-1"></i>Objavljen
          </span>
          <span v-if="isOwner && !isPublished" class="inline-block py-1 px-3 rounded-full text-xs font-bold bg-yellow-100 text-yellow-600 mt-1 ml-1">
            <i class="fas fa-eye-slash mr-1"></i>Neobjavljen
          </span>
        </div>
      </div>

      <div class="flex justify-end items-center mt-3 pt-2 border-t border-gray-100">
        <span class="text-gray-400 text-xs italic mr-2">
          <i class="fas fa-info-circle mr-1"></i>
          Zadnja sprememba: {{ formatDateTime(event.modified) }}<span v-if="event.custom_added_by"> - {{ event.custom_added_by }}</span> - {{ event.name }} {{event.owner}}
        </span>
        <button type="button" class="bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded ml-1" @click="goToEvent" :title="event.name">
          <i class="fas fa-book-reader"></i>
        </button>
        <button v-if="isOwner" type="button" class="bg-blue-100 hover:bg-blue-200 text-blue-600 text-xs px-2 py-1 rounded ml-1" @click="router.push(`/event/${event.name}/edit`)" title="Uredi">
          <i class="fas fa-edit"></i>
        </button>
      </div>
    </div>
  </div>

  <!-- Multiday Layout -->
  <div v-else-if="layout === 'multiday'" class="bg-white rounded-lg shadow-sm border-0 mb-3 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
    <div class="p-4">
      <div class="grid grid-cols-12 gap-4 items-center">
        <div class="col-span-4">
          <div class="flex items-center mb-1">
            <div :style="{ width: '8px', height: '8px', background: event.color || '#ccc', borderRadius: '50%' }" class="mr-2"></div>
            <h6 class="font-bold mb-0 text-gray-800 cursor-pointer hover:text-blue-600" @click="goToEvent">{{ event.subject }}</h6>
          </div>
          <div class="text-gray-500 text-sm mt-1">
            <i class="far fa-calendar mr-2 text-blue-500"></i>
            {{ formatDate(event.starts_on) }} → {{ event.ends_on ? formatDate(event.ends_on) : '?' }}
            <span v-if="isNow" class="inline-block px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full ml-2">V teku</span>
            <div v-if="event.location" class="mt-1">
              <i class="fas fa-map-signs mr-2 text-blue-500"></i>
              {{ event.location }}
            </div>
          </div>
        </div>

        <div class="col-span-5">
          <div v-if="isLongDescription && !showFullDescription" class="text-gray-500 text-sm break-words">
            {{ preview }}...
          </div>
          <button 
            v-if="isLongDescription" 
            class="text-blue-600 text-sm font-semibold cursor-pointer hover:underline bg-none border-none p-0"
            @click="toggleDescription"
          >
            {{ showFullDescription ? 'Skrij opis' : 'Prikaži celoten opis' }}
          </button>
          <div v-if="showFullDescription" class="mt-2 text-sm text-gray-500 border-l-2 pl-2 prose prose-sm max-w-none" v-html="rawDescription"></div>
          <div v-if="!isLongDescription && !showFullDescription" class="text-gray-500 text-sm" v-html="rawDescription || 'Brez opisa.'"></div>
        </div>

        <div class="col-span-3 text-right mt-2 md:mt-0">
          <span v-if="event.event_category" 
                class="inline-block py-1 px-3 rounded-full text-xs font-bold"
                :style="{ backgroundColor: event.color + '15', color: event.color, border: '1px solid ' + event.color + '30' }">
            {{ event.event_category }}
          </span>
          <span v-if="isOwner && isPublished" class="inline-block py-1 px-3 rounded-full text-xs font-bold bg-green-100 text-green-600 mt-1 ml-1">
            <i class="fas fa-check mr-1"></i>Objavljen
          </span>
          <span v-if="isOwner && !isPublished" class="inline-block py-1 px-3 rounded-full text-xs font-bold bg-yellow-100 text-yellow-600 mt-1 ml-1">
            <i class="fas fa-eye-slash mr-1"></i>Neobjavljen
          </span>
        </div>
      </div>
      <div class="flex justify-end items-center mt-3 pt-2 border-t border-gray-100">
        <span class="text-gray-400 text-xs italic mr-2">
          <i class="fas fa-info-circle mr-1"></i>
          Zadnja sprememba: {{ formatDateTime(event.modified) }}<span v-if="event.owner"> - {{ event.owner }}</span> - {{ event.name }}
        </span>
        <button type="button" class="bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded ml-1" @click="goToEvent" :title="event.name">
          <i class="fas fa-book-reader"></i>
        </button>
        <button v-if="isOwner" type="button" class="bg-blue-100 hover:bg-blue-200 text-blue-600 text-xs px-2 py-1 rounded ml-1" @click="router.push(`/event/${event.name}/edit`)" title="Uredi">
          <i class="fas fa-edit"></i>
        </button>
      </div>
    </div>
  </div>

  <!-- Compact Layout (for dashboard, narrow columns) -->
  <div v-else-if="layout === 'compact'" class="bg-white rounded-lg shadow-sm border-0 mb-2 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
    <div class="p-3">
      <div class="flex items-start gap-3">
        <div :style="{ width: '8px', height: '8px', background: event.color || '#ccc', borderRadius: '50%', marginTop: '6px' }" class="shrink-0"></div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h6 class="font-bold text-sm text-gray-800 cursor-pointer hover:text-blue-600 truncate" @click="goToEvent">{{ event.subject }}</h6>
            <span v-if="event.is_now" class="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded shrink-0">V teku</span>
          </div>
          <div class="text-gray-500 text-xs mt-1 space-y-0.5">
            <div v-if="event.starts_on">
              <i class="far fa-clock mr-1 text-blue-500"></i>
              {{ formatTime(event.starts_on) }}<span v-if="event.ends_on"> - {{ formatTime(event.ends_on) }}</span>
            </div>
            <div v-if="event.location" class="truncate">
              <i class="fas fa-map-signs mr-1 text-blue-500"></i>
              {{ event.location }} 
            </div>
          </div>
          <div class="flex items-center gap-2 mt-2 flex-wrap">
            <span v-if="event.event_category" 
                  class="py-0.5 px-2 rounded text-xs font-semibold"
                  :style="{ backgroundColor: event.color + '15', color: event.color }">
              {{ event.event_category }}
            </span>
           
            <span v-if="isOwner && isPublished" class="py-0.5 px-2 rounded text-xs font-semibold bg-green-100 text-green-600">
              <i class="fas fa-check mr-1"></i>
            </span>
            <span v-if="isOwner && !isPublished" class="py-0.5 px-2 rounded text-xs font-semibold bg-yellow-100 text-yellow-600">
              <i class="fas fa-eye-slash mr-1"></i>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>

   <!-- dashboard Layout (single-day events) to display on dashboard -->
  <div v-if="layout === 'dashboard'" class="bg-white rounded-lg shadow-sm border-1  border-gray-200 mb-3 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
    <div class="p-4">
      <div class="grid grid-cols-12 gap-2">
        <div class="col-span-6">
          <div class="flex items-center mb-1">
            <div class="mr-2" :style="{ width: '8px', height: '8px', background: event.color || '#ccc', borderRadius: '50%' }"></div>
            <h6 class="font-bold mb-0 text-gray-800 cursor-pointer hover:text-blue-600" @click="goToEvent" :title="event.name">{{ event.subject }}</h6>
          </div>
          <div class="mt-4 space-y-1">
            <div v-if="!isNow" class="text-gray-400 text-sm">
              {{ formatPrettyDate(event.starts_on) }}
            </div>
            <div v-if="event.starts_on" class="text-black-400 font-semibold text-md">
              
              <i class="far fa-clock mr-2 text-blue-400"></i>
              {{ formatTime(event.starts_on) }}<span v-if="event.ends_on"> - {{ formatTime(event.ends_on) }}</span>
            </div>
            
            <span v-if="isNow" class="inline-block px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full">V teku</span>
            <div v-if="event.location" class="text-gray-500 text-sm">
              <i class="fas fa-map-signs mr-2 text-blue-500"></i>
              {{ event.location }}
            </div>
          </div>
        </div>
<div class="col-span-1 text-right mt-2 md:mt-0">
          <span v-if="event.event_category" 
                class="inline-block py-1 px-3 rounded-full text-xs font-bold"
                :style="{ backgroundColor: event.color + '15', color: event.color, border: '1px solid ' + event.color + '30' }">
            {{ event.event_category }}
          </span>
          <span v-if="event.predvideno" class="inline-block py-1 px-3 rounded-full text-xs font-bold text-red-600 mt-1">
            <i class="fa fa-exclamation-triangle" aria-hidden="true"></i> Predvideno
          </span>
          <span v-if="isOwner && isPublished" class="inline-block py-1 px-3 rounded-full text-xs font-bold bg-green-100 text-green-600 mt-1 ml-1">
            <i class="fas fa-check mr-1"></i>Objavljen
          </span>
          <span v-if="isOwner && !isPublished" class="inline-block py-1 px-3 rounded-full text-xs font-bold bg-yellow-100 text-yellow-600 mt-1 ml-1">
            <i class="fas fa-eye-slash mr-1"></i>Neobjavljen
          </span>
        </div>
        <div class="col-span-12">
          <div v-if="isLongDescription && !showFullDescription" class="text-gray-500 text-sm break-words">
            {{ preview }}...
          </div>
          <button 
            v-if="isLongDescription" 
            class="text-blue-600 text-sm font-semibold cursor-pointer hover:underline bg-none border-none p-0"
            @click="toggleDescription"
          >
            {{ showFullDescription ? 'Skrij opis' : 'Prikaži celoten opis' }}
          </button>
          <div v-if="showFullDescription" class="mt-2 text-sm text-gray-500 border-l-2 pl-2 prose prose-sm max-w-none" v-html="rawDescription"></div>
          <div v-if="!isLongDescription && !showFullDescription" class="text-gray-500 text-sm break-words" v-html="rawDescription || 'Brez opisa.'"></div>
        </div>

        
      </div>

      <div class="flex justify-end items-center mt-2 pt-2 border-t border-gray-100">
        <span class="text-gray-400 text-xs italic mr-2 text-right">
          <i class="fas fa-info-circle mr-1" title="Zadnja sprememba"></i>
         {{ formatDateTime(event.modified) }}<br>{{ event.name }}
        </span>
        <button type="button" class="bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded ml-1" @click="goToEvent" :title="event.name">
          <i class="fas fa-book-reader"></i>
        </button>
        <button v-if="isOwner" type="button" class="bg-blue-100 hover:bg-blue-200 text-blue-600 text-xs px-2 py-1 rounded ml-1" @click="router.push(`/event/${event.name}/edit`)" title="Uredi">
          <i class="fas fa-edit"></i>
        </button>
      </div>
    </div>
  </div>
</template>
