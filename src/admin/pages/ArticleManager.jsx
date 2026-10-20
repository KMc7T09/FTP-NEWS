import { Edit, Eye, Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import AdminTable from '../components/AdminTable.jsx';
import ConfirmButton from '../../components/common/ConfirmButton.jsx';
import { formatDate } from '../../utils/format.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { deleteArticle, listArticles } from '../../supabase/api.js';

export default function ArticleManager() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState([]);
  const [term, setTerm] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 20;

  function load() {
    setLoading(true);
    listArticles({ limit: 100 }).then(setRows).catch((error) => toast.error(error.message)).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function remove(id) {
    try {
      await deleteArticle(id);
      setRows((items) => items.filter((item) => item.id !== id));
      toast.success('Article deleted.');
    } catch (error) {
      toast.error(error.message || 'Article delete failed.');
    }
  }

  const filteredRows = useMemo(() => rows.filter((row) => {
    const matchesStatus = status === 'all' || row.status === status;
    const matchesTerm = [row.title, row.categoryName, row.authorName, row.slug]
      .join(' ').toLowerCase().includes(term.trim().toLowerCase());
    return matchesStatus && matchesTerm;
  }), [rows, status, term]);
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-kicker">Publishing Desk</p>
          <h1 className="mt-1 text-2xl font-extrabold">Articles</h1>
          <p className="mt-1 text-sm text-gray-500">Search and manage the latest 100 articles.</p>
        </div>
        <Link to="/admin/articles/new" className="btn-primary">
          <Plus size={16} /> Create Article
        </Link>
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_190px_auto] sm:items-center">
        <label className="relative block">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-10" placeholder="Search title, category, author" value={term} onChange={(event) => { setTerm(event.target.value); setPage(1); }} />
        </label>
        <select className="input" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} aria-label="Filter articles by publication status">
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
        </select>
        <span className="text-sm font-semibold text-gray-500">{filteredRows.length} result{filteredRows.length === 1 ? '' : 's'}</span>
      </div>
      <AdminTable
        rows={visibleRows}
        empty={loading ? 'Loading articles...' : 'No articles match these filters.'}
        columns={[
          { key: 'title', label: 'Title' },
          { key: 'categoryName', label: 'Category' },
          {
            key: 'status',
            label: 'Status',
            render: (row) => (
              <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide ${row.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                {row.status}
              </span>
            ),
          },
          { key: 'publishedAt', label: 'Published', render: (row) => formatDate(row.publishedAt) },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <div className="flex flex-wrap gap-2">
                {row.status === 'published' && (
                  <Link to={`/article/${row.slug}`} className="btn-secondary">
                    <Eye size={16} /> View
                  </Link>
                )}
                <Link to={`/admin/articles/${row.id}/edit`} className="btn-secondary">
                  <Edit size={16} /> Edit
                </Link>
                {isAdmin && <ConfirmButton message="Delete this article?" onConfirm={() => remove(row.id)} />}
              </div>
            ),
          },
        ]}
      />
      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <span className="text-gray-500">Page {page} of {pageCount}</span>
          <div className="flex gap-2">
            <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
            <button className="btn-secondary" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)}>Next</button>
          </div>
        </div>
      )}
    </section>
  );
}
