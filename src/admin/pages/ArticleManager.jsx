import { Edit, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
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

  function load() {
    listArticles({ limit: 100 }).then(setRows).catch((error) => toast.error(error.message));
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

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Articles</h1>
        <Link to="/admin/articles/new" className="btn-primary">
          <Plus size={16} /> Create Article
        </Link>
      </div>
      <AdminTable
        rows={rows}
        columns={[
          { key: 'title', label: 'Title' },
          { key: 'categoryName', label: 'Category' },
          { key: 'status', label: 'Status' },
          { key: 'publishedAt', label: 'Published', render: (row) => formatDate(row.publishedAt) },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <div className="flex gap-2">
                <Link to={`/admin/articles/${row.id}/edit`} className="btn-secondary">
                  <Edit size={16} /> Edit
                </Link>
                {isAdmin && <ConfirmButton message="Delete this article?" onConfirm={() => remove(row.id)} />}
              </div>
            ),
          },
        ]}
      />
    </section>
  );
}
