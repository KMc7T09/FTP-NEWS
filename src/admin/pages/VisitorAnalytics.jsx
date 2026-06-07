import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Eye, MonitorSmartphone, RefreshCw, UserCheck, Users } from 'lucide-react';
import AdminTable from '../components/AdminTable.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { listPageVisits } from '../../supabase/api.js';
import { formatDateTime } from '../../utils/format.js';

function Stat({ label, value, icon: Icon }) {
  return (
    <div className="metric-card">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-gray-500">{label}</p>
        {Icon && <Icon size={20} className="text-brand-red" />}
      </div>
      <p className="mt-2 text-3xl font-extrabold">{value}</p>
    </div>
  );
}

export default function VisitorAnalytics() {
  const { isSuperAdmin } = useAuth();
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);

  function loadVisits() {
    setLoading(true);
    listPageVisits({ limit: 300 })
      .then(setVisits)
      .catch((error) => toast.error(error.message || 'Visitor analytics failed to load.'))
      .finally(() => setLoading(false));
  }

  useEffect(loadVisits, []);

  const stats = useMemo(() => {
    const unique = new Set(visits.map((item) => item.visitor_id)).size;
    const joined = visits.filter((item) => item.user_id).length;
    const articles = visits.filter((item) => item.path?.startsWith('/article/')).length;
    return { total: visits.length, unique, joined, articles };
  }, [visits]);

  const topPages = useMemo(() => {
    const grouped = visits.reduce((acc, item) => {
      const key = item.path || '/';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(grouped)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [visits]);

  if (!isSuperAdmin) {
    return (
      <section className="news-card p-6">
        <h1 className="text-2xl font-extrabold">Superadmin only</h1>
        <p className="mt-2 text-sm text-gray-600">Visitor analytics is visible only to the superadmin account.</p>
      </section>
    );
  }

  const columns = [
    { key: 'created_at', label: 'Date & Time', render: (row) => <span className="whitespace-nowrap font-semibold">{formatDateTime(row.created_at)}</span> },
    { key: 'path', label: 'Page', render: (row) => <span className="break-all font-semibold">{row.path}</span> },
    { key: 'visitor_id', label: 'Visitor', render: (row) => <span className="break-all text-xs">{row.visitor_id}</span> },
    { key: 'ip_address', label: 'IP Address', render: (row) => <span className="font-mono text-xs">{row.ip_address || '-'}</span> },
    { key: 'user_id', label: 'Joined User', render: (row) => (row.user_id ? <span className="text-green-700">Yes</span> : <span className="text-gray-500">No</span>) },
    { key: 'language', label: 'Lang' },
    { key: 'screen', label: 'Screen' },
    { key: 'referrer', label: 'Referrer', render: (row) => <span className="break-all text-xs">{row.referrer || '-'}</span> },
  ];

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-kicker">Superadmin Only</p>
          <h1 className="text-2xl font-extrabold">Visitor Analytics</h1>
          <p className="mt-2 text-sm text-gray-600">Anonymous visits and joined-user visits. This does not reveal a real person unless they are logged in.</p>
        </div>
        <button className="btn-secondary" onClick={loadVisits}><RefreshCw size={16} /> Refresh</button>
      </div>
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Stat label="Recent Visits" value={stats.total} icon={Eye} />
        <Stat label="Unique Visitors" value={stats.unique} icon={Users} />
        <Stat label="Joined Visits" value={stats.joined} icon={UserCheck} />
        <Stat label="Article Reads" value={stats.articles} icon={MonitorSmartphone} />
      </div>
      <div className="mb-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="dashboard-card">
          <p className="section-kicker text-red-300">Traffic Breakdown</p>
          <h2 className="mt-2 text-xl font-extrabold">Top Pages</h2>
          <div className="mt-5 space-y-3">
            {topPages.length ? topPages.map(([path, count]) => (
              <div key={path} className="grid grid-cols-[1fr_auto] gap-3 rounded-lg bg-white/10 p-3">
                <span className="min-w-0 break-all text-sm font-semibold text-gray-100">{path}</span>
                <span className="font-extrabold text-white">{count}</span>
              </div>
            )) : <p className="text-sm text-gray-300">No visits yet.</p>}
          </div>
        </div>
        <div className="soft-panel p-5">
          <p className="section-kicker">What this means</p>
          <h2 className="mt-2 text-xl font-extrabold">Growth Signals</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="font-extrabold">Reader intent</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">Article reads show which topics deserve follow-up stories.</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="font-extrabold">Joined users</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">Logged-in visits help identify active community members.</p>
            </div>
          </div>
        </div>
      </div>
      <AdminTable columns={columns} rows={visits} empty={loading ? 'Loading visits...' : 'No visits yet.'} />
    </section>
  );
}
