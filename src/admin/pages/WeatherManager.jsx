import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CloudSun, RefreshCw, Zap } from 'lucide-react';
import AdminTable from '../components/AdminTable.jsx';
import { listWeatherReports } from '../../supabase/api.js';

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00+05:30`));
}

export default function WeatherManager() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  function loadReports() {
    setLoading(true);
    listWeatherReports({ limit: 200 })
      .then(setReports)
      .catch((error) => toast.error(error.message || 'Weather reports failed to load.'))
      .finally(() => setLoading(false));
  }

  useEffect(loadReports, []);

  async function generateToday() {
    setGenerating(true);
    try {
      const response = await fetch('/.netlify/functions/generate-weather', { method: 'POST' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) throw new Error(data.error || 'Weather generation failed.');
      toast.success(`Weather report saved for ${data.saved || 0} cities.`);
      loadReports();
    } catch (error) {
      toast.error(error.message || 'Weather generation failed.');
    } finally {
      setGenerating(false);
    }
  }

  const stats = useMemo(() => {
    const latestDate = reports[0]?.reportDate || '';
    const latestCount = reports.filter((item) => item.reportDate === latestDate).length;
    return { total: reports.length, latestDate, latestCount };
  }, [reports]);

  const columns = [
    { key: 'reportDate', label: 'Date', render: (row) => <span className="whitespace-nowrap font-semibold">{formatDate(row.reportDate)}</span> },
    { key: 'city', label: 'City', render: (row) => <span className="font-extrabold">{row.city}</span> },
    { key: 'state', label: 'State' },
    { key: 'temperature', label: 'Temp', render: (row) => `${row.temperatureMax ?? '-'} / ${row.temperatureMin ?? '-'} °C` },
    { key: 'rain', label: 'Rain', render: (row) => `${row.precipitationProbability ?? 0}% | ${row.rainfall ?? 0} mm` },
    { key: 'windSpeed', label: 'Wind', render: (row) => `${row.windSpeed ?? '-'} km/h` },
    { key: 'summary', label: 'Summary', render: (row) => <span className="block min-w-72 text-xs leading-5 text-gray-600">{row.summary}</span> },
  ];

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-kicker">Daily Reports</p>
          <h1 className="text-2xl font-extrabold">Weather Manager</h1>
          <p className="mt-2 text-sm text-gray-600">Auto report runs daily around 6:00 AM IST. You can also generate it manually.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={loadReports}><RefreshCw size={16} /> Refresh</button>
          <button className="btn-primary" onClick={generateToday} disabled={generating}>
            {generating ? <RefreshCw size={16} className="animate-spin" /> : <Zap size={16} />} Generate Today
          </button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="metric-card">
          <p className="text-sm font-semibold text-gray-500">Latest Date</p>
          <p className="mt-2 text-2xl font-extrabold">{formatDate(stats.latestDate)}</p>
        </div>
        <div className="metric-card">
          <p className="text-sm font-semibold text-gray-500">Latest Cities</p>
          <p className="mt-2 text-3xl font-extrabold">{stats.latestCount}</p>
        </div>
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-500">Total Reports</p>
            <CloudSun className="text-brand-red" />
          </div>
          <p className="mt-2 text-3xl font-extrabold">{stats.total}</p>
        </div>
      </div>

      <AdminTable columns={columns} rows={reports} empty={loading ? 'Loading weather reports...' : 'No weather reports yet.'} />
    </section>
  );
}
