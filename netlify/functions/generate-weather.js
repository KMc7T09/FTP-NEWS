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

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
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

function latestReportDate(reports = []) {
  return reports.reduce((latest, report) => (report.report_date > latest ? report.report_date : latest), reports[0]?.report_date || todayInIndia());
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

function reportsFromWeatherData(city, data) {
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

async function fetchWeatherBatch(cities) {
  const params = new URLSearchParams({
    latitude: cities.map((city) => city.latitude).join(','),
    longitude: cities.map((city) => city.longitude).join(','),
    current: 'temperature_2m,weather_code,wind_speed_10m',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,rain_sum,weather_code',
    timezone: 'Asia/Kolkata',
    past_days: '5',
    forecast_days: '1',
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  let response;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    response = await fetchWithTimeout(url, {}, `Open-Meteo weather API for ${cities.length} locations`);
    if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 2) break;
    await wait(400 * (2 ** attempt));
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Open-Meteo returned ${response.status} for ${cities[0]?.city || 'batch'}. ${errorText}`);
  }

  const payload = await response.json();
  const responses = Array.isArray(payload) ? payload : [payload];
  return cities.flatMap((city, index) => reportsFromWeatherData(city, responses[index] || responses[0] || {}));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchAllCityWeather({ offset = 0, limit = 80 } = {}) {
  const reports = [];
  const failed = [];
  const allLocations = await loadWeatherLocations();
  const safeOffset = Math.max(0, Number(offset) || 0);
  const safeLimit = Math.min(Math.max(1, Number(limit) || 20), 20);
  const locations = allLocations.slice(safeOffset, safeOffset + safeLimit);
  const batchSize = 10;

  for (let index = 0; index < locations.length; index += batchSize) {
    const batch = locations.slice(index, index + batchSize);
    try {
      reports.push(...(await fetchWeatherBatch(batch)));
    } catch (error) {
      const reason = error.message || 'Weather API batch failed';
      failed.push(...batch.map((city) => `${city.city}: ${reason}`));
    }
    if (index + batchSize < locations.length) await wait(120);
  }

  return {
    reports,
    failed,
    offset: safeOffset,
    limit: safeLimit,
    totalLocations: allLocations.length,
    nextOffset: safeOffset + locations.length,
    hasMore: safeOffset + locations.length < allLocations.length,
  };
}

async function loadWeatherLocations() {
  const { url, serviceKey } = getSupabaseConfig();
  if (!url || !serviceKey) throw new Error('Weather generation needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Netlify environment variables.');

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
  const text = await response.text();
  if (!response.ok) throw new Error(`Weather locations could not be loaded from Supabase (${response.status}): ${text.slice(0, 400)}`);
  let rows;
  try {
    rows = text ? JSON.parse(text) : [];
  } catch {
    throw new Error('Supabase returned invalid data for weather_locations.');
  }
  if (!Array.isArray(rows) || !rows.length) {
    const error = new Error('No active weather locations are configured. Run supabase/weather-locations-seed.sql in the Supabase SQL Editor, then retry.');
    error.statusCode = 409;
    throw error;
  }
  const locations = rows.map((row) => ({
    city: row.city,
    state: row.state || '',
    country: row.country || 'India',
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
  })).filter((row) => row.city && Number.isFinite(row.latitude) && Number.isFinite(row.longitude));
  if (!locations.length) {
    const error = new Error('Active weather locations have missing or invalid coordinates. Review city, latitude, and longitude in public.weather_locations.');
    error.statusCode = 409;
    throw error;
  }
  return locations;
}

async function assertActiveAdmin(event) {
  const { url, serviceKey } = getSupabaseConfig();
  const authorization = event.headers?.authorization || event.headers?.Authorization || '';
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    const error = new Error('Sign in with an admin account before generating weather.');
    error.statusCode = 401;
    throw error;
  }
  if (!url || !serviceKey) throw new Error('Weather generation is not configured on the server.');

  const userResponse = await fetchWithTimeout(`${url}/auth/v1/user`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${token}` },
  }, 'Admin session verification');
  if (!userResponse.ok) {
    const error = new Error('Your login session is invalid or expired. Sign in again.');
    error.statusCode = 401;
    throw error;
  }
  const user = await userResponse.json();
  const profilesResponse = await fetchWithTimeout(
    `${url}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=email,role,status`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
    'Admin role lookup'
  );
  if (!profilesResponse.ok) throw new Error(`Admin role lookup failed (${profilesResponse.status}).`);
  const profiles = await profilesResponse.json();
  const profile = profiles[0];
  const ownerEmails = String(process.env.BOOTSTRAP_ADMIN_EMAILS || process.env.VITE_BOOTSTRAP_ADMIN_EMAILS || 'kubulukhotei@gmail.com')
    .split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);
  const email = String(user.email || profile?.email || '').toLowerCase();
  const owner = ownerEmails.includes(email);
  const authorized = profile?.status === 'active' && (owner || ['admin', 'superadmin'].includes(profile?.role));
  if (!authorized) {
    const error = new Error('An active admin or superadmin account is required for weather generation.');
    error.statusCode = 403;
    throw error;
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

  const endpoint = `${url}/rest/v1/daily_weather_reports?on_conflict=report_date,city,state,country`;
  const legacyEndpoint = `${url}/rest/v1/daily_weather_reports?on_conflict=report_date,city,country`;
  const saved = [];
  const chunkSize = 500;
  for (let index = 0; index < reports.length; index += chunkSize) {
    let chunk = reports.slice(index, index + chunkSize);
    const requestOptions = {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(chunk),
    };
    let response = await fetchWithTimeout(endpoint, requestOptions, `Supabase weather save to ${new URL(url).host}`);
    let text = await response.text();

    // Older projects may still have the pre-state unique key; fall back without duplicate input rows.
    let failure;
    try {
      failure = text ? JSON.parse(text) : null;
    } catch {
      failure = null;
    }
    if (!response.ok && failure?.code === '42P10') {
      const uniqueByLegacyKey = new Map();
      chunk.forEach((row) => uniqueByLegacyKey.set(`${row.report_date}\u0000${row.city}\u0000${row.country}`, row));
      chunk = [...uniqueByLegacyKey.values()];
      response = await fetchWithTimeout(legacyEndpoint, {
        ...requestOptions,
        body: JSON.stringify(chunk),
      }, `Supabase legacy weather save to ${new URL(url).host}`);
      text = await response.text();
    }

    if (!response.ok) {
      throw new Error(`Supabase weather save failed: ${response.status} ${text}`);
    }
    if (text) saved.push(...JSON.parse(text));
  }
  return saved;
}

