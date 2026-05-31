import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import AdminTable from '../components/AdminTable.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { listPageVisits } from '../../supabase/api.js';
import { formatDate } from '../../utils/format.js';

function Stat({ label, value }) {
  return (
    <div className="news-card p-5">
      <p className="text-sm font-semibold text-gray-500">{label}</p>
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

  if (!isSuperAdmin) {
    return (
      <section className="news-card p-6">
        <h1 className="text-2xl font-extrabold">Superadmin only</h1>
        <p className="mt-2 text-sm text-gray-600">Visitor analytics is visible only to the superadmin account.</p>
      </section>
    );
  }

  const columns = [
    { key: 'created_at', label: 'Time', render: (row) => formatDate(row.created_at) },
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
          <h1 className="text-2xl font-extrabold">Visitor Analytics</h1>
          <p className="mt-2 text-sm text-gray-600">Anonymous visits and joined-user visits. This does not reveal a real person unless they are logged in.</p>
        </div>
        <button className="btn-secondary" onClick={loadVisits}>Refresh</button>
      </div>
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Stat label="Recent Visits" value={stats.total} />
        <Stat label="Unique Visitors" value={stats.unique} />
        <Stat label="Joined Visits" value={stats.joined} />
        <Stat label="Article Reads" value={stats.articles} />
      </div>
      <AdminTable columns={columns} rows={visits} empty={loading ? 'Loading visits...' : 'No visits yet.'} />
    </section>
  );
}
