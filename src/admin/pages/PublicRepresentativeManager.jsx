import { useEffect, useState } from 'react';
import { Archive, Check, Pencil, Plus, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext.jsx';
import { listAdminPublicRepresentatives, listAdminPublicReportSources, saveAdminPublicRepresentative, updateAdminPublicRepresentativeStatus } from '../../supabase/api.js';

const blank = { slug: '', full_name: '', office_title: '', constituency: '', state_or_ut: '', party: '', party_as_of: '', term_start: '', term_end: '', summary: '', election_results: '', asset_disclosure: '', attendance_participation: '', documented_public_work: '', source_id: '', source_url: '' };
const fields = [['office_title','Office / position'], ['constituency','Constituency'], ['state_or_ut','State / UT'], ['party','Party (as of date below)'], ['party_as_of','Party as-of date','date'], ['term_start','Term start','date'], ['term_end','Term end','date'], ['source_url','Official source URL','url']];

function slugify(value) { return String(value).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

export default function PublicRepresentativeManager() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState([]);
  const [sources, setSources] = useState([]);
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); setError('');
    try { const [items, publishers] = await Promise.all([listAdminPublicRepresentatives(), listAdminPublicReportSources()]); setRows(items); setSources(publishers); }
    catch (cause) { setError(cause.message || 'Representative manager could not load.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function submit(event) {
    event.preventDefault(); setSaving(true);
    try { await saveAdminPublicRepresentative({ ...form, slug: form.slug || slugify(form.full_name) }, editId); toast.success(editId ? 'Profile saved. It returned to unverified draft.' : 'Profile saved as an unverified draft.'); setForm(blank); setEditId(''); await load(); }
    catch (cause) { toast.error(cause.message || 'Profile could not be saved.'); }
    finally { setSaving(false); }
  }

  function edit(item) { setEditId(item.id); setForm(Object.fromEntries(Object.keys(blank).map((key) => [key, item[key] || '']))); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  async function status(item, updates, message) { try { await updateAdminPublicRepresentativeStatus(item.id, updates); toast.success(message); await load(); } catch (cause) { toast.error(cause.message || 'Status update failed.'); } }

  if (!isAdmin) return <div className="public-data-feedback"><strong>Admin permission required</strong></div>;
  return <section className="public-report-admin"><div className="mb-5 flex items-end justify-between gap-4"><div><p className="section-kicker">PUBLIC DATA DESK</p><h1 className="mt-1 text-2xl font-extrabold">Representatives</h1><p className="mt-1 text-sm text-gray-600">Enter only source-backed public-interest information. New or edited profiles require fresh review.</p></div><button className="btn-secondary" type="button" onClick={load} disabled={loading}><RefreshCw size={16} /> Refresh</button></div>
    {error && <div className="public-data-feedback public-data-feedback-error mb-4" role="alert"><strong>Manager unavailable</strong><span>{error}</span><span>Apply <code>supabase/public-representatives.sql</code> after Public Reports integrity migration.</span></div>}
    <form className="public-report-resource-form" onSubmit={submit}><h2><Plus size={17} /> {editId ? 'Edit profile' : 'New profile'}</h2>
      <label className="public-report-field"><span>Full name *</span><input className="input" required value={form.full_name} onChange={(event) => setForm((old) => ({ ...old, full_name: event.target.value, slug: old.slug ? old.slug : slugify(event.target.value) }))} /></label>
      <label className="public-report-field"><span>Slug *</span><input className="input" required value={form.slug} onChange={(event) => setForm((old) => ({ ...old, slug: slugify(event.target.value) }))} /></label>
      <div className="grid gap-3 sm:grid-cols-2">{fields.map(([key, label, type = 'text']) => <label className="public-report-field" key={key}><span>{label}{key === 'source_url' ? ' *' : ''}</span><input className="input" type={type} required={key === 'source_url'} value={form[key]} onChange={(event) => setForm((old) => ({ ...old, [key]: event.target.value }))} /></label>)}</div>
      <label className="public-report-field"><span>Publisher *</span><select className="input" required value={form.source_id} onChange={(event) => setForm((old) => ({ ...old, source_id: event.target.value }))}><option value="">Select registered publisher</option>{sources.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><span className="text-xs text-gray-500">Register publishers under Admin → Public Reports → Publishers &amp; Sources.</span></label>
      {[['summary','Profile summary'], ['election_results','Election results (with period)'], ['asset_disclosure','Declared assets (cite affidavit/year)'], ['attendance_participation','Attendance / participation (cite period)'], ['documented_public_work','Documented public work']].map(([key, label]) => <label className="public-report-field" key={key}><span>{label}</span><textarea className="input min-h-20" value={form[key]} onChange={(event) => setForm((old) => ({ ...old, [key]: event.target.value }))} /></label>)}
      <div className="flex gap-2"><button className="btn-primary" disabled={saving || !sources.length}><Check size={15} /> Save as draft</button>{editId && <button type="button" className="btn-secondary" onClick={() => { setForm(blank); setEditId(''); }}>Cancel edit</button>}</div>
    </form>
    <div className="mt-7">{loading ? <div className="public-data-feedback" role="status">Loading profiles…</div> : rows.length === 0 ? <div className="public-data-feedback"><strong>No representative profiles yet</strong><span>Register a publisher, then add and verify a profile with its official evidence.</span></div> : <div className="public-report-admin-list">{rows.map((item) => <article className="public-report-admin-row" key={item.id}><div><h3>{item.full_name} · {item.office_title || 'Public representative'}</h3><p>{item.constituency}{item.state_or_ut ? `, ${item.state_or_ut}` : ''} · {item.source?.name}</p><p className="text-xs capitalize">{item.status} · {item.verification_status}</p></div><div className="flex flex-wrap gap-2"><button className="btn-secondary" type="button" onClick={() => edit(item)}><Pencil size={14} /> Edit</button>{item.status !== 'archived' && item.verification_status !== 'verified' && <button className="btn-secondary" type="button" onClick={() => { if (window.confirm('Confirm that each published claim, date and cited official source has been checked.')) status(item, { verification_status: 'verified' }, 'Profile verified; publish separately.'); }}><Check size={14} /> Verify</button>}{item.status !== 'published' && item.status !== 'archived' && <button className="btn-primary" type="button" disabled={item.verification_status !== 'verified'} onClick={() => status(item, { status: 'published' }, 'Profile published.')}>Publish</button>}{item.status === 'published' && <button className="btn-secondary" type="button" onClick={() => status(item, { status: 'draft' }, 'Profile unpublished.')}>Unpublish</button>}{item.status !== 'archived' && <button className="btn-secondary" type="button" onClick={() => status(item, { status: 'archived' }, 'Profile archived.')}><Archive size={14} /> Archive</button>}</div></article>)}</div>}</div>
  </section>;
}
