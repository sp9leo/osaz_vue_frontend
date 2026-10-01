<script setup>
import { ref, computed, onMounted } from 'vue'
import { derivePin, randomSalt, invalidateQuickEntryUsers } from '@/api/quickEntry'
import { getQuickEntryUsers, updateQuickEntryUser } from '@/modules/admin/api/hitrivpis'

const PIN_LENGTH = 8

const users = ref([])
const loading = ref(true)
const saving = ref(false)
const error = ref(null)
const notice = ref(null)
const selected = ref(null)
const pin = ref('')
const showPin = ref(null)

const siteSalt = computed(() => users.value.find((user) => user.sol)?.sol || '')
const pending = computed(() => users.value.filter((user) => !user.pin_hash).length)
const canSave = computed(() => !saving.value && !!selected.value && /^\d{8}$/.test(pin.value))

const label = (user) => user.display || user.priimek_ime || user.name

const loadUsers = async () => {
  loading.value = true
  error.value = null
  try {
    users.value = await getQuickEntryUsers()
  } catch (e) {
    error.value = 'Napaka pri nalaganju uporabnikov: ' + (e.message || 'Neznana napaka')
  } finally {
    loading.value = false
  }
}

const randomPin = () => {
  const values = new Uint32Array(PIN_LENGTH)
  crypto.getRandomValues(values)
  pin.value = Array.from(values, (v) => v % 10).join('')
}

const select = (user) => {
  selected.value = user
  pin.value = ''
  showPin.value = null
  error.value = null
  notice.value = null
}

const save = async () => {
  if (!canSave.value) return
  error.value = null
  notice.value = null

  saving.value = true
  try {
    const salt = siteSalt.value || randomSalt()
    const hash = await derivePin(pin.value, salt)
    const duplicate = users.value.find((user) => user.pin_hash === hash && user.name !== selected.value.name)
    if (duplicate) {
      error.value = `Ta PIN je že uporabljen pri uporabniku ${label(duplicate)}.`
      return
    }

    await updateQuickEntryUser(selected.value.name, { pin_hash: hash, sol: salt })
    invalidateQuickEntryUsers()
    const assigned = pin.value
    const name = label(selected.value)
    pin.value = ''
    showPin.value = assigned
    flash(`PIN za ${name} je nastavljen.`)
    await loadUsers()
  } catch (e) {
    const status = e.response?.status
    error.value = status === 401 || status === 403
      ? 'Frappe zavrnil zapis. Prijavite se kot Administrator ali System Manager in osvežite stran.'
      : 'Napaka: ' + (e.message || 'Neznana napaka')
  } finally {
    saving.value = false
  }
}

let flashTimer = null
const flash = (text) => {
  notice.value = text
  if (flashTimer) clearTimeout(flashTimer)
  flashTimer = setTimeout(() => {
    notice.value = null
  }, 6000)
}

