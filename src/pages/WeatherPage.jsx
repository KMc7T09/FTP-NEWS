import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CloudSun, Download, Droplets, Globe2, LocateFixed, MapPin, RefreshCw, Search, ThermometerSun, Wind } from 'lucide-react';
import { listWeatherReports } from '../supabase/api.js';

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
  [80, 'Light showers'],
  [81, 'Showers'],
  [82, 'Heavy showers'],
  [95, 'Thunderstorm'],
]);

function formatReportDate(value) {
  if (!value) return 'Today';
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00+05:30`));
}

function cityLabel(place = {}) {
  return [place.name || place.city, place.admin1 || place.state, place.country].filter(Boolean).join(', ');
}

function weatherSummary(report) {
  if (report.summary) return report.summary;
  const label = WEATHER_TEXT.get(report.weatherCode) || 'Weather update available';
  return `${report.city}: ${label}. Max ${report.temperatureMax ?? '-'} C, min ${report.temperatureMin ?? '-'} C, rain chance ${report.precipitationProbability ?? 0}%, rainfall ${report.rainfall ?? 0} mm.`;
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function reportText(report) {
  return [
    'THE FTP NEWS - Weather Report',
    `Date: ${formatReportDate(report.reportDate)}`,
    `City: ${report.city}`,
    `State/Region: ${report.state || '-'}`,
    `Country: ${report.country || '-'}`,
    `Current temperature: ${report.temperatureCurrent ?? '-'} C`,
    `Maximum temperature: ${report.temperatureMax ?? '-'} C`,
    `Minimum temperature: ${report.temperatureMin ?? '-'} C`,
    `Rain chance: ${report.precipitationProbability ?? 0}%`,
    `Rainfall: ${report.rainfall ?? 0} mm`,
    `Wind speed: ${report.windSpeed ?? '-'} km/h`,
    `Summary: ${weatherSummary(report)}`,
    `Source: ${report.source || 'Open-Meteo'}`,
  ].join('\n');
}

function downloadCityReport(report) {
  const slug = `${report.city || 'weather'}-${report.reportDate || 'today'}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  downloadText(`${slug}-weather-report.txt`, reportText(report));
}

function WeatherCard({ report, featured = false }) {
  return (
    <article className={`overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ${featured ? 'lg:grid lg:grid-cols-[0.8fr_1.2fr]' : ''}`}>
      <div className="bg-gradient-to-br from-gray-950 via-gray-900 to-red-950 p-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-red-200">{report.state || report.country || 'Weather'}</p>
            <h2 className="mt-2 text-2xl font-extrabold">{report.city}</h2>
            <p className="mt-2 text-xs font-semibold text-gray-300">{formatReportDate(report.reportDate)}</p>
          </div>
          <CloudSun className="text-red-200" size={34} />
        </div>
        <p className="mt-6 text-5xl font-black">{report.temperatureCurrent ?? report.temperatureMax ?? '-'} C</p>
        <p className="mt-2 text-sm text-gray-200">{WEATHER_TEXT.get(report.weatherCode) || 'Weather update'}</p>
      </div>
      <div>
        <div className="grid gap-3 p-4 text-sm sm:grid-cols-2">
          <div className="rounded-lg bg-red-50 p-3">
            <div className="flex items-center gap-2 font-extrabold text-red-700"><ThermometerSun size={17} /> Temperature</div>
            <p className="mt-1 text-gray-700">Max {report.temperatureMax ?? '-'} C / Min {report.temperatureMin ?? '-'} C</p>
          </div>
          <div className="rounded-lg bg-blue-50 p-3">
            <div className="flex items-center gap-2 font-extrabold text-blue-700"><Droplets size={17} /> Rain</div>
            <p className="mt-1 text-gray-700">{report.precipitationProbability ?? 0}% chance, {report.rainfall ?? 0} mm</p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-3">
            <div className="flex items-center gap-2 font-extrabold text-emerald-700"><Wind size={17} /> Wind</div>
            <p className="mt-1 text-gray-700">{report.windSpeed ?? '-'} km/h</p>
          </div>
          <button className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-left font-extrabold text-gray-800 hover:border-brand-red hover:text-brand-red" onClick={() => downloadCityReport(report)}>
            <span className="flex items-center gap-2"><Download size={17} /> Download report</span>
          </button>
        </div>
        <p className="border-t border-gray-100 p-4 text-sm leading-6 text-gray-700">{weatherSummary(report)}</p>
      </div>
    </article>
  );
}

async function fetchForecastForPlace(place) {
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: 'temperature_2m,weather_code,wind_speed_10m',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,rain_sum,weather_code',
    timezone: 'auto',
    forecast_days: '1',
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!response.ok) throw new Error('Weather service is busy. Try again.');
  const data = await response.json();
  return {
    id: `live-${place.latitude}-${place.longitude}`,
    reportDate: data.daily?.time?.[0] || new Date().toISOString().slice(0, 10),
    city: place.name || place.city || 'Current Location',
    state: place.admin1 || place.state || '',
    country: place.country || '',
    latitude: place.latitude,
    longitude: place.longitude,
    temperatureMax: data.daily?.temperature_2m_max?.[0] ?? null,
    temperatureMin: data.daily?.temperature_2m_min?.[0] ?? null,
    temperatureCurrent: data.current?.temperature_2m ?? null,
    precipitationProbability: data.daily?.precipitation_probability_max?.[0] ?? null,
    rainfall: data.daily?.rain_sum?.[0] ?? null,
    windSpeed: data.current?.wind_speed_10m ?? null,
    weatherCode: data.current?.weather_code ?? data.daily?.weather_code?.[0] ?? null,
    source: 'Open-Meteo live search',
  };
}

