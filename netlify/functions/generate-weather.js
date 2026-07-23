const CITIES = [
  { city: 'Angul', state: 'Odisha', latitude: 20.8444, longitude: 85.1511 },
  { city: 'Balangir', state: 'Odisha', latitude: 20.7042, longitude: 83.4903 },
  { city: 'Bhubaneswar', state: 'Odisha', latitude: 20.2961, longitude: 85.8245 },
  { city: 'Bargarh', state: 'Odisha', latitude: 21.3333, longitude: 83.6167 },
  { city: 'Cuttack', state: 'Odisha', latitude: 20.4625, longitude: 85.8830 },
  { city: 'Bhadrak', state: 'Odisha', latitude: 21.0583, longitude: 86.4958 },
  { city: 'Boudh', state: 'Odisha', latitude: 20.8377, longitude: 84.3262 },
  { city: 'Deogarh', state: 'Odisha', latitude: 21.5383, longitude: 84.7333 },
  { city: 'Dhenkanal', state: 'Odisha', latitude: 20.6574, longitude: 85.5969 },
  { city: 'Paralakhemundi', state: 'Odisha', latitude: 18.7789, longitude: 84.0936 },
  { city: 'Chhatrapur', state: 'Odisha', latitude: 19.3557, longitude: 84.9860 },
  { city: 'Jagatsinghpur', state: 'Odisha', latitude: 20.2549, longitude: 86.1706 },
  { city: 'Jajpur', state: 'Odisha', latitude: 20.8500, longitude: 86.3333 },
  { city: 'Jharsuguda', state: 'Odisha', latitude: 21.8553, longitude: 84.0062 },
  { city: 'Bhawanipatna', state: 'Odisha', latitude: 19.9074, longitude: 83.1649 },
  { city: 'Phulbani', state: 'Odisha', latitude: 20.4686, longitude: 84.2304 },
  { city: 'Kendrapara', state: 'Odisha', latitude: 20.5000, longitude: 86.4167 },
  { city: 'Kendujhar', state: 'Odisha', latitude: 21.6289, longitude: 85.5817 },
  { city: 'Khordha', state: 'Odisha', latitude: 20.1827, longitude: 85.6163 },
  { city: 'Koraput', state: 'Odisha', latitude: 18.8135, longitude: 82.7123 },
  { city: 'Malkangiri', state: 'Odisha', latitude: 18.3643, longitude: 81.8880 },
  { city: 'Baripada', state: 'Odisha', latitude: 21.9322, longitude: 86.7517 },
  { city: 'Nabarangpur', state: 'Odisha', latitude: 19.2311, longitude: 82.5483 },
  { city: 'Nayagarh', state: 'Odisha', latitude: 20.1288, longitude: 85.0963 },
  { city: 'Nuapada', state: 'Odisha', latitude: 20.8167, longitude: 82.5333 },
  { city: 'Puri', state: 'Odisha', latitude: 19.8135, longitude: 85.8312 },
  { city: 'Rourkela', state: 'Odisha', latitude: 22.2604, longitude: 84.8536 },
  { city: 'Rayagada', state: 'Odisha', latitude: 19.1712, longitude: 83.4160 },
  { city: 'Sambalpur', state: 'Odisha', latitude: 21.4669, longitude: 83.9812 },
  { city: 'Subarnapur', state: 'Odisha', latitude: 20.8333, longitude: 83.9167 },
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
    const cause = error.cause?.code || error.cause?.message || '';
    throw new Error(`${label} failed: ${reason}${cause ? ` (${cause})` : ''}`);
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeSupabaseUrl(value = '') {
  const trimmed = String(value).trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
}

function safeHost(url = '') {
  try {
    return url ? new URL(url).host : 'missing';
  } catch {
    return `invalid url: ${url}`;
  }
}

function getSupabaseConfig() {
  const url = normalizeSupabaseUrl(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
  const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  return {
    url,
    serviceKey,
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
  const index = typeof daily?.index === 'number' ? daily.index : 0;
  const code = current?.weather_code ?? daily?.weather_code?.[index] ?? 0;
  const label = WEATHER_TEXT.get(code) || 'Weather update available';
  const rain = daily?.rain_sum?.[index] ?? 0;
  const rainChance = daily?.precipitation_probability_max?.[index] ?? 0;
  const max = daily?.temperature_2m_max?.[index];
  const min = daily?.temperature_2m_min?.[index];
  return `${city}: ${label}. Max ${max ?? '-'} C, min ${min ?? '-'} C, rain chance ${rainChance ?? 0}%, rainfall ${rain ?? 0} mm.`;
}

async function fetchCityWeather(city) {
  const params = new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    current: 'temperature_2m,weather_code,wind_speed_10m',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,rain_sum,weather_code',
    timezone: 'Asia/Kolkata',
    past_days: '5',
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
  const days = data.daily?.time?.length ? data.daily.time : [todayInIndia()];
  const today = days[days.length - 1];
  return days.map((reportDate, index) => ({
    report_date: reportDate,
    city: city.city,
    state: city.state,
    country: city.country || 'India',
    latitude: city.latitude,
    longitude: city.longitude,
    temperature_max: data.daily?.temperature_2m_max?.[index] ?? null,
    temperature_min: data.daily?.temperature_2m_min?.[index] ?? null,
    temperature_current: reportDate === today ? data.current?.temperature_2m ?? null : null,
    precipitation_probability: data.daily?.precipitation_probability_max?.[index] ?? null,
    rainfall: data.daily?.rain_sum?.[index] ?? null,
    wind_speed: reportDate === today ? data.current?.wind_speed_10m ?? null : null,
    weather_code: reportDate === today ? data.current?.weather_code ?? data.daily?.weather_code?.[index] ?? null : data.daily?.weather_code?.[index] ?? null,
    summary: summaryFor(city.city, { ...data.daily, index }, reportDate === today ? data.current : null),
    source: 'Open-Meteo',
    updated_at: new Date().toISOString(),
  }));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchAllCityWeather() {
  const reports = [];
  const failed = [];
  const locations = await loadWeatherLocations();

  for (const city of locations) {
    try {
      reports.push(...(await fetchCityWeather(city)));
      await wait(350);
    } catch (error) {
      failed.push(error.message || `Weather failed for ${city.city}`);
      await wait(800);
    }
  }

  return { reports, failed };
}

async function loadWeatherLocations() {
  const { url, serviceKey } = getSupabaseConfig();
  if (!url || !serviceKey) return CITIES;

  try {
    const response = await fetchWithTimeout(
      `${url}/rest/v1/weather_locations?is_active=eq.true&select=city,state,country,latitude,longitude&order=state.asc,city.asc`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      },
      'Supabase weather location load'
    );
    if (!response.ok) return CITIES;
    const rows = await response.json();
    if (!Array.isArray(rows) || !rows.length) return CITIES;
    return rows.map((row) => ({
      city: row.city,
      state: row.state || '',
      country: row.country || 'India',
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
    })).filter((row) => row.city && Number.isFinite(row.latitude) && Number.isFinite(row.longitude));
  } catch {
    return CITIES;
  }
}

async function saveReports(reports) {
  const { url, serviceKey } = getSupabaseConfig();
  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Netlify environment variables.');
  }
  if (!url.includes('.supabase.co')) {
    throw new Error(`SUPABASE_URL looks wrong: ${url}. Use https://your-project-ref.supabase.co`);
  }
  if (serviceKey.length < 40) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY looks incomplete. Copy the full secret/service role key from Supabase API Keys.');
  }

  const endpoint = `${url}/rest/v1/daily_weather_reports?on_conflict=report_date,city,country`;
  const response = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(reports),
  }, `Supabase weather save to ${new URL(url).host}`);

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

    const { reports, failed } = await fetchAllCityWeather();

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
    const { url, serviceKey } = getSupabaseConfig();
    return json(500, {
      ok: false,
      error: error.message || 'Weather report failed.',
      debug: {
        supabaseHost: safeHost(url),
        hasServiceKey: Boolean(serviceKey),
        serviceKeyLength: serviceKey ? serviceKey.length : 0,
      },
      help: 'Check Netlify env vars, Supabase daily_weather_reports table, and function deploy logs.',
    });
  }
};
