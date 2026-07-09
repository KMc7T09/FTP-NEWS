const CITIES = [
  { city: 'Bhubaneswar', state: 'Odisha', latitude: 20.2961, longitude: 85.8245 },
  { city: 'Cuttack', state: 'Odisha', latitude: 20.4625, longitude: 85.8830 },
  { city: 'Puri', state: 'Odisha', latitude: 19.8135, longitude: 85.8312 },
  { city: 'Rourkela', state: 'Odisha', latitude: 22.2604, longitude: 84.8536 },
  { city: 'Sambalpur', state: 'Odisha', latitude: 21.4669, longitude: 83.9812 },
  { city: 'Berhampur', state: 'Odisha', latitude: 19.3149, longitude: 84.7941 },
  { city: 'Balasore', state: 'Odisha', latitude: 21.4934, longitude: 86.9135 },
  { city: 'Delhi', state: 'Delhi', latitude: 28.6139, longitude: 77.209 },
  { city: 'Mumbai', state: 'Maharashtra', latitude: 19.076, longitude: 72.8777 },
  { city: 'Kolkata', state: 'West Bengal', latitude: 22.5726, longitude: 88.3639 },
  { city: 'Chennai', state: 'Tamil Nadu', latitude: 13.0827, longitude: 80.2707 },
  { city: 'Bengaluru', state: 'Karnataka', latitude: 12.9716, longitude: 77.5946 },
  { city: 'Hyderabad', state: 'Telangana', latitude: 17.385, longitude: 78.4867 },
  { city: 'Ahmedabad', state: 'Gujarat', latitude: 23.0225, longitude: 72.5714 },
  { city: 'Pune', state: 'Maharashtra', latitude: 18.5204, longitude: 73.8567 },
  { city: 'Jaipur', state: 'Rajasthan', latitude: 26.9124, longitude: 75.7873 },
  { city: 'Lucknow', state: 'Uttar Pradesh', latitude: 26.8467, longitude: 80.9462 },
];

const WEATHER_TEXT = new Map([
  [0, 'Clear sky'],
  [1, 'Mostly clear'],
  [2, 'Partly cloudy'],
  [3, 'Cloudy'],
  [45, 'Foggy'],
  [48, 'Fog with frost'],
  [51, 'Light drizzle'],
  [53, 'Drizzle'],
  [55, 'Heavy drizzle'],
  [61, 'Light rain'],
  [63, 'Rain'],
  [65, 'Heavy rain'],
  [71, 'Light snow'],
  [80, 'Light showers'],
  [81, 'Showers'],
  [82, 'Heavy showers'],
  [95, 'Thunderstorm'],
]);

exports.config = {
  schedule: '30 0 * * *',
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

async function fetchWithTimeout(url, options = {}, label = 'Request') {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    const reason = error.name === 'AbortError' ? 'request timed out' : error.message;
    throw new Error(`${label} failed: ${reason}`);
  } finally {
    clearTimeout(timeout);
  }
}

function getSupabaseConfig() {
  return {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

function todayInIndia() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function summaryFor(city, daily, current) {
  const code = current?.weather_code ?? daily?.weather_code?.[0] ?? 0;
  const label = WEATHER_TEXT.get(code) || 'Weather update available';
  const rain = daily?.rain_sum?.[0] ?? 0;
  const rainChance = daily?.precipitation_probability_max?.[0] ?? 0;
  const max = daily?.temperature_2m_max?.[0];
  const min = daily?.temperature_2m_min?.[0];
  return `${city}: ${label}. Max ${max ?? '-'} C, min ${min ?? '-'} C, rain chance ${rainChance ?? 0}%, rainfall ${rain ?? 0} mm.`;
}

async function fetchCityWeather(city) {
  const params = new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    current: 'temperature_2m,weather_code,wind_speed_10m',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,rain_sum,weather_code',
    timezone: 'Asia/Kolkata',
    forecast_days: '1',
  });

  const response = await fetchWithTimeout(
    `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
    {},
    `Open-Meteo weather API for ${city.city}`
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Open-Meteo returned ${response.status} for ${city.city}. ${errorText}`);
  }

  const data = await response.json();
  const reportDate = data.daily?.time?.[0] || todayInIndia();
  return {
    report_date: reportDate,
    city: city.city,
    state: city.state,
    country: 'India',
    latitude: city.latitude,
    longitude: city.longitude,
    temperature_max: data.daily?.temperature_2m_max?.[0] ?? null,
    temperature_min: data.daily?.temperature_2m_min?.[0] ?? null,
    temperature_current: data.current?.temperature_2m ?? null,
    precipitation_probability: data.daily?.precipitation_probability_max?.[0] ?? null,
    rainfall: data.daily?.rain_sum?.[0] ?? null,
    wind_speed: data.current?.wind_speed_10m ?? null,
    weather_code: data.current?.weather_code ?? data.daily?.weather_code?.[0] ?? null,
    summary: summaryFor(city.city, data.daily, data.current),
    source: 'Open-Meteo',
    updated_at: new Date().toISOString(),
  };
}

async function saveReports(reports) {
  const { url, serviceKey } = getSupabaseConfig();
  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Netlify environment variables.');
  }

  const response = await fetchWithTimeout(`${url}/rest/v1/daily_weather_reports?on_conflict=report_date,city,country`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(reports),
  }, 'Supabase weather save');

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase weather save failed: ${response.status} ${text}`);
  }
  return text ? JSON.parse(text) : [];
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});

  try {
    if (typeof fetch !== 'function') {
      throw new Error('Netlify function runtime does not support fetch. Set Node.js runtime to 18 or newer.');
    }

    const settled = await Promise.allSettled(CITIES.map(fetchCityWeather));
    const reports = settled.filter((item) => item.status === 'fulfilled').map((item) => item.value);
    const failed = settled.filter((item) => item.status === 'rejected').map((item) => item.reason?.message || 'Unknown error');

    if (!reports.length) {
      throw new Error(`No weather reports generated. First error: ${failed[0] || 'unknown'}`);
    }

    const saved = await saveReports(reports);
    return json(200, {
      ok: true,
      date: reports[0]?.report_date || todayInIndia(),
      saved: saved.length || reports.length,
      failed,
    });
  } catch (error) {
    return json(500, {
      ok: false,
      error: error.message || 'Weather report failed.',
      help: 'Check Netlify env vars, Supabase daily_weather_reports table, and function deploy logs.',
    });
  }
};
