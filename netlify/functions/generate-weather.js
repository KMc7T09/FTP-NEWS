const CITIES = [
  { city: 'Angul', state: 'Odisha', country: 'India', latitude: 20.8442, longitude: 85.1511 },
  { city: 'Balangir', state: 'Odisha', country: 'India', latitude: 20.7047, longitude: 83.4844 },
  { city: 'Balasore', state: 'Odisha', country: 'India', latitude: 21.4942, longitude: 86.9317 },
  { city: 'Bargarh', state: 'Odisha', country: 'India', latitude: 21.3335, longitude: 83.6190 },
  { city: 'Bhadrak', state: 'Odisha', country: 'India', latitude: 21.0574, longitude: 86.4996 },
  { city: 'Boudh', state: 'Odisha', country: 'India', latitude: 20.8372, longitude: 84.3260 },
  { city: 'Cuttack', state: 'Odisha', country: 'India', latitude: 20.4625, longitude: 85.8830 },
  { city: 'Deogarh', state: 'Odisha', country: 'India', latitude: 21.5383, longitude: 84.7330 },
  { city: 'Dhenkanal', state: 'Odisha', country: 'India', latitude: 20.6574, longitude: 85.5964 },
  { city: 'Gajapati', state: 'Odisha', country: 'India', latitude: 19.1728, longitude: 84.0550 },
  { city: 'Ganjam', state: 'Odisha', country: 'India', latitude: 19.3870, longitude: 85.0510 },
  { city: 'Jagatsinghpur', state: 'Odisha', country: 'India', latitude: 20.2644, longitude: 86.1710 },
  { city: 'Jajpur', state: 'Odisha', country: 'India', latitude: 20.8500, longitude: 86.3333 },
  { city: 'Jharsuguda', state: 'Odisha', country: 'India', latitude: 21.8553, longitude: 84.0060 },
  { city: 'Kalahandi', state: 'Odisha', country: 'India', latitude: 19.9137, longitude: 83.1649 },
  { city: 'Kandhamal', state: 'Odisha', country: 'India', latitude: 20.1347, longitude: 84.6190 },
  { city: 'Kendrapara', state: 'Odisha', country: 'India', latitude: 20.5017, longitude: 86.4223 },
  { city: 'Kendujhar', state: 'Odisha', country: 'India', latitude: 21.6289, longitude: 85.5817 },
  { city: 'Khordha', state: 'Odisha', country: 'India', latitude: 20.1820, longitude: 85.6160 },
  { city: 'Koraput', state: 'Odisha', country: 'India', latitude: 18.8135, longitude: 82.7110 },
  { city: 'Malkangiri', state: 'Odisha', country: 'India', latitude: 18.3500, longitude: 81.9000 },
  { city: 'Mayurbhanj', state: 'Odisha', country: 'India', latitude: 21.9280, longitude: 86.7370 },
  { city: 'Nabarangpur', state: 'Odisha', country: 'India', latitude: 19.2333, longitude: 82.5500 },
  { city: 'Nayagarh', state: 'Odisha', country: 'India', latitude: 20.1280, longitude: 85.0960 },
  { city: 'Nuapada', state: 'Odisha', country: 'India', latitude: 20.8500, longitude: 82.5500 },
  { city: 'Puri', state: 'Odisha', country: 'India', latitude: 19.8135, longitude: 85.8312 },
  { city: 'Rayagada', state: 'Odisha', country: 'India', latitude: 19.1728, longitude: 83.4160 },
  { city: 'Sambalpur', state: 'Odisha', country: 'India', latitude: 21.4669, longitude: 83.9812 },
  { city: 'Subarnapur', state: 'Odisha', country: 'India', latitude: 20.8333, longitude: 83.9167 },
  { city: 'Sundargarh', state: 'Odisha', country: 'India', latitude: 22.1167, longitude: 84.0333 },

  { city: 'Delhi', state: 'Delhi', country: 'India', latitude: 28.6139, longitude: 77.2090 },
  { city: 'Mumbai', state: 'Maharashtra', country: 'India', latitude: 19.0760, longitude: 72.8777 },
  { city: 'Kolkata', state: 'West Bengal', country: 'India', latitude: 22.5726, longitude: 88.3639 },
  { city: 'Chennai', state: 'Tamil Nadu', country: 'India', latitude: 13.0827, longitude: 80.2707 },
  { city: 'Bengaluru', state: 'Karnataka', country: 'India', latitude: 12.9716, longitude: 77.5946 },
  { city: 'Hyderabad', state: 'Telangana', country: 'India', latitude: 17.3850, longitude: 78.4867 },
  { city: 'Ahmedabad', state: 'Gujarat', country: 'India', latitude: 23.0225, longitude: 72.5714 },
  { city: 'Pune', state: 'Maharashtra', country: 'India', latitude: 18.5204, longitude: 73.8567 },
  { city: 'Jaipur', state: 'Rajasthan', country: 'India', latitude: 26.9124, longitude: 75.7873 },
  { city: 'Lucknow', state: 'Uttar Pradesh', country: 'India', latitude: 26.8467, longitude: 80.9462 }
];

