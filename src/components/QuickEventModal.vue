<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { createEvent, getUsedEventCategories } from '@/modules/calendar/api/events'
import { signIn, signOut, getSession, authorName, PIN_LENGTH } from '@/api/quickEntry'
import { verifyPin } from '@/modules/admin/api/hitrivpis'

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close', 'saved'])

const REVEAL_DELAY = 1000
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back']

const pin = ref('')
const step = ref('pin')
const pinError = ref(null)
const checking = ref(false)
const user = ref(null)
const categories = ref([])
const saving = ref(false)
const error = ref(null)
const savedEvent = ref(null)
const revealLast = ref(false)

const author = computed(() => authorName(user.value))

const digits = computed(() =>
  Array.from({ length: PIN_LENGTH }, (_, i) => {
    const char = pin.value[i]
    if (!char) return '•'
    return revealLast.value && i === pin.value.length - 1 ? char : '•'
  })
)

let revealTimer = null
const flashLast = () => {
  if (revealTimer) clearTimeout(revealTimer)
  revealLast.value = true
  revealTimer = setTimeout(() => {
    revealLast.value = false
  }, REVEAL_DELAY)
}

const clearPin = () => {
  pin.value = ''
  revealLast.value = false
  if (revealTimer) clearTimeout(revealTimer)
}

const emptyForm = () => {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const localNow = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
  return {
    subject: '',
    starts_on: localNow,
    ends_on: localNow,
    description: '',
    event_category: '',
    location: '',
    predvideno: false,
    status: 'Open',
    published: true,
  }
}

const form = ref(emptyForm())

const fetchCategories = async () => {
  try {
    categories.value = await getUsedEventCategories()
  } catch (e) {
    console.error('Error fetching categories:', e)
  }
}

const submitPin = async () => {
  pinError.value = null

  if (pin.value.length !== PIN_LENGTH) {
    pinError.value = `Vnesite ${PIN_LENGTH}-mestni PIN`
    return
  }

  try {
    checking.value = true
    const result = await verifyPin(pin.value)
    if (result.ok) {
      signIn(result.user)
      user.value = result.user
      step.value = 'form'
      clearPin()
      if (!categories.value.length) fetchCategories()
    } else if (result.retry) {
      pinError.value = 'Preveč poskusov. Počakajte minuto in poskusite znova.'
      clearPin()
    } else {
      pinError.value = 'Napačen PIN'
      clearPin()
    }
  } catch (e) {
    pinError.value = 'Preverjanje PIN ni uspelo: ' + (e.message || 'Neznana napaka')
    clearPin()
  } finally {
    checking.value = false
  }
}

const switchUser = () => {
  signOut()
  user.value = null
  step.value = 'pin'
  clearPin()
  pinError.value = null
  error.value = null
  form.value = emptyForm()
}

const pressKey = (key) => {
  if (key === 'back') {
    pin.value = pin.value.slice(0, -1)
  } else if (key === 'clear') {
    clearPin()
    return
  } else if (pin.value.length < PIN_LENGTH) {
    pin.value += key
    if (pin.value.length === PIN_LENGTH) {
      revealLast.value = true
      submitPin()
      return
    }
  }
  flashLast()
}

const onKeydown = (e) => {
  if (!props.show || step.value !== 'pin') return

  if (/^[0-9]$/.test(e.key)) {
    pressKey(e.key)
    e.preventDefault()
  } else if (e.key === 'Backspace') {
    pressKey('back')
    e.preventDefault()
  } else if (e.key === 'Delete') {
    pressKey('clear')
    e.preventDefault()
  } else if (e.key === 'Enter') {
    submitPin()
    e.preventDefault()
  } else if (e.key === 'Escape') {
    handleClose()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  if (revealTimer) clearTimeout(revealTimer)
})

const handleSubmit = async () => {
  if (!form.value.subject || !form.value.starts_on) {
    error.value = 'Prosim, izpolnite obvezna polja (naslov in začetek)'
    return
  }

  try {
    saving.value = true
    error.value = null

    const eventData = {
      subject: form.value.subject,
      starts_on: form.value.starts_on.replace('T', ' '),
      ends_on: (form.value.ends_on || form.value.starts_on).replace('T', ' '),
      description: form.value.description,
      event_category: form.value.event_category,
      location: form.value.location,
      custom_added_by: author.value,
      predvideno: form.value.predvideno ? 1 : 0,
      status: form.value.status,
      published: form.value.published ? 1 : 0,
    }

    const result = await createEvent(eventData)
    savedEvent.value = result.data
    emit('saved', result.data)
  } catch (e) {
    error.value = 'Napaka pri shranjevanju dogodka: ' + (e.message || 'Neznana napaka')
    console.error('Error creating event:', e)
  } finally {
    saving.value = false
  }
}

const addAnother = () => {
  form.value = emptyForm()
  savedEvent.value = null
  error.value = null
}

const handleClose = () => {
  pinError.value = null
  error.value = null
  savedEvent.value = null
  clearPin()
  form.value = emptyForm()
  emit('close')
}