onMounted(loadUsers)
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <div class="max-w-3xl mx-auto">
      <div class="flex items-center gap-2 mb-1">
        <i class="fas fa-key text-green-500"></i>
        <h2 class="text-xl font-bold text-gray-800">Hitri vpis - PIN-i</h2>
      </div>
      <p class="text-sm text-gray-500 mb-4">
        Uporabnike dodajate in urejate v Frappe (DocType <span class="font-mono">HitriVpis</span>); tukaj
        nastavljate le PIN-e. PIN je {{ PIN_LENGTH }} števk in se v bazi ne shranjuje - shrani se le
        njegova PBKDF2 zgoščena vrednost.
      </p>

      <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
        {{ error }}
      </div>
      <div v-if="notice" class="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-4 text-sm">
        {{ notice }}
      </div>

      <!-- PIN form -->
      <div class="bg-white rounded-lg shadow-sm p-4 mb-4">
        <h3 class="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">
          {{ selected ? 'Nastavi PIN - ' + label(selected) : 'Nastavi PIN' }}
        </h3>

        <form class="space-y-3" @submit.prevent="save">
          <p v-if="!selected" class="text-sm text-gray-400">
            Izberite uporabnika v seznamu spodaj.
          </p>

          <div v-if="selected">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              PIN <span class="text-red-500">*</span>
            </label>
            <div class="flex gap-2">
              <input
                v-model="pin"
                type="text"
                :maxlength="PIN_LENGTH"
                inputmode="numeric"
                class="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm tracking-widest"
                :placeholder="'•'.repeat(PIN_LENGTH)"
              />
              <button
                type="button"
                class="px-3 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                @click="randomPin"
              >
                <i class="fas fa-dice mr-1"></i>Generiraj
              </button>
            </div>
            <p v-if="showPin" class="mt-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
              Novi PIN: <span class="font-bold tracking-widest">{{ showPin }}</span>
              <span class="text-xs text-gray-500">- zapišite si ga, pozneje ni več viden</span>
            </p>
          </div>

          <div class="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              v-if="selected"
              type="button"
              class="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              @click="select(null)"
            >
              Prekliči
            </button>
            <button
              type="submit"
              class="px-4 py-2 text-sm text-white rounded-lg transition-colors disabled:opacity-50 bg-green-600 hover:bg-green-700"
              :disabled="!canSave"
            >
              <span v-if="saving" class="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-1"></span>
              Shrani PIN
            </button>
          </div>
        </form>
      </div>

      <!-- User list -->
      <div class="bg-white rounded-lg shadow-sm overflow-hidden">
        <div class="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
          <h3 class="text-sm font-bold text-gray-700 uppercase tracking-wide">Seznam uporabnikov</h3>
          <span class="text-xs text-gray-400">
            {{ users.length }} uporabnikov<span v-if="pending"> - {{ pending }} brez PIN-a</span>
          </span>
        </div>

        <div v-if="loading" class="flex justify-center py-8">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
        </div>

        <p v-else-if="users.length === 0" class="text-center text-gray-400 py-8 text-sm">
          Ni še nobenega uporabnika. Dodajte jih v Frappe v DocType HitriVpis.
        </p>

        <ul v-else class="divide-y divide-gray-100">
          <li
            v-for="user in users"
            :key="user.name"
            class="px-4 py-3 flex flex-wrap items-center gap-3 hover:bg-gray-50"
            :class="selected && selected.name === user.name ? 'bg-green-50' : ''"
          >
            <div class="flex-1 min-w-[160px]">
              <div class="font-semibold text-gray-800 text-sm">{{ label(user) }}</div>
              <div class="text-xs text-gray-400">
                <span v-if="user.priimek_ime" class="font-mono">{{ user.priimek_ime }}</span>
                <span v-if="user.priimek_ime && user.user"> - </span>
                <span v-if="user.user">{{ user.user }}</span>
                <span v-if="!user.priimek_ime && !user.user">{{ user.name }}</span>
              </div>
              <div class="text-xs text-gray-400">
                <i class="fas fa-key mr-1"></i>{{ user.pin_hash ? 'PIN nastavljen' : 'PIN ni nastavljen' }}
              </div>
            </div>

            <span
              class="text-xs font-semibold px-2 py-0.5 rounded-full"
              :class="user.aktivna ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
            >{{ user.aktivna ? 'Aktivna' : 'Neaktivna' }}</span>

            <div class="flex items-center gap-3 text-xs">
              <button class="text-blue-600 hover:text-blue-800" @click="select(user)">
                <i class="fas fa-redo mr-1"></i>{{ user.pin_hash ? 'Ponastavi PIN' : 'Nastavi PIN' }}
              </button>
            </div>
          </li>
        </ul>
      </div>

      <p class="text-xs text-gray-400 mt-4">
        <i class="fas fa-circle-info mr-1"></i>
        Zgoščene vrednosti PIN-ov so berljive vsakomur, ki odpre razvijalska orodja v brskalniku, zato je
        zgoščevanje PBKDF2 počasno. PIN naj bo zasebni.
      </p>
    </div>
  </div>
</template>