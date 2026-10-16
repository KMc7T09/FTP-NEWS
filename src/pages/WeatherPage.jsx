import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Activity, CloudSun, Download, Droplets, Globe2, LocateFixed, MapPin, RefreshCw, Search, ThermometerSun, Wind } from 'lucide-react';
import { listWeatherReports } from '../supabase/api.js';
import useSettings from '../hooks/useSettings.js';

const WEATHER_TEXT = new Map([
  [0, 'Clear sky'],
  [1, 'Mostly clear'],
  [2, 'Partly cloudy'],
  [3, 'Overcast'],
  [45, 'Fog'],
  [48, 'Rime fog'],
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
  [71, 'Slight snowfall'],
  [73, 'Moderate snowfall'],
  [75, 'Heavy snowfall'],
  [77, 'Snow grains'],
  [80, 'Slight rain showers'],
  [81, 'Moderate rain showers'],
  [82, 'Heavy rain showers'],
  [85, 'Slight snow showers'],
  [86, 'Heavy snow showers'],
  [95, 'Thunderstorm'],
  [96, 'Thunderstorm with hail'],
  [99, 'Thunderstorm with heavy hail'],
]);

const QUICK_DISTRICTS = [
  { name: 'Bhubaneswar', region: 'Odisha', countryCode: 'IN' },
  { name: 'Cuttack', region: 'Odisha', countryCode: 'IN' },
  { name: 'Puri', region: 'Odisha', countryCode: 'IN' },
  { name: 'Ganjam', region: 'Odisha', countryCode: 'IN' },
  { name: 'Sambalpur', region: 'Odisha', countryCode: 'IN' },
  { name: 'Mayurbhanj', region: 'Odisha', countryCode: 'IN' },
  { name: 'Balasore', region: 'Odisha', countryCode: 'IN' },
  { name: 'Koraput', region: 'Odisha', countryCode: 'IN' },
  { name: 'Sundargarh', region: 'Odisha', countryCode: 'IN' },
  { name: 'Delhi', region: 'India', countryCode: 'IN' },
  { name: 'Mumbai', region: 'India', countryCode: 'IN' },
  { name: 'Kolkata', region: 'India', countryCode: 'IN' },
  { name: 'Chennai', region: 'India', countryCode: 'IN' },
  { name: 'Bengaluru', region: 'India', countryCode: 'IN' },
  { name: 'Hyderabad', region: 'India', countryCode: 'IN' },
];

