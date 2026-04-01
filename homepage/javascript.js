function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    //const timeString = `${hours}:${minutes}:${seconds}`;
    const timeString = `${hours}:${minutes}`;
    
    // Posodobi vse elemente z ID-jem live-clock (če jih je več)
    const clockElements = document.querySelectorAll('#live-clock');
    clockElements.forEach(el => el.textContent = timeString);
}

// Zaženi uro takoj in nato vsako sekundo
setInterval(updateClock, 1000);
updateClock();

(function () {
        async function updateWeather() {
            const url = "https://api.ecowitt.net/api/v3/device/real_time?api_key=9693dc26-aea5-43f8-b18d-d68af63f70a5&mac=F0:08:D1:07:38:ED&call_back=all&application_key=A5AA1BADD3484FF58017905F740217CF";
            try {
                const response = await fetch(url);
                const json = await response.json();
                if (json.code === 0) {
                    const d = json.data;
                    const tempC = ((d.outdoor.temperature.value - 32) * 5 / 9).toFixed(1);

                    // Use document.querySelector to ensure we catch the elements even if inside specific divs
                    const tEl = document.getElementById("js-temp");
                    const hEl = document.getElementById("js-hum");

                    if (tEl) tEl.innerText = tempC + " °C";
                    if (hEl) hEl.innerText = d.outdoor.humidity.value + " %";
                }
            } catch (e) {console.error("Weather Macro Error:", e);}
        }

        // Run once immediately
        if (document.readyState === 'complete') {
            updateWeather();
        } else {
            window.addEventListener('load', updateWeather);
        }

        // Refresh every minute
        setInterval(updateWeather, 60000);
    })();