watch(() => props.show, (isOpen) => {
  if (isOpen) {
    // The tab stays signed in once a PIN has been entered, so reopening the
    // modal does not ask again.
    const session = getSession()
    if (session) {
      user.value = session
      step.value = 'form'
      if (!categories.value.length) fetchCategories()
    } else {
      step.value = 'pin'
    }
  } else {
    pinError.value = null
    error.value = null
    savedEvent.value = null
    clearPin()
    form.value = emptyForm()
  }
})
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-black bg-opacity-50" @click="handleClose"></div>

      <div class="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-auto relative z-10">
        <div class="p-4 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h3 class="text-lg font-bold text-gray-800 flex items-center gap-2">
              <i class="fas fa-bolt text-green-500"></i>
              Hitri vpis dogodka
            </h3>
            <p v-if="author" class="text-xs text-gray-500 mt-0.5">
              Prijavljen kot: <span class="font-semibold text-gray-700">{{ author }}</span>
            </p>
          </div>
          <button v-if="author" @click="switchUser" class="text-xs text-blue-600 hover:text-blue-800 mr-2">
            <i class="fas fa-right-left mr-1"></i>Menjaj uporabnika
          </button>
          <button @click="handleClose" class="text-gray-400 hover:text-gray-600">
            <i class="fas fa-times text-lg"></i>
          </button>
        </div>

        <div v-if="step === 'pin'" class="p-4">
          <p class="text-sm text-gray-600 text-center mb-3">
            Za prijavo vnesite {{ PIN_LENGTH }}-mestni PIN
          </p>

          <div class="flex justify-center gap-1.5 mb-3">
            <span
              v-for="(d, i) in digits"
              :key="i"
              class="w-7 h-11 border rounded-lg flex items-center justify-center text-lg font-bold"
              :class="i < pin.length ? 'border-green-500 text-green-600' : 'border-gray-300 text-gray-300'"
            >{{ d }}</span>
          </div>

          <p v-if="pinError" class="text-sm text-red-600 text-center mb-3">
            <i class="fas fa-circle-exclamation mr-1"></i>{{ pinError }}
          </p>

          <div class="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
            <button
              v-for="key in KEYS"
              :key="key"
              type="button"
              class="h-12 rounded-lg border border-gray-200 text-lg font-semibold transition-colors"
              :class="key === 'clear' || key === 'back'
                ? 'text-gray-500 bg-gray-100 hover:bg-gray-200'
                : 'text-gray-800 hover:bg-gray-50'"
              :disabled="checking"
              @click="pressKey(key)"
            >
              <span v-if="key === 'clear'" class="text-xs font-semibold">Počisti</span>
              <span v-else-if="key === 'back'" class="text-lg leading-none">&#9003;</span>
              <span v-else>{{ key }}</span>
            </button>
          </div>

          <p class="text-[10px] text-gray-400 text-center mt-2">
            Tip: PIN lahko vnesete s tipkovnico (Backspace briše, Enter potrdi)
          </p>

          <div class="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
            <button
              type="button"
              class="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm"
              @click="handleClose"
            >
              Prekliči
            </button>
            <button
              type="button"
              class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm"
              :disabled="checking"
              @click="submitPin"
            >
              <span v-if="checking" class="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-1"></span>
              Prijava
            </button>
          </div>
        </div>

        <form v-else-if="!savedEvent" @submit.prevent="handleSubmit" class="p-4">
          <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-4 text-sm">
            {{ error }}
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Naslov dogodka <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.subject"
                type="text"
                required
                autofocus
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                placeholder="Vnesite naslov dogodka"
              />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Začetek <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="form.starts_on"
                  type="datetime-local"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Konec</label>
                <input
                  v-model="form.ends_on"
                  type="datetime-local"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Kategorija</label>
              <select
                v-model="form.event_category"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              >
                <option value="">Izberite kategorijo</option>
                <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
              </select>
              <p v-if="!categories.length" class="text-[10px] text-gray-400 mt-1">
                Kategorije se izpišejo iz obstoječih dogodkov; zdaj še ni nobene.
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Lokacija</label>
              <input
                v-model="form.location"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                placeholder="Vnesite lokacijo"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Opis</label>
              <textarea
                v-model="form.description"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                placeholder="Vnesite opis dogodka"
              ></textarea>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Dodal</label>
              <input
                :value="author"
                type="text"
                readonly
                class="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 text-sm"
              />
            </div>

            <div class="flex items-center gap-4">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  v-model="form.published"
                  type="checkbox"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span class="text-sm text-gray-700">Objavljen</span>
              </label>

              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  v-model="form.predvideno"
                  type="checkbox"
                  class="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <span class="text-sm text-gray-700">Predvideno</span>
              </label>
            </div>
          </div>

          <div class="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
            <button
              type="button"
              class="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm"
              @click="handleClose"
            >
              Zapri
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm"
              :disabled="saving"
            >
              <span v-if="saving" class="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-1"></span>
              Shrani dogodek
            </button>
          </div>
        </form>

        <div v-else class="p-4 text-center">
          <i class="fas fa-circle-check text-4xl text-green-500 mb-3"></i>
          <p class="text-sm text-gray-700 mb-1">Dogodek je shranjen.</p>
          <p class="text-sm font-semibold text-gray-800">{{ savedEvent.subject }}</p>
          <p class="text-xs text-gray-400 mt-1">{{ savedEvent.name }}</p>

          <div class="flex justify-center gap-2 mt-4 pt-3 border-t border-gray-100">
            <button
              type="button"
              class="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm"
              @click="addAnother"
            >
              Vnesi še enega
            </button>
            <RouterLink
              :to="`/event/${savedEvent.name}`"
              class="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-sm"
            >
              Odpri dogodek
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
