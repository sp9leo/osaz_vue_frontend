<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const temperature = ref('--')
const humidity = ref('--')

const ECOWITT_API_KEY = '9693dc26-aea5-43f8-b18d-d68af63f70a5'
const ECOWITT_MAC = 'F0:08:D1:07:38:ED'
const ECOWITT_APP_KEY = 'A5AA1BADD3484FF58017905F740217CF'

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
  </div>
</template>
