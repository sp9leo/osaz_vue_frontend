<script setup>
import { computed } from 'vue'

const props = defineProps({
  groupedEvents: {
    type: Array,
    default: () => [],
  },
  monthCounts: {
    type: Object,
    default: () => ({}),
  },
})

const monthNames = {
  '01': 'Januar', '02': 'Februar', '03': 'Marec', '04': 'April',
  '05': 'Maj', '06': 'Junij', '07': 'Julij', '08': 'Avgust',
  '09': 'September', '10': 'Oktober', '11': 'November', '12': 'December',
}

const uniqueMonths = computed(() => {
  const months = []
  for (const group of props.groupedEvents) {
    const key = group.month_key
    if (!months.find((m) => m.key === key)) {
      months.push({
        key,
        name: monthNames[group.month_num] || group.month_num,
        year: group.year,
        count: props.monthCounts[key] || 0,
      })
    }
  }
  return months
})

const scrollToMonth = (key) => {
  const el = document.getElementById(`month-${key}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
</script>

<template>
  <div class="sticky top-5 max-h-[calc(100vh-40px)] overflow-y-auto pr-2">
    <div class="text-xs uppercase text-gray-500 mb-3 font-bold tracking-wider">Meseci</div>
    <a
      v-for="month in uniqueMonths"
      :key="month.key"
      href="#"
      class="block py-2.5 px-3 text-gray-600 border-l-2 border-gray-100 text-sm font-semibold transition-all no-underline mb-1 hover:text-blue-600 hover:border-l-blue-500 hover:bg-gray-50 rounded-r"
      @click.prevent="scrollToMonth(month.key)"
    >
      {{ month.name }} <span class="text-xs opacity-50">{{ month.year }}</span>
    </a>
  </div>
</template>
