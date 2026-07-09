import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CloudSun, Droplets, RefreshCw, ThermometerSun, Wind } from 'lucide-react';
import { listWeatherReports } from '../supabase/api.js';

function formatReportDate(value) {
  if (!value) return 'Today';
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00+05:30`));
}

function WeatherCard({ report }) {
  return (
    <article className="news-card overflow-hidden">
      <div className="border-b border-gray-100 bg-gray-950 p-4 text-white">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-red-200">{report.state || report.country}</p>
        <h2 className="mt-2 text-2xl font-extrabold">{report.city}</h2>
      </div>
      <div className="grid gap-3 p-4 text-sm sm:grid-cols-2">
        <div className="rounded-md bg-red-50 p-3">
          <div className="flex items-center gap-2 font-extrabold text-red-700"><ThermometerSun size={17} /> Temperature</div>
          <p className="mt-1 text-gray-700">Max {report.temperatureMax ?? '-'}°C / Min {report.temperatureMin ?? '-'}°C</p>
        </div>
        <div className="rounded-md bg-sky-50 p-3">
          <div className="flex items-center gap-2 font-extrabold text-sky-700"><CloudSun size={17} /> Current</div>
          <p className="mt-1 text-gray-700">{report.temperatureCurrent ?? '-'}°C</p>
        </div>
        <div className="rounded-md bg-blue-50 p-3">
          <div className="flex items-center gap-2 font-extrabold text-blue-700"><Droplets size={17} /> Rain</div>
          <p className="mt-1 text-gray-700">{report.precipitationProbability ?? 0}% chance, {report.rainfall ?? 0} mm</p>
        </div>
        <div className="rounded-md bg-emerald-50 p-3">
          <div className="flex items-center gap-2 font-extrabold text-emerald-700"><Wind size={17} /> Wind</div>
          <p className="mt-1 text-gray-700">{report.windSpeed ?? '-'} km/h</p>
        </div>
      </div>
      <p className="border-t border-gray-100 p-4 text-sm leading-6 text-gray-700">{report.summary}</p>
    </article>
  );
}

export default function WeatherPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  function loadReports() {
    setLoading(true);
    listWeatherReports({ limit: 100 })
      .then(setReports)
      .catch((error) => toast.error(error.message || 'Weather reports failed to load.'))
      .finally(() => setLoading(false));
  }

  useEffect(loadReports, []);

  const latestDate = reports[0]?.reportDate || '';
  const latestReports = useMemo(() => reports.filter((item) => item.reportDate === latestDate), [reports, latestDate]);

  return (
    <main className="section-shell">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-kicker">Daily City Weather</p>
          <h1 className="mt-2 text-4xl font-extrabold text-gray-950">Weather Report</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
            Daily weather report for Odisha and major Indian cities, updated automatically every morning.
          </p>
          {latestDate ? <p className="mt-2 text-sm font-bold text-brand-red">{formatReportDate(latestDate)}</p> : null}
        </div>
        <button className="btn-secondary" onClick={loadReports}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => <div key={index} className="skeleton h-64 rounded-lg" />)}
        </div>
      ) : latestReports.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {latestReports.map((report) => <WeatherCard key={report.id} report={report} />)}
        </div>
      ) : (
        <section className="news-card p-8 text-center">
          <CloudSun className="mx-auto text-brand-red" size={38} />
          <h2 className="mt-3 text-xl font-extrabold">No weather report yet</h2>
          <p className="mt-2 text-sm text-gray-600">Admin can generate today’s report from Admin Panel → Weather.</p>
        </section>
      )}
    </main>
  );
}
