<script setup>
import { ref, watch } from 'vue'
import { updateObvestilo } from '@/modules/calendar/api/obvestila'

const props = defineProps({
  obvestilo: {
    type: Object,
    required: true,
  },
  show: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close', 'saved'])

const loading = ref(false)
const error = ref(null)

const form = ref({
  title: '',
  content: '',
  zacetek: '',
  custom_velja_do: '',
  important: false,
  public: true,
})

watch(() => props.obvestilo, (newVal) => {
  if (newVal) {
    console.log('Editing obvestilo:', newVal)
    form.value = {
      title: newVal.title || '',
      content: newVal.content || '',
      zacetek: newVal.zacetek ? String(newVal.zacetek).split(' ')[0] : '',
      custom_velja_do: newVal.custom_velja_do ? String(newVal.custom_velja_do).split(' ')[0] : '',
      important: newVal.important === 1 || newVal.important === true,
      public: newVal.public !== 0 && newVal.public !== false,
    }
  }
}, { immediate: true })

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
      custom_velja_do: form.value.custom_velja_do ? form.value.custom_velja_do + ' 00:00:00' : null,
      important: form.value.important ? 1 : 0,
      'public': form.value.public ? 1 : 0,
    }
    
    await updateObvestilo(props.obvestilo.name, obvestiloData)
    emit('saved')
    emit('close')
  } catch (e) {
    error.value = 'Napaka pri shranjevanju: ' + (e.message || 'Neznana napaka')
  } finally {
    loading.value = false
  }
}

const handleClose = () => {
  error.value = null
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-black bg-opacity-50" @click="handleClose"></div>
      
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-auto relative z-10">
        <div class="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 class="text-lg font-bold text-gray-800">Uredi obvestilo</h3>
          <button @click="handleClose" class="text-gray-400 hover:text-gray-600">
            <i class="fas fa-times text-lg"></i>
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="p-4">
          <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-4 text-sm">
            {{ error }}
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Naslov <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.title"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Začetek
                </label>
                <input
                  v-model="form.zacetek"
                  type="date"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Velja do
                </label>
                <input
                  v-model="form.custom_velja_do"
                  type="date"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              ></textarea>
            </div>

            <div class="flex items-center gap-4">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  v-model="form.important"
                  type="checkbox"
                  class="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span class="text-sm text-gray-700">Pomembno</span>
              </label>

              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  v-model="form.public"
                  type="checkbox"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span class="text-sm text-gray-700">Javno</span>
              </label>
            </div>
          </div>

          <div class="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
            <button
              type="button"
              class="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm"
              @click="handleClose"
            >
              Prekliči
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm"
              :disabled="loading"
            >
              <span v-if="loading" class="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-1"></span>
              Shrani
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
