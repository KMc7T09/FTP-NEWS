import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import AdminTable from '../components/AdminTable.jsx';
import ConfirmButton from '../../components/common/ConfirmButton.jsx';
import { createSlug } from '../../utils/slug.js';
import { deleteCategory, listCategories, saveCategory } from '../../supabase/api.js';

export default function CategoryManager() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ id: '', name: '', description: '' });
  const [busy, setBusy] = useState(false);

  function load() {
    listCategories().then(setRows).catch((error) => toast.error(error.message));
  }

  useEffect(load, []);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await saveCategory({ ...form, slug: createSlug(form.name) });
      toast.success(form.id ? 'Category updated.' : 'Category added.');
      setForm({ id: '', name: '', description: '' });
      load();
    } catch (error) {
      toast.error(error.message || 'Category save failed.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    try {
      await deleteCategory(id);
      setRows((items) => items.filter((item) => item.id !== id));
      toast.success('Category deleted.');
    } catch (error) {
      toast.error(error.message || 'Category delete failed.');
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <form onSubmit={submit} className="news-card h-fit space-y-4 p-5">
        <h1 className="text-2xl font-extrabold">{form.id ? 'Edit Category' : 'Add Category'}</h1>
        <div>
          <label className="label">Name</label>
          <input className="input mt-2" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input mt-2 min-h-28" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </div>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Saving...' : 'Save Category'}</button>
      </form>
      <AdminTable
        rows={rows}
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'slug', label: 'Slug' },
          { key: 'description', label: 'Description' },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <div className="flex gap-2">
                <button className="btn-secondary" onClick={() => setForm({ id: row.id, name: row.name, description: row.description || '' })}>
                  Edit
                </button>
                <ConfirmButton message="Delete this category?" onConfirm={() => remove(row.id)} />
              </div>
            ),
          },
        ]}
      />
    </section>
  );
}