function formatReportDate(value, compact = false) {
  if (!value) return 'Today';
  return new Intl.DateTimeFormat('en-IN', compact
    ? { day: 'numeric', month: 'short' }
    : { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
  ).format(new Date(`${value}T00:00:00+05:30`));
}

function observationLabel(value) {
  if (!value) return 'Date unavailable';
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  return value === today ? 'Today' : 'Past observation';
}

function cityLabel(place = {}) {
  return [place.name || place.city, place.admin2, place.admin1 || place.state, place.country].filter(Boolean).join(', ');
}

function postOfficeAreaName(value = '') {
  return String(value).replace(/\s+(?:S\.?O|B\.?O|H\.?O)\.?$/i, '').trim();
}

function weatherSummary(report) {
  if (report.summary) return report.summary;
  const label = WEATHER_TEXT.get(report.weatherCode) || 'Weather update available';
  return `${report.city}: ${label}. Max ${report.temperatureMax ?? '-'} C, min ${report.temperatureMin ?? '-'} C, rain chance ${report.precipitationProbability ?? 0}%, rainfall ${report.rainfall ?? 0} mm.`;
}

function slugify(value = 'weather') {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'weather';
}

function escapePdfText(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function normalizePlaceName(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function reportToPlace(report) {
  return {
    id: `saved-${report.id}`,
    name: report.city,
    admin1: report.state || '',
    country: report.country || 'India',
    latitude: Number(report.latitude),
    longitude: Number(report.longitude),
  };
}

async function geocodePlaces(name, countryCode = '') {
  const params = new URLSearchParams({ name, count: '12', language: 'en', format: 'json' });
  if (countryCode) params.set('countryCode', countryCode);
  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`);
  if (!response.ok) throw new Error('City or district search failed.');
  const data = await response.json();
  return data.results || [];
}

async function geocodeIndianPin(pinCode) {
  try {
    const response = await fetch(`https://api.pincodeapi.in/api/v1/pincode/${pinCode}`);
    if (response.ok) {
      const payload = await response.json();
      const offices = payload?.success ? (payload.data?.post_offices || []) : [];
      const areaPlaces = offices
        .filter((office) => office.office_name && office.district && office.state
          && office.latitude != null && office.longitude != null)
        .map((office) => ({
          id: `pin-${pinCode}-${office.id || office.office_slug || office.office_name}`,
          name: postOfficeAreaName(office.office_name),
          admin1: office.state,
          admin2: office.district,
          country: 'India',
          latitude: Number(office.latitude),
          longitude: Number(office.longitude),
          pinCode,
          officeType: office.office_type || '',
        }))
        .filter((place) => Number.isFinite(place.latitude) && Number.isFinite(place.longitude)
          && Math.abs(place.latitude) <= 90 && Math.abs(place.longitude) <= 180)
        .sort((a, b) => Number(/(?:HO|SO)/i.test(b.officeType)) - Number(/(?:HO|SO)/i.test(a.officeType)));
      if (areaPlaces.length) return areaPlaces;
    }
  } catch {
    // Fall back to the older postal lookup and geocoder if the coordinate dataset is unavailable.
  }

  let offices = [];
  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${pinCode}`);
    if (response.ok) {
      const data = await response.json();
      offices = data?.[0]?.Status === 'Success' ? (data[0].PostOffice || []) : [];
    }
  } catch {
    // Fall through to Open-Meteo's postal-code search if the postal lookup is unavailable.
  }

  const areaOffices = [...new Map(offices
    .filter((office) => office.Name && office.District && office.State)
    .map((office) => [`${office.Name}|${office.District}|${office.State}`, office]))
    .values()].slice(0, 3);
  const areaResults = await Promise.all(areaOffices.map(async (office) => {
    try {
      const matches = await geocodePlaces(`${office.Name}, ${office.District}, ${office.State}`, 'IN');
      const areaName = normalizePlaceName(office.Name);
      const districtName = normalizePlaceName(office.District);
      const match = matches.find((place) => {
        const resultName = normalizePlaceName(place.name);
        return resultName === areaName || resultName.startsWith(`${areaName} `)
          || (resultName !== districtName && resultName !== normalizePlaceName(office.State));
      });
      if (!match) return null;
      return {
        ...match,
        name: office.Name,
        admin1: office.State,
        admin2: office.District,
        country: 'India',
        pinCode,
      };
    } catch {
      return null;
    }
  }));
  const places = areaResults.filter(Boolean);
  if (places.length) return places;

  try {
    const directMatches = await geocodePlaces(pinCode, 'IN');
    if (directMatches.length) return directMatches.map((place) => ({ ...place, pinCode }));
  } catch {
    // Continue to district-level resolution below.
  }

  const districtNames = [...new Map(areaOffices.map((office) => [`${office.District}|${office.State}`, office]))
    .values()];
  const districtResults = await Promise.all(districtNames.map(async (office) => {
    try {
      return (await geocodePlaces(`${office.District}, ${office.State}`, 'IN')).map((place) => ({
        ...place,
        admin2: office.District,
        pinCode,
      }));
    } catch {
      return [];
    }
  }));
  return districtResults.flat();
}

function openPdfReport({ title, subtitle, reports, locationNote = '', logoURL = '' }) {
  const rows = reports.map((report) => `
    <tr>
      <td>${escapePdfText(formatReportDate(report.reportDate, true))}</td>
      <td><strong>${escapePdfText(report.city)}</strong></td>
      <td>${escapePdfText([report.district, report.state].filter(Boolean).join(', ') || '-')}</td>
      <td>${escapePdfText(WEATHER_TEXT.get(Number(report.weatherCode)) || 'Not available')}</td>
      <td>${escapePdfText(report.temperatureMax ?? '-')}°</td>
      <td>${escapePdfText(report.temperatureMin ?? '-')}°</td>
      <td>${escapePdfText(report.precipitationProbability ?? 0)}%</td>
      <td>${escapePdfText(report.rainfall ?? 0)} mm</td>
      <td>${escapePdfText(report.windSpeed ?? '-')} km/h</td>
    </tr>
  `).join('');

  const summary = reports[0] ? escapePdfText(weatherSummary(reports[0])) : '';
  const generatedAt = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date());
  const fallbackLogo = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160" rx="18" fill="#101820"/><path d="M0 132h160v28H0z" fill="#d71920"/><text x="80" y="105" text-anchor="middle" font-family="Georgia,serif" font-size="74" font-weight="700" fill="#fff">FTP</text></svg>')}`;
  const logoSource = escapePdfText(logoURL || new URL('/ftp-news-logo.png', window.location.href).href);
  const win = window.open('', '_blank');
  if (!win) {
    toast.error('Popup blocked. Allow popups to download PDF.');
    return;
  }
  win.opener = null;
  win.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapePdfText(title)} | FTP Weather</title>
        <style>
          @page { size: landscape; margin: 14mm; }
          * { box-sizing: border-box; }
          body { position:relative; isolation:isolate; font-family: Arial, sans-serif; color: #15202b; margin: 0; background: #fff; }
          .pdf-watermark { position:fixed; inset:0; z-index:0; display:grid; place-items:center; pointer-events:none; }
          .pdf-watermark img { display:block; width:min(58vw, 470px); height:min(62vh, 470px); object-fit:contain; opacity:.055; }
          body > :not(.pdf-watermark) { position:relative; z-index:1; }
          .masthead { display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid #d9dee5; padding:0 0 14px; }
          .brand { display:flex; align-items:center; }
          .mark { display:block; width:164px; height:100px; object-fit:cover; object-position:center; }
          .edition { color:#64748b; font-size:10px; text-align:right; line-height:1.7; }
          .heading { margin:24px 0 18px; }
          .kicker { color:#c51c25; font-size:10px; font-weight:800; letter-spacing:2px; text-transform:uppercase; }
          h1 { font-family:Georgia,serif; font-size:32px; margin:6px 0; }
          h2 { font-size:14px; font-weight:500; margin:0; color:#52606d; }
          .location { margin-top:8px; color:#52606d; font-size:11px; }
          .meta { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin:20px 0; }
          .box { border:1px solid #d9dee5; border-top:3px solid #d71920; padding:12px 14px; background:#f7f8fa; }
          .box span { color:#64748b; font-size:9px; font-weight:800; letter-spacing:1px; text-transform:uppercase; }
          .box strong { display:block; font-family:Georgia,serif; font-size:23px; margin-top:5px; }
          .summary { border-left:4px solid #d71920; padding:11px 14px; background:#f8f3f3; margin:18px 0; font-size:11px; line-height:1.6; }
          .table-heading { margin:22px 0 8px; font-family:Georgia,serif; font-size:17px; }
          table { width:100%; border-collapse:collapse; margin-top:8px; font-size:10px; }
          th { background:#101820; color:white; text-align:left; text-transform:uppercase; letter-spacing:.4px; font-size:9px; }
          th, td { border:1px solid #d9dee5; padding:8px; }
          tr:nth-child(even) td { background:#f6f7f9; }
          footer { display:flex; justify-content:space-between; gap:20px; margin-top:24px; padding-top:10px; border-top:1px solid #d9dee5; font-size:9px; color:#64748b; }
          @media print { body { print-color-adjust:exact; -webkit-print-color-adjust:exact; } .pdf-watermark { position:fixed; } tr { break-inside:avoid; } }
        </style>
      </head>
      <body>
        <div class="pdf-watermark" aria-hidden="true"><img src="${logoSource}" alt="" onerror="this.onerror=null;this.src='${fallbackLogo}'" /></div>
        <header class="masthead">
          <div class="brand"><img class="mark" src="${logoSource}" alt="FTP Fresh Take Politics logo" onerror="this.onerror=null;this.src='${fallbackLogo}'" /></div>
          <div class="edition">WEATHER DESK<br/>Generated ${escapePdfText(generatedAt)}</div>
        </header>
        <section class="heading">
          <div class="kicker">Official weather brief</div>
          <h1>${escapePdfText(title)}</h1>
          <h2>${escapePdfText(subtitle)}</h2>
          ${locationNote ? `<p class="location">${escapePdfText(locationNote)}</p>` : ''}
        </section>
        <section class="meta">
          <div class="box"><span>Current temperature</span><strong>${escapePdfText(reports[0]?.temperatureCurrent ?? reports[0]?.temperatureMax ?? '-')}° C</strong></div>
          <div class="box"><span>Rain probability</span><strong>${escapePdfText(reports[0]?.precipitationProbability ?? 0)}%</strong></div>
          <div class="box"><span>Wind speed</span><strong>${escapePdfText(reports[0]?.windSpeed ?? '-')} km/h</strong></div>
        </section>
        <section class="summary">${summary}</section>
        <h3 class="table-heading">Daily observations</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Area</th><th>District / State</th><th>Conditions</th><th>High C</th><th>Low C</th><th>Rain chance</th><th>Rainfall</th><th>Wind max</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <footer>
          <span>Source: Open-Meteo weather data. Location names and browser-detected PIN codes may be approximate.</span>
          <strong>THE FTP NEWS · FRESH TAKE POLITICS</strong>
        </footer>
        <script>window.onload = () => setTimeout(() => window.print(), 250);</script>
      </body>
    </html>
  `);
  win.document.close();
}

function WeatherCard({ report, featured = false, history = [], logoURL = '' }) {
  const trend = history.length ? history : [report];
  return (
    <article className={`overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm ${featured ? 'lg:grid lg:grid-cols-[0.85fr_1.15fr]' : ''}`}>
      <div className="border-l-4 border-brand-red bg-gray-950 p-5 text-white sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-red-200">{[report.district, report.state || report.country].filter(Boolean).join(' · ') || 'Weather'}</p>
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
              logoURL,
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
              <div className="grid auto-cols-[minmax(92px,1fr)] grid-flow-col gap-2 overflow-x-auto pb-1">
                {trend.slice(0, 5).map((item) => (
                  <div key={`${item.reportDate}-${item.city}`} className="min-w-0 rounded-md bg-gray-50 p-2 text-center">
                    <p className="text-[11px] font-bold text-gray-500">{formatReportDate(item.reportDate, true)}</p>
                    <p className="mt-1 text-[9px] font-extrabold uppercase tracking-wide text-gray-400">{observationLabel(item.reportDate)}</p>
                    <p className="mt-1 text-sm font-black">{item.temperatureMax ?? '-'}°</p>
                    <p className="text-[10px] font-semibold leading-4 text-gray-600">{WEATHER_TEXT.get(Number(item.weatherCode)) || 'Condition unavailable'}</p>
                    <p className="mt-1 text-[11px] text-blue-700">{item.rainfall ?? 0} mm rain</p>
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
  const latitude = Number(place.latitude);
  const longitude = Number(place.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('This search result has no usable map coordinates. Try another matching location.');
  }
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,weather_code,wind_speed_10m',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,rain_sum,weather_code,wind_speed_10m_max',
    timezone: 'auto',
    past_days: '5',
    forecast_days: '6',
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!response.ok) throw new Error('Weather service is busy. Try again.');
  const data = await response.json();
  const days = data.daily?.time || [];
  const mapDay = (date, index) => ({
    id: `live-${place.latitude}-${place.longitude}-${date}`,
    reportDate: date,
    city: place.name || place.city || 'Current Location',
    state: place.admin1 || place.state || '',
    district: place.admin2 || place.district || '',
    country: place.country || '',
    pinCode: place.pinCode || '',
    latitude: place.latitude,
    longitude: place.longitude,
    temperatureMax: data.daily?.temperature_2m_max?.[index] ?? null,
    temperatureMin: data.daily?.temperature_2m_min?.[index] ?? null,
    temperatureCurrent: date === data.current?.time?.slice(0, 10) ? data.current?.temperature_2m ?? null : null,
    precipitationProbability: data.daily?.precipitation_probability_max?.[index] ?? null,
    rainfall: data.daily?.rain_sum?.[index] ?? null,
    windSpeed: data.daily?.wind_speed_10m_max?.[index] ?? (date === data.current?.time?.slice(0, 10) ? data.current?.wind_speed_10m ?? null : null),
    weatherCode: date === data.current?.time?.slice(0, 10) ? data.current?.weather_code ?? data.daily?.weather_code?.[index] ?? null : data.daily?.weather_code?.[index] ?? null,
    source: 'Open-Meteo live search',
  });
  const today = data.current?.time?.slice(0, 10) || new Intl.DateTimeFormat('en-CA', { timeZone: data.timezone || 'Asia/Kolkata' }).format(new Date());
  const todayIndex = Math.max(0, days.findIndex((date) => date === today));
  const report = mapDay(days[todayIndex], todayIndex);
  const history = days.slice(0, todayIndex).map(mapDay).reverse();
  const forecast = days.slice(todayIndex + 1, todayIndex + 6).map((date, offset) => mapDay(date, todayIndex + offset + 1));
  return { report, history, forecast };
}

export default function WeatherPage() {
  const settings = useSettings();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [liveReport, setLiveReport] = useState(null);
  const [liveHistory, setLiveHistory] = useState([]);
  const [liveForecast, setLiveForecast] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  function loadReports() {
    setHasSearched(false);
    setLiveReport(null);
    setLiveHistory([]);
    setLiveForecast([]);
    setLoading(true);
    listWeatherReports({ limit: 10000 })
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
  const featured = liveReport || (!hasSearched ? latestReports[0] : null);
  const featuredHistory = liveReport ? liveHistory : fiveDaySaved.filter((item) => item.city === featured?.city).slice(0, 5);
  const gridReports = hasSearched ? [] : latestReports.filter((item) => item.id !== featured?.id);

  async function searchCity(event, forcedQuery = '') {
    event?.preventDefault?.();
    const term = forcedQuery || query.trim();
    if (!term) return;
    setHasSearched(true);
    setSearching(true);
    setLiveReport(null);
    setLiveHistory([]);
    setResults([]);
    const normalizedTerm = normalizePlaceName(term);
    const savedMatches = reports
      .filter((report) => report.latitude != null && report.longitude != null
        && Number.isFinite(Number(report.latitude)) && Number.isFinite(Number(report.longitude)))
      .filter((report) => {
        const placeName = normalizePlaceName(`${report.city} ${report.state || ''} ${report.country || ''}`);
        return placeName.includes(normalizedTerm) || normalizedTerm.split(' ').every((word) => placeName.includes(word));
      })
      .map(reportToPlace);
    try {
      let places = [];
      try {
        places = /^\d{6}$/.test(term)
          ? await geocodeIndianPin(term)
          : await geocodePlaces(term);
      } catch (error) {
        if (!savedMatches.length) throw error;
      }

      const seen = new Set();
      const combined = [...savedMatches, ...places].filter((place) => {
        const key = `${Number(place.latitude).toFixed(3)}:${Number(place.longitude).toFixed(3)}`;
        if (!Number.isFinite(Number(place.latitude)) || !Number.isFinite(Number(place.longitude)) || seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 12);
      setResults(combined);
      if (!combined.length) toast.error(/^\d{6}$/.test(term)
        ? 'No place found for this PIN code. Check the six digits and try again.'
        : 'No matching place found. Try a city name, or district + state, such as Puri Odisha.');
    } catch (error) {
      toast.error(savedMatches.length ? 'Could not search right now. Choose a saved location below.' : error.message || 'City search failed.');
      setResults(savedMatches);
    } finally {
      setSearching(false);
    }
  }

  async function loadPlace(place) {
    setSearching(true);
    try {
      const { report, history, forecast } = await fetchForecastForPlace(place);
      setLiveReport(report);
      setLiveHistory(history);
      setLiveForecast(forecast);
      setQuery(cityLabel(place));
      setResults([]);
      toast.success(`Live 5-day weather loaded for ${cityLabel(place)}.`);
    } catch (error) {
      toast.error(error.message || 'Weather failed.');
    } finally {
      setSearching(false);
    }
  }

  async function selectPlace(place) {
    if (searching) return;
    setHasSearched(true);
    await loadPlace(place);
  }

  async function selectPopularLocation(location) {
    if (searching) return;
    const label = `${location.name}, ${location.region}`;
    setQuery(label);
    setHasSearched(true);
    setLiveReport(null);
    setLiveHistory([]);
    setLiveForecast([]);
    setResults([]);
    setSearching(true);
    try {
      const places = await geocodePlaces(location.name, location.countryCode);
      const expectedRegion = normalizePlaceName(location.region);
      const match = places.find((place) => normalizePlaceName(place.name) === normalizePlaceName(location.name)
        && (location.region === 'India' || normalizePlaceName(place.admin1 || place.admin2 || '') === expectedRegion));
      if (!match) throw new Error(`Couldn't find ${label}. Use the search field to choose a matching place.`);
      const { report, history, forecast } = await fetchForecastForPlace(match);
      setLiveReport({
        ...report,
        city: location.name,
        state: location.region === 'India' ? (report.state || '') : location.region,
      });
      setLiveHistory(history.map((item) => ({
        ...item,
        city: location.name,
        state: location.region === 'India' ? (item.state || '') : location.region,
      })));
      setLiveForecast(forecast.map((item) => ({
        ...item,
        city: location.name,
        state: location.region === 'India' ? (item.state || '') : location.region,
      })));
      toast.success(`Weather loaded for ${label}.`);
    } catch (error) {
      toast.error(error.message || `Weather search failed for ${label}.`);
    } finally {
      setSearching(false);
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      toast.error('Current location is not supported in this browser.');
      return;
    }
    setHasSearched(true);
    setLiveReport(null);
    setLiveHistory([]);
    setLiveForecast([]);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          const place = await reverseLocation(latitude, longitude).catch(() => null);
          const { report, history, forecast } = await fetchForecastForPlace({
            name: place?.name || 'Current Location',
            state: place?.state || '',
            country: place?.country || 'Detected by browser',
            pinCode: place?.pinCode || '',
            latitude,
            longitude,
          });
          setLiveReport(report);
          setLiveHistory(history);
          setLiveForecast(forecast);
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
      logoURL: settings.logoURL,
    });
  }

  return (
    <main className="bg-[#f5f6f7] py-6 sm:py-8">
      <div className="container-page">
      <section className="mb-8 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="border-b-4 border-brand-red bg-gray-950 p-6 text-white sm:p-8 lg:border-b-0 lg:border-r-4">
            <p className="section-kicker text-red-200">All India District Weather</p>
            <h1 className="mt-3 font-serif text-4xl font-black tracking-normal sm:text-5xl">India Weather, Made Simple</h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-gray-200">
              Search a city or district for current conditions, a five-day forecast, and recent saved observations.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-md bg-white/10 p-3">
                <p className="text-xs text-gray-300">Saved today</p>
                <p className="mt-1 text-2xl font-black">{latestReports.length}</p>
              </div>
              <div className="rounded-md bg-white/10 p-3">
                <p className="text-xs text-gray-300">History window</p>
                <p className="mt-1 text-2xl font-black">5 days</p>
              </div>
              <div className="rounded-md bg-white/10 p-3">
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
                  className="w-full rounded-lg border border-gray-200 bg-white py-3 pl-10 pr-3 text-sm font-semibold outline-none transition focus:border-brand-red focus:ring-2 focus:ring-red-100"
                  placeholder="City, district, or 6-digit PIN: Puri Odisha, 751001, London"
                  aria-label="Search city or district weather"
                  autoComplete="off"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setResults([]);
                  }}
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
            <div className="mt-5">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Popular locations</p>
              <div className="mt-2 flex flex-wrap gap-2">
              {QUICK_DISTRICTS.map((item) => (
                <button key={item.name} type="button" className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 transition hover:border-brand-red hover:text-brand-red disabled:opacity-50" disabled={searching} onClick={() => selectPopularLocation(item)}>
                  {item.name}
                </button>
              ))}
              </div>
            </div>
            {results.length ? (
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3" aria-live="polite">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Choose a matching location</p>
                <div className="grid gap-2">
                {results.map((place) => (
                  <button
                    key={`${place.id || cityLabel(place)}-${place.latitude}-${place.longitude}`}
                    type="button"
                    className="flex min-h-12 items-center justify-between gap-3 rounded-md border border-gray-200 bg-white p-3 text-left text-sm transition hover:border-brand-red hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
                    disabled={searching}
                    onClick={() => selectPlace(place)}
                  >
                    <span className="flex min-w-0 items-center gap-2 font-bold"><MapPin size={16} className="shrink-0 text-brand-red" /> {cityLabel(place)}</span>
                    {searching ? <RefreshCw size={16} className="shrink-0 animate-spin text-brand-red" /> : <Globe2 size={16} className="shrink-0 text-gray-400" />}
                  </button>
                ))}
                </div>
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
              <h2 className="text-2xl font-extrabold text-gray-950">Current conditions</h2>
              <p className="mt-1 text-sm text-gray-600">Recent observations and the forecast are shown separately below.</p>
            </div>
            <Activity className="text-brand-red" />
          </div>
          <WeatherCard report={featured} featured history={featuredHistory} logoURL={settings.logoURL} />
          {liveForecast.length > 0 && (
            <section className="forecast-strip mt-6" aria-label="Five-day weather forecast">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="section-kicker">Open-Meteo forecast</p>
                  <h3 className="mt-1 text-xl font-extrabold">Next five days</h3>
                </div>
                <span className="text-xs font-semibold text-gray-500">Forecast, not past observations</span>
              </div>
              <div className="grid auto-cols-[minmax(145px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-3 sm:grid-flow-row sm:grid-cols-3 lg:grid-cols-5">
                {liveForecast.map((day) => (
                  <article key={day.reportDate} className="min-w-0 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-extrabold uppercase text-gray-500">{formatReportDate(day.reportDate, true)}</p>
                    <CloudSun className="my-4 text-brand-red" size={25} />
                    <p className="font-bold text-gray-900">{WEATHER_TEXT.get(Number(day.weatherCode)) || 'Weather update'}</p>
                    <p className="mt-2 text-lg font-black">{day.temperatureMax ?? '-'}° <span className="text-sm font-semibold text-gray-500">/ {day.temperatureMin ?? '-'}°</span></p>
                    <p className="mt-2 text-xs text-gray-600">Rain {day.precipitationProbability ?? 0}% · {day.rainfall ?? 0} mm</p>
                  </article>
                ))}
              </div>
            </section>
          )}
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
                logoURL={settings.logoURL}
              />
            ))}
          </div>
        </section>
      ) : hasSearched ? (
        <section className="news-card p-8 text-center">
          <CloudSun className="mx-auto text-brand-red" size={38} />
          <h2 className="mt-3 text-xl font-extrabold">No weather report selected</h2>
          <p className="mt-2 text-sm text-gray-600">Choose a search result or try another city or PIN code.</p>
        </section>
      ) : (
        <section className="news-card p-8 text-center">
          <CloudSun className="mx-auto text-brand-red" size={38} />
          <h2 className="mt-3 text-xl font-extrabold">No saved daily weather report yet</h2>
          <p className="mt-2 text-sm text-gray-600">Search any district live above, or run weather generation from Admin Panel.</p>
        </section>
      )}
      </div>
    </main>
  );
}
