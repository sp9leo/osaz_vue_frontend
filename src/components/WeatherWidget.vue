<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const temperature = ref('--')
const humidity = ref('--')
const forecast = ref([])

const ECOWITT_API_KEY = '9693dc26-aea5-43f8-b18d-d68af63f70a5'
const ECOWITT_MAC = 'F0:08:D1:07:38:ED'
const ECOWITT_APP_KEY = 'A5AA1BADD3484FF58017905F740217CF'

const FORECAST_LAT = 45.5676
const FORECAST_LON = 14.2457

const WMO_LABELS = {
  0: 'Jasno',
  1: 'Pretežno jasno',
  2: 'Delno oblačno',
  3: 'Oblačno',
  45: 'Megla',
  48: 'Rosenica',
  51: 'Rahla rosa',
  53: 'Rosa',
  55: 'Močna rosa',
  56: 'Ledena rosa',
  57: 'Močna ledena rosa',
  61: 'Rahel dež',
  63: 'Dež',
  65: 'Močan dež',
  66: 'Dež s ledom',
  67: 'Močan dež s ledom',
  71: 'Rahel sneg',
  73: 'Sneg',
  75: 'Močan sneg',
  77: 'Snežna zrna',
  80: 'Krajše plohe',
  81: 'Plohe',
  82: 'Močne plohe',
  85: 'Snežne plohe',
  86: 'Močne snežne plohe',
  95: 'Neva',
  96: 'Neva z točo',
  99: 'Močna neva s točo'
}

const weatherIcon = (code) => {
  if (code === 0) return 'fa-sun'
  if (code <= 2) return 'fa-cloud-sun'
  if (code === 3) return 'fa-cloud'
  if (code === 45 || code === 48) return 'fa-smog'
  if (code >= 95) return 'fa-cloud-bolt'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'fa-snowflake'
  return 'fa-cloud-rain'
}

const weatherLabel = (code) => WMO_LABELS[code] || ''

const weatherColor = (code) => {
  if (code === 0) return 'text-amber-400'
  if (code <= 2) return 'text-amber-300'
  if (code === 3) return 'text-gray-400'
  if (code === 45 || code === 48) return 'text-gray-500'
  if (code >= 95) return 'text-purple-500'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'text-cyan-300'
  return 'text-blue-400'
}

const fetchForecast = async () => {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${FORECAST_LAT}&longitude=${FORECAST_LON}` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=3`
    const response = await fetch(url)
    const json = await response.json()
    if (json.error) throw new Error(json.reason)
    forecast.value = json.daily.time.map((date, i) => ({
      date,
      day: new Date(date + 'T00:00:00').toLocaleDateString('sl-SI', { weekday: 'short' }),
      code: json.daily.weather_code[i],
      max: Math.round(json.daily.temperature_2m_max[i]),
      min: Math.round(json.daily.temperature_2m_min[i]),
      precip: json.daily.precipitation_probability_max[i]
    }))
  } catch (e) {
    console.error('Forecast Error:', e)
  }
}

const fetchWeather = async () => {
  try {
    const url = `https://api.ecowitt.net/api/v3/device/real_time?api_key=${ECOWITT_API_KEY}&mac=${ECOWITT_MAC}&call_back=all&application_key=${ECOWITT_APP_KEY}`
    const response = await fetch(url)
    const json = await response.json()
    if (json.code === 0) {
      const d = json.data
      temperature.value = ((d.outdoor.temperature.value - 32) * 5 / 9).toFixed(1) + ' °C'
      humidity.value = d.outdoor.humidity.value + ' %'
    }
  } catch (e) {
    console.error('Weather Error:', e)
  }
}

let interval = null

onMounted(() => {
  fetchWeather()
  fetchForecast()
  interval = setInterval(fetchWeather, 60000)
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
})
</script>

<template>
  <div class="weather-mini-card">
    <div class="flex gap-3">
      <div class="flex flex-col gap-1">
        <span class="d-label">Datum</span>
        <span class="d-value">{{ new Date().toLocaleDateString('sl-SI') }}</span>
      </div>
      <div class="flex flex-col gap-1">
        <span class="d-label">Čas</span>
        <span id="live-clock" class="d-value">{{ new Date().toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' }) }}</span>
      </div>
    </div>
    <div class="flex flex-col gap-1">
      <span class="w-label font-bold flex items-center gap-1">
        <i class="fas fa-satellite-dish mr-1"></i>Vremenska Postaja
      </span>
      <div class="w-stat">
        <i class="fas fa-thermometer-half text-sm"></i>
        <span id="js-temp" class="w-value">{{ temperature }}</span>
      </div>
      <div class="w-stat">
        <i class="fas fa-tint text-xs text-blue-300"></i>
        <span id="js-hum" class="w-value">{{ humidity }}</span>
      </div>
    </div>
    <div v-if="forecast.length" class="flex flex-col gap-1 border-l border-gray-200 pl-5">
      <span class="w-label font-bold flex items-center gap-1">
        <i class="fas fa-calendar-days mr-1"></i>Napoved
      </span>
      <div class="flex gap-4">
        <div v-for="day in forecast" :key="day.date" class="flex flex-col items-center gap-0.5">
          <span class="d-label">{{ day.day }}</span>
          <i class="fas" :class="[weatherIcon(day.code), weatherColor(day.code), 'text-sm']" :title="weatherLabel(day.code)"></i>
          <span class="w-value px-0 text-center whitespace-nowrap">
            <span class="text-gray-400">{{ day.min }}°</span>&nbsp;{{ day.max }}°
          </span>
          <span class="d-label flex items-center gap-0.5 text-blue-400">
            <i class="fas fa-tint text-[7px]"></i>{{ day.precip }}%
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