exports.generateAllActiveWeather = async () => {
  let offset = 0;
  let saved = 0;
  let failed = [];
  let totalLocations = 0;
  let hasMore = true;

  while (hasMore) {
    const result = await fetchAllCityWeather({ offset, limit: 20 });
    totalLocations = result.totalLocations;
    failed = failed.concat(result.failed);
    if (result.reports.length) saved += (await saveReports(result.reports)).length || result.reports.length;
    offset = result.nextOffset;
    hasMore = result.hasMore;
  }

  return { saved, failed, totalLocations };
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});

  try {
    if (typeof fetch !== 'function') {
      throw new Error('Netlify function runtime does not support fetch. Set Node.js runtime to 18 or newer.');
    }

    if (event.httpMethod !== 'POST') {
      return json(405, { ok: false, error: 'Method not allowed. Use the authenticated Admin Panel action.' });
    }

    await assertActiveAdmin(event);
    const offset = Number(event.queryStringParameters?.offset || 0);
    const limit = Number(event.queryStringParameters?.limit || 80);
    const { reports, failed, totalLocations, nextOffset, hasMore } = await fetchAllCityWeather({ offset, limit });

    if (!reports.length) {
      return json(200, {
        ok: true,
        date: todayInIndia(),
        saved: 0,
        failed,
        totalLocations,
        nextOffset,
        hasMore,
      });
    }

    const saved = await saveReports(reports);
    return json(200, {
      ok: true,
      date: latestReportDate(reports),
      saved: saved.length || reports.length,
      failed,
      totalLocations,
      nextOffset,
      hasMore,
    });
  } catch (error) {
    return json(error.statusCode || 500, {
      ok: false,
      error: error.message || 'Weather report failed.',
      help: error.statusCode === 409
        ? 'Weather locations are not configured yet. Run supabase/weather-locations-seed.sql in Supabase, then retry.'
        : error.message?.includes('42P10')
          ? 'The weather table is missing the matching unique constraint. Run supabase/weather-report-state-unique.sql in the correct Supabase project, then retry.'
          : 'Check active weather_locations, daily_weather_reports schema, Netlify function logs, and server environment variables.',
    });
  }
};