const WEATHER_TEXT = new Map([
  [0, 'Clear sky'],
  [1, 'Mainly clear'],
  [2, 'Partly cloudy'],
  [3, 'Overcast'],
  [45, 'Fog'],
  [48, 'Depositing rime fog'],
  [51, 'Light drizzle'],
  [53, 'Moderate drizzle'],
  [55, 'Dense drizzle'],
  [56, 'Light freezing drizzle'],
  [57, 'Dense freezing drizzle'],
  [61, 'Slight rain'],
  [63, 'Moderate rain'],
  [65, 'Heavy rain'],
  [66, 'Light freezing rain'],
  [67, 'Heavy freezing rain'],
  [71, 'Slight snow'],
  [73, 'Moderate snow'],
  [75, 'Heavy snow'],
  [77, 'Snow grains'],
  [80, 'Slight rain showers'],
  [81, 'Moderate rain showers'],
  [82, 'Violent rain showers'],
  [85, 'Slight snow showers'],
  [86, 'Heavy snow showers'],
  [95, 'Thunderstorm'],
  [96, 'Thunderstorm with slight hail'],
  [99, 'Thunderstorm with heavy hail']
]);

exports.config = {
  schedule: '30 0 * * *'
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    },
    body: JSON.stringify(body)
  };
}

async function fetchWithTimeout(url, options = {}, label = 'request') {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');

      throw new Error(
        `${label} failed: HTTP ${response.status} ${response.statusText}${text ? ` - ${text.slice(0, 300)}` : ''}`
      );
    }

    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`${label} timed out after 15 seconds`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeSupabaseUrl(value) {
  const trimmed = String(value || '').trim().replace(/\/+$/, '');

  if (!trimmed) {
    return '';
  }

  return trimmed.startsWith('http')
    ? trimmed
    : `https://${trimmed}`;
}

function safeHost(url) {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

function getSupabaseConfig() {
  const url = normalizeSupabaseUrl(process.env.SUPABASE_URL);
  const serviceRoleKey = String(
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  ).trim();

  if (!url) {
    throw new Error('SUPABASE_URL is missing');
  }

  if (!safeHost(url).endsWith('.supabase.co')) {
    throw new Error(
      `SUPABASE_URL looks wrong: ${url}. Use https://your-project-ref.supabase.co`
    );
  }

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing');
  }

  return {
    url,
    serviceRoleKey
  };
}

function todayInIndia() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function latestReportDate(reports) {
  if (!reports.length) {
    return null;
  }

  return reports.reduce((latest, report) => {
    if (!latest || report.report_date > latest) {
      return report.report_date;
    }

    return latest;
  }, null);
}

function summaryFor(city, daily, current) {
  const weatherCode = Number(daily.weather_code);

  return {
    city: city.city,
    state: city.state,
    country: city.country,
    latitude: city.latitude,
    longitude: city.longitude,
    report_date: daily.date,
    temperature_max: Number(daily.temperature_2m_max),
    temperature_min: Number(daily.temperature_2m_min),
    precipitation_probability: Number(
      daily.precipitation_probability_max || 0
    ),
    rain_mm: Number(daily.rain_sum || 0),
    weather_code: weatherCode,
    weather_text: WEATHER_TEXT.get(weatherCode) || 'Unknown',
    current_temperature:
      current && current.temperature_2m != null
        ? Number(current.temperature_2m)
        : null,
    current_wind_speed:
      current && current.wind_speed_10m != null
        ? Number(current.wind_speed_10m)
        : null,
    current_weather_code:
      current && current.weather_code != null
        ? Number(current.weather_code)
        : null,
    updated_at: new Date().toISOString()
  };
}

function reportsFromWeatherData(cities, weatherData) {
  const reports = [];

  for (let index = 0; index < cities.length; index += 1) {
    const city = cities[index];
    const data = Array.isArray(weatherData)
      ? weatherData[index]
      : weatherData;

    if (!data || !data.daily) {
      continue;
    }

    const days = data.daily;

    if (!Array.isArray(days.time) || days.time.length === 0) {
      continue;
    }

    const lastIndex = days.time.length - 1;

    const daily = {
      date: days.time[lastIndex],
      temperature_2m_max: days.temperature_2m_max?.[lastIndex],
      temperature_2m_min: days.temperature_2m_min?.[lastIndex],
      precipitation_probability_max:
        days.precipitation_probability_max?.[lastIndex],
      rain_sum: days.rain_sum?.[lastIndex],
      weather_code: days.weather_code?.[lastIndex]
    };

    reports.push(
      summaryFor(city, daily, data.current || null)
    );
  }

  return reports;
}