export default function WeatherPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [liveReport, setLiveReport] = useState(null);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);

  function loadReports() {
    setLoading(true);
    listWeatherReports({ limit: 300 })
      .then(setReports)
      .catch((error) => toast.error(error.message || 'Weather reports failed to load.'))
      .finally(() => setLoading(false));
  }

  useEffect(loadReports, []);

  const latestDate = reports[0]?.reportDate || '';
  const latestReports = useMemo(() => reports.filter((item) => item.reportDate === latestDate), [reports, latestDate]);
  const featured = liveReport || latestReports[0];
  const gridReports = latestReports.filter((item) => item.id !== featured?.id);

  async function searchCity(event) {
    event.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setLiveReport(null);
    try {
      const params = new URLSearchParams({ name: query.trim(), count: '10', language: 'en', format: 'json' });
      const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`);
      if (!response.ok) throw new Error('City search failed.');
      const data = await response.json();
      const places = data.results || [];
      setResults(places);
      if (!places.length) toast.error('No city found. Try city + country name.');
    } catch (error) {
      toast.error(error.message || 'City search failed.');
    } finally {
      setSearching(false);
    }
  }

  async function selectPlace(place) {
    setSearching(true);
    try {
      const report = await fetchForecastForPlace(place);
      setLiveReport(report);
      setResults([]);
      toast.success(`Live weather loaded for ${cityLabel(place)}.`);
    } catch (error) {
      toast.error(error.message || 'Weather failed.');
    } finally {
      setSearching(false);
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      toast.error('Current location is not supported in this browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const report = await fetchForecastForPlace({
            name: 'Current Location',
            country: 'Detected by browser',
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLiveReport(report);
          toast.success('Current location weather loaded.');
        } catch (error) {
          toast.error(error.message || 'Location weather failed.');
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        toast.error('Location permission denied. Search your city manually.');
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  function downloadDailyReport() {
    if (!latestReports.length) return;
    const text = latestReports.map(reportText).join('\n\n-----------------------------\n\n');
    downloadText(`the-ftp-news-india-weather-${latestDate || 'today'}.txt`, text);
  }

  return (
    <main className="section-shell">
      <section className="mb-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="bg-gray-950 p-6 text-white sm:p-8">
            <p className="section-kicker text-red-200">India and Global Weather</p>
            <h1 className="mt-3 text-4xl font-black tracking-normal sm:text-5xl">Weather Report</h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-gray-300">
              Daily saved Indian city weather plus live search for any city in India or outside India.
            </p>
            {latestDate ? <p className="mt-4 text-sm font-bold text-red-200">{formatReportDate(latestDate)}</p> : null}
          </div>
          <div className="p-5 sm:p-8">
            <form onSubmit={searchCity} className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 py-3 pl-10 pr-3 text-sm font-semibold outline-none focus:border-brand-red"
                  placeholder="Search any city: Bhubaneswar, Delhi, London, Dubai..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <button className="btn-primary justify-center" disabled={searching}>
                {searching ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />} Search
              </button>
            </form>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn-secondary" onClick={useCurrentLocation} disabled={locating}>
                {locating ? <RefreshCw size={16} className="animate-spin" /> : <LocateFixed size={16} />} Current location
              </button>
              <button className="btn-secondary" onClick={loadReports}>
                <RefreshCw size={16} /> Refresh daily report
              </button>
              <button className="btn-secondary" onClick={downloadDailyReport} disabled={!latestReports.length}>
                <Download size={16} /> Download India report
              </button>
            </div>
            {results.length ? (
              <div className="mt-4 grid gap-2">
                {results.map((place) => (
                  <button
                    key={`${place.id}-${place.latitude}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left text-sm hover:border-brand-red"
                    onClick={() => selectPlace(place)}
                  >
                    <span className="flex min-w-0 items-center gap-2 font-bold"><MapPin size={16} className="shrink-0 text-brand-red" /> {cityLabel(place)}</span>
                    <Globe2 size={16} className="shrink-0 text-gray-400" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {featured ? (
        <section className="mb-8">
          <p className="section-kicker">{liveReport ? 'Live searched weather' : 'Featured daily weather'}</p>
          <div className="mt-3">
            <WeatherCard report={featured} featured />
          </div>
        </section>
      ) : null}

      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => <div key={index} className="skeleton h-64 rounded-xl" />)}
        </div>
      ) : gridReports.length ? (
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="section-kicker">Daily India Report</p>
              <h2 className="text-2xl font-extrabold text-gray-950">Saved city weather</h2>
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {gridReports.map((report) => <WeatherCard key={report.id} report={report} />)}
          </div>
        </section>
      ) : (
        <section className="news-card p-8 text-center">
          <CloudSun className="mx-auto text-brand-red" size={38} />
          <h2 className="mt-3 text-xl font-extrabold">No daily weather report yet</h2>
          <p className="mt-2 text-sm text-gray-600">Admin can generate today's report from Admin Panel, or users can search any city live above.</p>
        </section>
      )}
    </main>
  );
}
