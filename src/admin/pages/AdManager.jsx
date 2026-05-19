import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import AdminTable from '../components/AdminTable.jsx';
import { listAds, saveAd, updateAd } from '../../supabase/api.js';

const positions = ['header', 'sidebar', 'article-middle', 'article-bottom', 'home'];

export default function AdManager() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ position: 'header', type: 'text', content: '', isActive: true });
  const [busy, setBusy] = useState(false);

  function load() {
    listAds().then(setRows).catch((error) => toast.error(error.message));
  }

  useEffect(load, []);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const saved = await saveAd(form);
      setRows((items) => [saved, ...items]);
      setForm({ position: 'header', type: 'text', content: '', isActive: true });
      toast.success('Ad slot saved.');
    } catch (error) {
      toast.error(error.message || 'Ad save failed.');
    } finally {
      setBusy(false);
    }
  }

  async function toggle(row) {
    try {
      const updated = await updateAd(row.id, { isActive: !row.isActive });
      setRows((items) => items.map((item) => (item.id === row.id ? updated : item)));
      toast.success('Ad status updated.');
    } catch (error) {
      toast.error(error.message || 'Ad update failed.');
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <form onSubmit={submit} className="news-card h-fit space-y-4 p-5">
        <h1 className="text-2xl font-extrabold">Ad Management</h1>
        <select className="input" value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })}>
          {positions.map((position) => <option key={position} value={position}>{position}</option>)}
        </select>
        <select className="input" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
          <option value="code">code</option>
          <option value="image">image</option>
          <option value="text">text</option>
        </select>
        <textarea className="input min-h-32" value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} placeholder="AdSense code, banner URL, or text" />
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /> Active
        </label>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Saving...' : 'Save Ad Slot'}</button>
      </form>
      <AdminTable
        rows={rows}
        columns={[
          { key: 'position', label: 'Position' },
          { key: 'type', label: 'Type' },
          { key: 'content', label: 'Content' },
          {
            key: 'isActive',
            label: 'Status',
            render: (row) => <button className="btn-secondary" onClick={() => toggle(row)}>{row.isActive ? 'Active' : 'Inactive'}</button>,
          },
        ]}
      />
    </section>
  );
}
