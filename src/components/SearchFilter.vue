<script setup>
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const props = defineProps({
  categories: {
    type: Array,
    default: () => [],
  },
})

const router = useRouter()
const route = useRoute()

const searchQuery = ref(route.query.q || '')
const selectedCategory = ref(route.query.category || '')

const updateRoute = () => {
  const query = {}
  if (searchQuery.value) {
    query.q = searchQuery.value
  }
  if (selectedCategory.value) {
    query.category = selectedCategory.value
  }
  router.push({ query })
}

watch(searchQuery, updateRoute)
watch(selectedCategory, updateRoute)
</script>

<template>
  <div class="bg-white rounded-lg shadow-sm mb-5 p-3">
    <form class="flex items-center gap-2">
      <div class="flex-1">
        <input
          v-model="searchQuery"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Išči po dogodkih..."
        />
      </div>
      <div class="w-48">
        <select v-model="selectedCategory" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          <option value="">Vse kategorije</option>
          <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
        </select>
      </div>
      <div class="flex gap-1">
        <button type="button" class="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg" @click="searchQuery = ''; selectedCategory = ''" title="Počisti filtre">
          <i class="fas fa-sync"></i>
        </button>
      </div>
    </form>
  </div>
</template>
