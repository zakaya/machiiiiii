
const $ = (id) => document.getElementById(id);

const state = {
  unit: "C",
  location: {
    name: "Mardan",
    country: "Pakistan",
    latitude: 34.1989,
    longitude: 72.0401
  },
  weather: null
};

const weatherCodes = {
  0: ["Clear sky", "☀️"],
  1: ["Mainly clear", "🌤️"],
  2: ["Partly cloudy", "⛅"],
  3: ["Overcast", "☁️"],
  45: ["Foggy", "🌫️"],
  48: ["Foggy", "🌫️"],
  51: ["Light drizzle", "🌦️"],
  53: ["Drizzle", "🌦️"],
  55: ["Heavy drizzle", "🌧️"],
  61: ["Light rain", "🌦️"],
  63: ["Rain", "🌧️"],
  65: ["Heavy rain", "🌧️"],
  71: ["Light snow", "🌨️"],
  73: ["Snow", "🌨️"],
  75: ["Heavy snow", "❄️"],
  80: ["Rain showers", "🌦️"],
  81: ["Rain showers", "🌧️"],
  82: ["Heavy showers", "⛈️"],
  85: ["Snow showers", "🌨️"],
  86: ["Heavy snow showers", "❄️"],
  95: ["Thunderstorm", "⛈️"],
  96: ["Thunderstorm with hail", "⛈️"],
  99: ["Severe thunderstorm", "⛈️"]
};

function getCondition(code) {
  return weatherCodes[code] || ["Unknown conditions", "🌡️"];
}

function toDisplayTemp(celsius) {
  if (state.unit === "F") {
    return Math.round(celsius * 9 / 5 + 32);
  }
  return Math.round(celsius);
}

function temperature(celsius) {
  return `${toDisplayTemp(celsius)}°`;
}

function windSpeed(kmh) {
  if (state.unit === "F") {
    return `${Math.round(kmh * 0.621371)} mph`;
  }
  return `${Math.round(kmh)} km/h`;
}

function setStatus(message, error = false) {
  $("status").textContent = message;
  $("status").classList.toggle("error", error);
}

function displayDate() {
  $("date").textContent = new Date().toLocaleDateString(
    undefined,
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    }
  );
}

function displayTime(dateString) {
  if (!dateString) return "--:--";

  return new Date(dateString).toLocaleTimeString(
    undefined,
    {
      hour: "numeric",
      minute: "2-digit"
    }
  );
}

function shortTime(dateString) {
  return new Date(dateString).toLocaleTimeString(
    undefined,
    { hour: "numeric" }
  );
}

// Search for a city using the Open-Meteo geocoding API.
async function searchCity(city) {
  const url =
    "https://geocoding-api.open-meteo.com/v1/search" +
    `?name=${encodeURIComponent(city)}` +
    "&count=1&language=en&format=json";

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("City search failed. Please try again.");
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error("City not found. Check the spelling.");
  }

  const place = data.results[0];

  return {
    name: place.name,
    country: place.country || "",
    admin: place.admin1 || "",
    latitude: place.latitude,
    longitude: place.longitude
  };
}

