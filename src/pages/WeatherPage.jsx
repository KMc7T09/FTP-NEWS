import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Activity, CloudSun, Download, Droplets, Globe2, LocateFixed, MapPin, RefreshCw, Search, ThermometerSun, Wind } from 'lucide-react';
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

const QUICK_DISTRICTS = [
  'Bhubaneswar Odisha',
  'Cuttack Odisha',
  'Puri Odisha',
  'Ganjam Odisha',
  'Sambalpur Odisha',
  'Mayurbhanj Odisha',
  'Balasore Odisha',
  'Koraput Odisha',
  'Sundargarh Odisha',
  'Delhi India',
  'Mumbai India',
  'Kolkata India',
  'Chennai India',
  'Bengaluru India',
  'Hyderabad India',
];

function formatReportDate(value, compact = false) {
  if (!value) return 'Today';
  return new Intl.DateTimeFormat('en-IN', compact
    ? { day: 'numeric', month: 'short' }
    : { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
  ).format(new Date(`${value}T00:00:00+05:30`));
}

function cityLabel(place = {}) {
  return [place.name || place.city, place.admin1 || place.state, place.country].filter(Boolean).join(', ');
}

function weatherSummary(report) {
  if (report.summary) return report.summary;
  const label = WEATHER_TEXT.get(report.weatherCode) || 'Weather update available';
  return `${report.city}: ${label}. Max ${report.temperatureMax ?? '-'} C, min ${report.temperatureMin ?? '-'} C, rain chance ${report.precipitationProbability ?? 0}%, rainfall ${report.rainfall ?? 0} mm.`;
}

function slugify(value = 'weather') {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'weather';
}

function openPdfReport({ title, subtitle, reports, locationNote = '' }) {
  const rows = reports.map((report) => `
    <tr>
      <td>${formatReportDate(report.reportDate, true)}</td>
      <td>${report.city}</td>
      <td>${report.state || '-'}</td>
      <td>${report.temperatureCurrent ?? '-'}</td>
      <td>${report.temperatureMax ?? '-'}</td>
      <td>${report.temperatureMin ?? '-'}</td>
      <td>${report.precipitationProbability ?? 0}%</td>
      <td>${report.rainfall ?? 0} mm</td>
      <td>${report.windSpeed ?? '-'} km/h</td>
    </tr>
  `).join('');

  const summary = reports[0] ? weatherSummary(reports[0]) : '';
  const win = window.open('', '_blank', 'noopener,noreferrer');
  if (!win) {
    toast.error('Popup blocked. Allow popups to download PDF.');
    return;
  }
  win.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          @page { margin: 18mm; }
          body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; }
          .brand { border-bottom: 4px solid #dc2626; padding-bottom: 18px; margin-bottom: 24px; }
          .kicker { color: #dc2626; font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; }
          h1 { font-family: Georgia, serif; font-size: 34px; margin: 8px 0 4px; }
          h2 { font-size: 19px; margin: 0; color: #334155; }
          .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 24px 0; }
          .box { border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; background: #f8fafc; }
          .box strong { display: block; font-size: 22px; margin-top: 6px; }
          .summary { border-left: 5px solid #dc2626; padding: 14px 16px; background: #fff1f2; margin: 22px 0; line-height: 1.6; }
          table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 12px; }
          th { background: #020617; color: white; text-align: left; }
          th, td { border: 1px solid #e5e7eb; padding: 9px; }
          tr:nth-child(even) td { background: #f8fafc; }
          footer { margin-top: 30px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #64748b; }
        </style>
      </head>
      <body>
        <section class="brand">
          <div class="kicker">THE FTP NEWS | Fresh Take Politics</div>
          <h1>${title}</h1>
          <h2>${subtitle}</h2>
          ${locationNote ? `<p>${locationNote}</p>` : ''}
        </section>
        <section class="meta">
          <div class="box">Current<strong>${reports[0]?.temperatureCurrent ?? '-'} C</strong></div>
          <div class="box">Rain chance<strong>${reports[0]?.precipitationProbability ?? 0}%</strong></div>
          <div class="box">Wind<strong>${reports[0]?.windSpeed ?? '-'} km/h</strong></div>
        </section>
        <section class="summary">${summary}</section>
        <table>
          <thead>
            <tr>
              <th>Date</th><th>City/District</th><th>State</th><th>Current C</th><th>Max C</th><th>Min C</th><th>Rain</th><th>Rainfall</th><th>Wind</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <footer>
          Source: Open-Meteo weather data. Location names may be approximate when detected by browser GPS/network. Generated by THE FTP NEWS.
        </footer>
        <script>window.onload = () => setTimeout(() => window.print(), 250);</script>
      </body>
    </html>
  `);
  win.document.close();
}

function WeatherCard({ report, featured = false, history = [] }) {
  const trend = history.length ? history : [report];
  return (
    <article className={`overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm ${featured ? 'lg:grid lg:grid-cols-[0.85fr_1.15fr]' : ''}`}>
      <div className="bg-gradient-to-br from-gray-950 via-gray-900 to-red-950 p-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-red-200">{report.state || report.country || 'Weather'}</p>
            <h2 className="mt-2 text-2xl font-extrabold">{report.city}</h2>
            {report.pinCode ? <p className="mt-1 text-xs font-bold text-red-100">PIN: {report.pinCode}</p> : null}
            <p className="mt-2 text-xs font-semibold text-gray-300">{formatReportDate(report.reportDate)}</p>
          </div>
          <CloudSun className="text-red-200" size={36} />
        </div>
        <p className="mt-6 text-5xl font-black">{report.temperatureCurrent ?? report.temperatureMax ?? '-'} C</p>
        <p className="mt-2 text-sm text-gray-200">{WEATHER_TEXT.get(report.weatherCode) || 'Weather update'}</p>
      </div>
      <div>
        <div className="grid gap-3 p-4 text-sm sm:grid-cols-2">
          <div className="rounded-xl bg-red-50 p-3">
            <div className="flex items-center gap-2 font-extrabold text-red-700"><ThermometerSun size={17} /> Temperature</div>
            <p className="mt-1 text-gray-700">Max {report.temperatureMax ?? '-'} C / Min {report.temperatureMin ?? '-'} C</p>
          </div>
          <div className="rounded-xl bg-blue-50 p-3">
            <div className="flex items-center gap-2 font-extrabold text-blue-700"><Droplets size={17} /> Rain</div>
            <p className="mt-1 text-gray-700">{report.precipitationProbability ?? 0}% chance, {report.rainfall ?? 0} mm</p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3">
            <div className="flex items-center gap-2 font-extrabold text-emerald-700"><Wind size={17} /> Wind</div>
            <p className="mt-1 text-gray-700">{report.windSpeed ?? '-'} km/h</p>
          </div>
          <button
            className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-left font-extrabold text-gray-800 hover:border-brand-red hover:text-brand-red"
            onClick={() => openPdfReport({
              title: `${report.city} Weather Report`,
              subtitle: `${report.state || report.country || 'Live weather'} | ${formatReportDate(report.reportDate)}`,
              reports: trend,
              locationNote: report.pinCode ? `Detected PIN code: ${report.pinCode}` : '',
            })}
          >
            <span className="flex items-center gap-2"><Download size={17} /> PDF report</span>
          </button>
        </div>
        <div className="border-t border-gray-100 p-4">
          <p className="text-sm leading-6 text-gray-700">{weatherSummary(report)}</p>
          {trend.length > 1 ? (
            <div className="mt-4">
              <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-gray-500">Last 5 days</p>
              <div className="grid grid-cols-5 gap-2">
                {trend.slice(0, 5).map((item) => (
                  <div key={`${item.reportDate}-${item.city}`} className="rounded-lg bg-gray-50 p-2 text-center">
                    <p className="text-[11px] font-bold text-gray-500">{formatReportDate(item.reportDate, true)}</p>
                    <p className="mt-1 text-sm font-black">{item.temperatureMax ?? '-'} C</p>
                    <p className="text-[11px] text-blue-700">{item.rainfall ?? 0} mm</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

async function reverseLocation(latitude, longitude) {
  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: String(latitude),
    lon: String(longitude),
    addressdetails: '1',
    zoom: '18',
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`);
  if (!response.ok) return null;
  const data = await response.json();
  const address = data.address || {};
  return {
    name: address.city || address.town || address.village || address.suburb || address.county || 'Current Location',
    state: address.state || '',
    country: address.country || '',
    pinCode: address.postcode || '',
  };
}

async function fetchForecastForPlace(place) {
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: 'temperature_2m,weather_code,wind_speed_10m',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,rain_sum,weather_code',
    timezone: 'auto',
    past_days: '5',
    forecast_days: '1',
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!response.ok) throw new Error('Weather service is busy. Try again.');
  const data = await response.json();
  const days = data.daily?.time || [];
  const history = days.map((date, index) => ({
    id: `live-${place.latitude}-${place.longitude}-${date}`,
    reportDate: date,
    city: place.name || place.city || 'Current Location',
    state: place.admin1 || place.state || '',
    country: place.country || '',
    pinCode: place.pinCode || '',
    latitude: place.latitude,
    longitude: place.longitude,
    temperatureMax: data.daily?.temperature_2m_max?.[index] ?? null,
    temperatureMin: data.daily?.temperature_2m_min?.[index] ?? null,
    temperatureCurrent: index === days.length - 1 ? data.current?.temperature_2m ?? null : null,
    precipitationProbability: data.daily?.precipitation_probability_max?.[index] ?? null,
    rainfall: data.daily?.rain_sum?.[index] ?? null,
    windSpeed: index === days.length - 1 ? data.current?.wind_speed_10m ?? null : null,
    weatherCode: index === days.length - 1 ? data.current?.weather_code ?? data.daily?.weather_code?.[index] ?? null : data.daily?.weather_code?.[index] ?? null,
    source: 'Open-Meteo live search',
  })).reverse();
  return { report: history[0], history };
}

export default function WeatherPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [liveReport, setLiveReport] = useState(null);
  const [liveHistory, setLiveHistory] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);

  function loadReports() {
    setLoading(true);
    listWeatherReports({ limit: 500 })
      .then(setReports)
      .catch((error) => toast.error(error.message || 'Weather reports failed to load.'))
      .finally(() => setLoading(false));
  }

  useEffect(loadReports, []);

  const latestDate = reports[0]?.reportDate || '';
  const latestReports = useMemo(() => reports.filter((item) => item.reportDate === latestDate), [reports, latestDate]);
  const fiveDaySaved = useMemo(() => {
    const dates = [...new Set(reports.map((item) => item.reportDate))].slice(0, 5);
    return reports.filter((item) => dates.includes(item.reportDate));
  }, [reports]);
  const featured = liveReport || latestReports[0];
  const featuredHistory = liveReport ? liveHistory : fiveDaySaved.filter((item) => item.city === featured?.city).slice(0, 5);
  const gridReports = latestReports.filter((item) => item.id !== featured?.id);

  async function searchCity(event, forcedQuery = '') {
    event?.preventDefault?.();
    const term = forcedQuery || query.trim();
    if (!term) return;
    setSearching(true);
    setLiveReport(null);
    setLiveHistory([]);
    try {
      const params = new URLSearchParams({ name: term, count: '12', language: 'en', format: 'json' });
      const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`);
      if (!response.ok) throw new Error('City or district search failed.');
      const data = await response.json();
      const places = data.results || [];
      setResults(places);
      if (!places.length) toast.error('No city/district found. Try district + state, for example: Puri Odisha.');
    } catch (error) {
      toast.error(error.message || 'City search failed.');
    } finally {
      setSearching(false);
    }
  }

  async function selectPlace(place) {
    setSearching(true);
    try {
      const { report, history } = await fetchForecastForPlace(place);
      setLiveReport(report);
      setLiveHistory(history);
      setResults([]);
      toast.success(`Live 5-day weather loaded for ${cityLabel(place)}.`);
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
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          const place = await reverseLocation(latitude, longitude).catch(() => null);
          const { report, history } = await fetchForecastForPlace({
            name: place?.name || 'Current Location',
            state: place?.state || '',
            country: place?.country || 'Detected by browser',
            pinCode: place?.pinCode || '',
            latitude,
            longitude,
          });
          setLiveReport(report);
          setLiveHistory(history);
          toast.success(place?.pinCode ? `Location weather loaded. PIN: ${place.pinCode}` : 'Current location weather loaded.');
        } catch (error) {
          toast.error(error.message || 'Location weather failed.');
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        toast.error('Location permission denied. Search your district manually.');
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  function downloadDailyReport() {
    if (!latestReports.length) return;
    openPdfReport({
      title: 'India Daily Weather Report',
      subtitle: `${formatReportDate(latestDate)} | ${latestReports.length} saved city/district reports`,
      reports: latestReports,
    });
  }

  return (
    <main className="section-shell bg-gradient-to-b from-white via-slate-50 to-white">
      <section className="mb-8 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl shadow-gray-200/70">
        <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="bg-[radial-gradient(circle_at_top_left,#dc2626,transparent_32%),linear-gradient(135deg,#020617,#111827_55%,#450a0a)] p-6 text-white sm:p-8">
            <p className="section-kicker text-red-200">All India District Weather</p>
            <h1 className="mt-3 text-4xl font-black tracking-normal sm:text-5xl">Weather Intelligence</h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-gray-200">
              Search any Indian district, any city, or an international place. See current weather, PIN-aware location weather, and the last 5 days trend.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/10 p-3">
                <p className="text-xs text-gray-300">Saved today</p>
                <p className="mt-1 text-2xl font-black">{latestReports.length}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-3">
                <p className="text-xs text-gray-300">History window</p>
                <p className="mt-1 text-2xl font-black">5 days</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-3">
                <p className="text-xs text-gray-300">PDF export</p>
                <p className="mt-1 text-2xl font-black">FTP</p>
              </div>
            </div>
          </div>
          <div className="p-5 sm:p-8">
            <form onSubmit={searchCity} className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-3 text-sm font-semibold outline-none focus:border-brand-red"
                  placeholder="Search district/city: Ganjam Odisha, Jaipur, London..."
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
                {locating ? <RefreshCw size={16} className="animate-spin" /> : <LocateFixed size={16} />} Current location + PIN
              </button>
              <button className="btn-secondary" onClick={loadReports}>
                <RefreshCw size={16} /> Refresh
              </button>
              <button className="btn-secondary" onClick={downloadDailyReport} disabled={!latestReports.length}>
                <Download size={16} /> PDF India report
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {QUICK_DISTRICTS.map((item) => (
                <button key={item} className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-bold hover:border-brand-red hover:text-brand-red" onClick={() => searchCity(null, item)}>
                  {item}
                </button>
              ))}
            </div>
            {results.length ? (
              <div className="mt-4 grid gap-2">
                {results.map((place) => (
                  <button
                    key={`${place.id}-${place.latitude}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left text-sm hover:border-brand-red"
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
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="section-kicker">{liveReport ? 'Live searched report' : 'Featured saved report'}</p>
              <h2 className="text-2xl font-extrabold text-gray-950">Current + last 5 days</h2>
            </div>
            <Activity className="text-brand-red" />
          </div>
          <WeatherCard report={featured} featured history={featuredHistory} />
        </section>
      ) : null}

      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => <div key={index} className="skeleton h-64 rounded-2xl" />)}
        </div>
      ) : gridReports.length ? (
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="section-kicker">Daily India Report</p>
              <h2 className="text-2xl font-extrabold text-gray-950">Saved district/city weather</h2>
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {gridReports.map((report) => (
              <WeatherCard
                key={report.id}
                report={report}
                history={fiveDaySaved.filter((item) => item.city === report.city).slice(0, 5)}
              />
            ))}
          </div>
        </section>
      ) : (
        <section className="news-card p-8 text-center">
          <CloudSun className="mx-auto text-brand-red" size={38} />
          <h2 className="mt-3 text-xl font-extrabold">No saved daily weather report yet</h2>
          <p className="mt-2 text-sm text-gray-600">Search any district live above, or run weather generation from Admin Panel.</p>
        </section>
      )}
    </main>
  );
}
