import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, CloudSun, Download, MapPinned, RefreshCw, TrendingUp, Zap } from 'lucide-react';
import AdminTable from '../components/AdminTable.jsx';
import { listWeatherReports } from '../../supabase/api.js';

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00+05:30`));
}

function StatCard({ label, value, note, icon: Icon, dark = false }) {
  return (
    <div className={dark ? 'rounded-2xl bg-gray-950 p-5 text-white shadow-sm' : 'rounded-2xl border border-gray-200 bg-white p-5 shadow-sm'}>
      <div className="flex items-center justify-between gap-3">
        <p className={dark ? 'text-sm font-semibold text-gray-300' : 'text-sm font-semibold text-gray-500'}>{label}</p>
        {Icon ? <Icon size={21} className={dark ? 'text-red-200' : 'text-brand-red'} /> : null}
      </div>
      <p className="mt-3 text-3xl font-black">{value}</p>
      {note ? <p className={dark ? 'mt-2 text-xs text-gray-300' : 'mt-2 text-xs text-gray-500'}>{note}</p> : null}
    </div>
  );
}

function downloadCsv(reports) {
  const header = ['date', 'city', 'state', 'country', 'current_c', 'max_c', 'min_c', 'rain_chance', 'rainfall_mm', 'wind_kmh'];
  const rows = reports.map((row) => [
    row.reportDate,
    row.city,
    row.state,
    row.country,
    row.temperatureCurrent ?? '',
    row.temperatureMax ?? '',
    row.temperatureMin ?? '',
    row.precipitationProbability ?? 0,
    row.rainfall ?? 0,
    row.windSpeed ?? '',
  ]);
  const csv = [header, ...rows].map((items) => items.map((item) => `"${String(item ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ftp-weather-export-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function WeatherManager() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [lastRun, setLastRun] = useState(null);
  const [stateFilter, setStateFilter] = useState('all');

  function loadReports() {
    setLoading(true);
    listWeatherReports({ limit: 700 })
      .then(setReports)
      .catch((error) => toast.error(error.message || 'Weather reports failed to load.'))
      .finally(() => setLoading(false));
  }

  useEffect(loadReports, []);

  async function generateToday() {
    setGenerating(true);
    try {
      let offset = 0;
      let totalSaved = 0;
      let totalLocations = 0;
      let failed = [];
      let hasMore = true;
      let batches = 0;

      while (hasMore && batches < 15) {
        const response = await fetch(`/.netlify/functions/generate-weather?offset=${offset}&limit=80`, { method: 'POST' }).catch(() => {
          throw new Error('Weather function is not reachable. Redeploy Netlify after pushing latest code.');
        });
        const text = await response.text();
        let data = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          throw new Error(`Weather function returned invalid response: ${text.slice(0, 160)}`);
        }
        if (!response.ok || data.ok === false) throw new Error(data.error || `Weather generation failed with status ${response.status}.`);

        totalSaved += Number(data.saved || 0);
        totalLocations = Number(data.totalLocations || totalLocations);
        failed = failed.concat(data.failed || []);
        hasMore = Boolean(data.hasMore);
        offset = Number(data.nextOffset || offset + 80);
        batches += 1;
        setLastRun({ ...data, saved: totalSaved, failed, totalLocations, batches });
      }

      if (hasMore) {
        toast.error(`Weather partly updated: ${totalSaved} rows saved. Click Update now again to finish remaining locations.`);
      } else {
        toast.success(`Weather report saved: ${totalSaved} rows for ${totalLocations || 'all'} locations.`);
      }
      loadReports();
    } catch (error) {
      toast.error(error.message || 'Weather generation failed.');
    } finally {
      setGenerating(false);
    }
  }

  const stats = useMemo(() => {
    const latestDate = reports[0]?.reportDate || '';
    const latestReports = reports.filter((item) => item.reportDate === latestDate);
    const dates = [...new Set(reports.map((item) => item.reportDate))].slice(0, 5);
    const states = [...new Set(reports.map((item) => item.state).filter(Boolean))].sort();
    const hottest = latestReports.reduce((max, item) => (Number(item.temperatureMax || -999) > Number(max?.temperatureMax || -999) ? item : max), latestReports[0]);
    const wettest = latestReports.reduce((max, item) => (Number(item.rainfall || 0) > Number(max?.rainfall || 0) ? item : max), latestReports[0]);
    return { latestDate, latestReports, dates, states, hottest, wettest };
  }, [reports]);

  const filteredRows = useMemo(() => {
    if (stateFilter === 'all') return reports;
    return reports.filter((item) => item.state === stateFilter);
  }, [reports, stateFilter]);

  const stateCounts = useMemo(() => {
    const latestDate = stats.latestDate;
    return stats.latestReports.reduce((acc, item) => {
      const key = item.state || 'Other';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [stats.latestDate, stats.latestReports]);

  const columns = [
    { key: 'reportDate', label: 'Date', render: (row) => <span className="whitespace-nowrap font-semibold">{formatDate(row.reportDate)}</span> },
    { key: 'city', label: 'District / City', render: (row) => <span className="font-extrabold">{row.city}</span> },
    { key: 'state', label: 'State' },
    { key: 'temperature', label: 'Temp', render: (row) => `${row.temperatureMax ?? '-'} / ${row.temperatureMin ?? '-'} C` },
    { key: 'rain', label: 'Rain', render: (row) => `${row.precipitationProbability ?? 0}% | ${row.rainfall ?? 0} mm` },
    { key: 'windSpeed', label: 'Wind', render: (row) => `${row.windSpeed ?? '-'} km/h` },
    { key: 'summary', label: 'Summary', render: (row) => <span className="block min-w-72 text-xs leading-5 text-gray-600">{row.summary}</span> },
  ];

  return (
    <section>
      <div className="mb-6 overflow-hidden rounded-3xl bg-gray-950 text-white shadow-xl">
        <div className="grid gap-0 lg:grid-cols-[1fr_auto]">
          <div className="p-6">
            <p className="section-kicker text-red-200">Weather Control</p>
            <h1 className="mt-2 text-3xl font-black">District Weather Operations</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-300">
              Monitor daily weather coverage, run manual updates, export reports, and track failed API locations.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-white/10 p-6 lg:border-l lg:border-t-0">
            <button className="btn-secondary bg-white text-gray-950 hover:bg-gray-100" onClick={loadReports}><RefreshCw size={16} /> Refresh</button>
            <button className="btn-secondary bg-white text-gray-950 hover:bg-gray-100" onClick={() => downloadCsv(filteredRows)} disabled={!filteredRows.length}><Download size={16} /> CSV</button>
            <button className="btn-primary" onClick={generateToday} disabled={generating}>
              {generating ? <RefreshCw size={16} className="animate-spin" /> : <Zap size={16} />} Update now
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <StatCard label="Latest Date" value={formatDate(stats.latestDate)} note="Newest saved report" icon={CloudSun} />
        <StatCard label="Latest Locations" value={stats.latestReports.length} note="Saved for latest day" icon={MapPinned} dark />
        <StatCard label="5-Day Rows" value={reports.filter((item) => stats.dates.includes(item.reportDate)).length} note="Available history rows" icon={TrendingUp} />
        <StatCard label="States Covered" value={Object.keys(stateCounts).length} note="Latest report spread" icon={CloudSun} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="section-kicker">Weather Highlights</p>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl bg-red-50 p-4">
              <p className="text-sm font-bold text-red-700">Hottest saved location</p>
              <p className="mt-1 text-xl font-black">{stats.hottest?.city || '-'}</p>
              <p className="text-sm text-gray-600">{stats.hottest?.temperatureMax ?? '-'} C max</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-4">
              <p className="text-sm font-bold text-blue-700">Highest rainfall</p>
              <p className="mt-1 text-xl font-black">{stats.wettest?.city || '-'}</p>
              <p className="text-sm text-gray-600">{stats.wettest?.rainfall ?? 0} mm</p>
            </div>
            {lastRun?.failed?.length ? (
              <div className="rounded-xl bg-amber-50 p-4">
                <p className="flex items-center gap-2 text-sm font-bold text-amber-700"><AlertTriangle size={16} /> Last run failed</p>
                <p className="mt-1 text-sm text-gray-700">{lastRun.failed.length} locations failed. Run again later if Open-Meteo rate-limits.</p>
                <p className="mt-2 line-clamp-3 text-xs leading-5 text-amber-800">{lastRun.failed.slice(0, 3).join(' | ')}</p>
              </div>
            ) : null}
            {lastRun?.saved ? (
              <div className="rounded-xl bg-green-50 p-4">
                <p className="text-sm font-bold text-green-700">Last update completed</p>
                <p className="mt-1 text-sm text-gray-700">{lastRun.saved} rows saved across {lastRun.batches || 1} batch run.</p>
              </div>
            ) : null}
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="section-kicker">State Coverage</p>
              <h2 className="mt-1 text-xl font-extrabold">Latest saved locations by state</h2>
            </div>
            <select className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold" value={stateFilter} onChange={(event) => setStateFilter(event.target.value)}>
              <option value="all">All states</option>
              {stats.states.map((state) => <option key={state} value={state}>{state}</option>)}
            </select>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(stateCounts).map(([state, count]) => (
              <button key={state} className="rounded-xl bg-gray-50 p-4 text-left hover:bg-red-50" onClick={() => setStateFilter(state)}>
                <p className="text-sm font-extrabold">{state}</p>
                <p className="mt-1 text-2xl font-black text-brand-red">{count}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <AdminTable columns={columns} rows={filteredRows} empty={loading ? 'Loading weather reports...' : 'No weather reports yet.'} />
    </section>
  );
}