// Fetch current, hourly and daily weather.
async function fetchWeather(location) {
  const params = new URLSearchParams({
    latitude: location.latitude,
    longitude: location.longitude,

    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "is_day",
      "precipitation",
      "weather_code",
      "wind_speed_10m"
    ].join(","),

    hourly: [
      "temperature_2m",
      "relative_humidity_2m",
      "precipitation_probability",
      "weather_code",
      "wind_speed_10m"
    ].join(","),

    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "sunrise",
      "sunset",
      "uv_index_max",
      "precipitation_probability_max"
    ].join(","),

    timezone: "auto",
    forecast_days: "6"
  });

  const url =
    `https://api.open-meteo.com/v1/forecast?${params}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Weather service is unavailable.");
  }

  return await response.json();
}

// Load a selected location.
async function loadWeather(location) {
  setStatus("Fetching live weather data...");

  try {
    const data = await fetchWeather(location);

    state.location = location;
    state.weather = data;

    renderWeather();

    setStatus(
      `Weather updated for ${location.name}` +
      (location.country ? `, ${location.country}` : "") +
      "."
    );
  } catch (error) {
    setStatus(
      error.message || "Unable to load weather.",
      true
    );
  }
}

// Display current weather and highlights.
function renderWeather() {
  if (!state.weather) return;

  const data = state.weather;
  const current = data.current;
  const daily = data.daily;

  const [description, icon] =
    getCondition(current.weather_code);

  $("cityName").textContent = [
    state.location.name,
    state.location.admin || state.location.country
  ].filter(Boolean).join(", ");

  $("condition").textContent = description;
  $("weatherIcon").textContent = icon;

  $("temperature").textContent =
    `${temperature(current.temperature_2m)}${state.unit}`;

  $("highLow").textContent =
    `H: ${temperature(daily.temperature_2m_max[0])} / ` +
    `L: ${temperature(daily.temperature_2m_min[0])}`;

  $("feelsLike").textContent =
    `Feels like ${temperature(current.apparent_temperature)}`;

  $("humidity").textContent =
    `${current.relative_humidity_2m}%`;

  $("wind").textContent =
    windSpeed(current.wind_speed_10m);

  const uv = daily.uv_index_max[0] ?? 0;

  $("uv").textContent = uv.toFixed(1);
  $("uvBig").textContent = uv.toFixed(1);

  $("uvAdvice").textContent =
    uv < 3 ? "Low UV exposure" :
    uv < 6 ? "Moderate UV exposure" :
    uv < 8 ? "High UV exposure" :
    uv < 11 ? "Very high UV exposure" :
    "Extreme UV exposure";

  $("uvBar").style.width =
    `${Math.min(100, uv / 11 * 100)}%`;

  $("sunrise").textContent =
    displayTime(daily.sunrise[0]);

  $("sunset").textContent =
    displayTime(daily.sunset[0]);

  $("feelsBig").textContent =
    temperature(current.apparent_temperature);

  // Show the current hour's precipitation probability.
  const hourIndex = findCurrentHour(data.hourly.time);
  const rain =
    data.hourly.precipitation_probability?.[hourIndex];

  $("rain").textContent =
    rain == null ? "N/A" : `${rain}%`;

  renderHourly(data.hourly);
  renderDaily(daily);
}

// Find the current local hour in the API's time series.
function findCurrentHour(times) {
  const now = new Date();

  let index = times.findIndex((time) => {
    const date = new Date(time);

    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate() &&
      date.getHours() === now.getHours()
    );
  });

  return index >= 0 ? index : 0;
}

// Render the next 8 hourly forecast cards.
function renderHourly(hourly) {
  const start = findCurrentHour(hourly.time);
  const cards = [];

  for (let i = 0; i < 8; i++) {
    const index = start + i * 2;

    if (index >= hourly.time.length) break;

    const [description, icon] =
      getCondition(hourly.weather_code[index]);

    const rain =
      hourly.precipitation_probability?.[index] ?? 0;

    const time =
      i === 0 ? "Now" : shortTime(hourly.time[index]);

    cards.push(`
      <div class="hour-card ${i === 0 ? "now" : ""}">
        <div class="time">${time}</div>
        <div class="icon" title="${description}">${icon}</div>
        <div class="degrees">
          ${temperature(hourly.temperature_2m[index])}
        </div>
        <div class="rain">💧 ${rain}%</div>
      </div>
    `);
  }

  $("hourly").innerHTML = cards.join("");
}

// Render the five-day forecast.
function renderDaily(daily) {
  $("daily").innerHTML = daily.time
    .slice(0, 5)
    .map((date, index) => {
      const [description, icon] =
        getCondition(daily.weather_code[index]);

      const dateObject = new Date(`${date}T12:00:00`);

      const dayName =
        index === 0 ? "Today" :
        index === 1 ? "Tomorrow" :
        dateObject.toLocaleDateString(
          undefined,
          { weekday: "long" }
        );

      const dateLabel = dateObject.toLocaleDateString(
        undefined,
        { month: "short", day: "numeric" }
      );

      const rain =
        daily.precipitation_probability_max?.[index] ?? 0;

      return `
        <div class="day-row">
          <div>
            <div class="day-name">${dayName}</div>
            <div class="day-date">${dateLabel}</div>
          </div>

          <div class="day-condition" title="${description}">
            <span>${icon}</span>
            <span>${description}</span>
          </div>

          <div class="day-rain">💧 ${rain}%</div>

          <div class="day-temps">
            ${temperature(daily.temperature_2m_max[index])}
            <span>${temperature(daily.temperature_2m_min[index])}</span>
          </div>
        </div>
      `;
    })
    .join("");
}

// Handle city search.
$("searchForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const city = $("cityInput").value.trim();

  if (!city) {
    setStatus("Please enter a city name.", true);
    $("cityInput").focus();
    return;
  }

  try {
    setStatus(`Searching for ${city}...`);

    const location = await searchCity(city);

    await loadWeather(location);
  } catch (error) {
    setStatus(error.message, true);
  }
});

// Use the browser's location permission.
$("locationBtn").addEventListener("click", () => {
  if (!navigator.geolocation) {
    setStatus(
      "Geolocation is not supported by this browser.",
      true
    );
    return;
  }

  setStatus("Requesting location permission...");

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const location = {
        name: "Your location",
        country: "",
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      await loadWeather(location);
    },

    () => {
      setStatus(
        "Location unavailable. Allow permission or search for a city.",
        true
      );
    },

    {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 300000
    }
  );
});

// Toggle between Celsius and Fahrenheit.
$("unitBtn").addEventListener("click", () => {
  state.unit = state.unit === "C" ? "F" : "C";

  $("unitBtn").textContent =
    state.unit === "C" ? "°C / °F" : "°F / °C";

  if (state.weather) {
    renderWeather();
  }
});

// Refresh current location's forecast.
$("refreshBtn").addEventListener("click", () => {
  loadWeather(state.location);
});

// Start the application.
displayDate();
loadWeather(state.location);