async function fetchWeatherBatch(cities) {
  if (!cities.length) {
    return [];
  }

  const latitude = cities.map((city) => city.latitude).join(',');
  const longitude = cities.map((city) => city.longitude).join(',');

  const params = new URLSearchParams({
    latitude,
    longitude,
    current: 'temperature_2m,weather_code,wind_speed_10m',
    daily:
      'temperature_2m_max,temperature_2m_min,precipitation_probability_max,rain_sum,weather_code',
    timezone: 'Asia/Kolkata',
    past_days: '5',
    forecast_days: '1'
  });

  const response = await fetchWithTimeout(
    `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
    {},
    `Open-Meteo weather API for ${cities.length} locations`
  );

  return response.json();
}

async function fetchAllCityWeather(cities, options = {}) {
  const batchSize = 25;
  const allReports = [];
  const failedCities = [];

  const offset = Number.isFinite(options.offset)
    ? Math.max(0, options.offset)
    : 0;

  const limit = Number.isFinite(options.limit)
    ? Math.min(Math.max(1, options.limit), 120)
    : cities.length;

  const selectedCities = cities.slice(offset, offset + limit);

  for (let start = 0; start < selectedCities.length; start += batchSize) {
    const batch = selectedCities.slice(start, start + batchSize);

    try {
      const weatherData = await fetchWeatherBatch(batch);
      const reports = reportsFromWeatherData(batch, weatherData);

      allReports.push(...reports);
    } catch (batchError) {
      console.error(
        `Weather batch failed for ${batch.length} cities:`,
        batchError
      );

      for (const city of batch) {
        try {
          const weatherData = await fetchWeatherBatch([city]);
          const reports = reportsFromWeatherData(
            [city],
            weatherData
          );

          allReports.push(...reports);
        } catch (cityError) {
          failedCities.push({
            city: city.city,
            state: city.state,
            error: cityError.message
          });

          console.error(
            `Weather failed for ${city.city}, ${city.state}:`,
            cityError
          );
        }
      }
    }
  }

  return {
    reports: allReports,
    failedCities
  };
}

async function loadWeatherLocations(supabase) {
  const endpoint =
    `${supabase.url}/rest/v1/weather_locations` +
    '?is_active=eq.true' +
    '&select=city,state,country,latitude,longitude' +
    '&order=state.asc,city.asc';

  const response = await fetchWithTimeout(
    endpoint,
    {
      headers: {
        apikey: supabase.serviceRoleKey,
        Authorization: `Bearer ${supabase.serviceRoleKey}`
      }
    },
    'Supabase weather_locations'
  );

  const rows = await response.json();

  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  return rows
    .filter(
      (row) =>
        row.city &&
        row.country &&
        Number.isFinite(Number(row.latitude)) &&
        Number.isFinite(Number(row.longitude))
    )
    .map((row) => ({
      city: row.city,
      state: row.state || '',
      country: row.country,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude)
    }));
}

async function saveReports(supabase, reports) {
  if (!reports.length) {
    return [];
  }

  const endpoint =
    `${supabase.url}/rest/v1/daily_weather_reports` +
    '?on_conflict=report_date,city,country';

  const saved = [];
  const chunkSize = 500;

  for (let start = 0; start < reports.length; start += chunkSize) {
    const chunk = reports.slice(start, start + chunkSize);

    const response = await fetchWithTimeout(
      endpoint,
      {
        method: 'POST',
        headers: {
          apikey: supabase.serviceRoleKey,
          Authorization: `Bearer ${supabase.serviceRoleKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify(chunk)
      },
      `Supabase daily_weather_reports chunk ${Math.floor(start / chunkSize) + 1}`
    );

    const data = await response.json();

    if (Array.isArray(data)) {
      saved.push(...data);
    }
  }

  return saved;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return json(200, {});
  }

  try {
    const supabase = getSupabaseConfig();

    let locations = [];

    try {
      locations = await loadWeatherLocations(supabase);
    } catch (locationError) {
      console.warn(
        'Could not load weather_locations. Using fallback city list:',
        locationError
      );

      locations = [];
    }

    if (!locations.length) {
      locations = CITIES;
    }

    const query = event.queryStringParameters || {};

    const offset =
      query.offset !== undefined
        ? Math.max(0, Number(query.offset) || 0)
        : 0;

    const limit =
      query.limit !== undefined
        ? Math.min(
            Math.max(1, Number(query.limit) || locations.length),
            120
          )
        : locations.length;

    const weatherResult = await fetchAllCityWeather(locations, {
      offset,
      limit
    });

    const reports = weatherResult.reports;

    if (!reports.length) {
      throw new Error('No weather reports were generated');
    }

    const saved = await saveReports(supabase, reports);

    return json(200, {
      ok: true,
      message: 'Weather reports generated and saved successfully',
      today: todayInIndia(),
      latestReportDate: latestReportDate(reports),
      locationsAvailable: locations.length,
      locationsProcessed: Math.min(
        limit,
        Math.max(0, locations.length - offset)
      ),
      reportsGenerated: reports.length,
      reportsSaved: saved.length,
      failedCities: weatherResult.failedCities
    });
  } catch (error) {
    console.error('generate-weather error:', error);

    return json(500, {
      ok: false,
      error: error.message,
      debug: {
        hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
        hasServiceRoleKey: Boolean(
          process.env.SUPABASE_SERVICE_ROLE_KEY
        )
      }
    });
  }
};