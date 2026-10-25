import { useEffect, useMemo, useState } from 'react';
import { Archive, Check, Edit3, Eye, FilePlus2, Plus, RefreshCw, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  listAdminPublicReportCategories,
  listAdminPublicReportSources,
  listAdminPublicReports,
  saveAdminPublicReport,
  saveAdminPublicReportCategory,
  saveAdminPublicReportSource,
} from '../../supabase/api.js';

const blankReport = {
  title: '', slug: '', summary: '', body: '', categoryId: '', sourceId: '', sourceURL: '', documentURL: '',
  publicationDate: '', referenceYear: '', referencePeriod: '', methodology: '', scopeNotes: '', limitations: '',
};
const blankCategory = { name: '', slug: '', description: '', isActive: true };
const blankSource = { name: '', websiteURL: '', organizationType: '', jurisdiction: '', notes: '', isActive: true };

function slugify(value = '') {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function Field({ label, children, className = '' }) {
  return <label className={`public-report-field ${className}`}><span>{label}</span>{children}</label>;
}

function ReportPreview({ report, categories, sources, onClose }) {
  const category = categories.find((item) => item.id === report.categoryId);
  const source = sources.find((item) => item.id === report.sourceId);
  return (
    <div className="public-report-preview" role="dialog" aria-modal="true" aria-labelledby="report-preview-title">
      <div className="public-report-preview-inner">
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 pb-3">
          <p className="section-kicker">UNPUBLISHED PREVIEW</p>
          <button className="btn-secondary" type="button" onClick={onClose}><X size={16} /> Close preview</button>
        </div>
        <p className="mt-6 text-xs font-extrabold uppercase text-brand-red">{category?.name || 'Category not selected'}</p>
        <h2 id="report-preview-title" className="mt-2 font-serif text-3xl font-extrabold">{report.title || 'Report title preview'}</h2>
        <p className="mt-3 text-lg leading-7 text-gray-600">{report.summary || 'Add a short report summary to preview it here.'}</p>
        <div className="mt-5 grid gap-3 border-y border-gray-200 py-4 text-sm sm:grid-cols-3">
          <p><strong className="block text-xs uppercase text-gray-500">Publisher</strong>{source?.name || 'Not selected'}</p>
          <p><strong className="block text-xs uppercase text-gray-500">Publication date</strong>{report.publicationDate || 'Not provided'}</p>
          <p><strong className="block text-xs uppercase text-gray-500">Reporting period</strong>{report.referencePeriod || report.referenceYear || 'Not specified'}</p>
        </div>
        <div className="prose-news mt-5 whitespace-pre-wrap">{report.body || 'Report overview will appear here.'}</div>
        {report.methodology && <section className="mt-8"><h3 className="text-xl font-extrabold">Methodology</h3><p className="mt-2 whitespace-pre-wrap text-gray-700">{report.methodology}</p></section>}
        {report.scopeNotes && <section className="mt-6"><h3 className="text-xl font-extrabold">Scope and coverage</h3><p className="mt-2 whitespace-pre-wrap text-gray-700">{report.scopeNotes}</p></section>}
        {report.limitations && <section className="mt-6"><h3 className="text-xl font-extrabold">Limitations</h3><p className="mt-2 whitespace-pre-wrap text-gray-700">{report.limitations}</p></section>}
        <div className="mt-8 flex flex-wrap gap-3 text-sm">
          {report.sourceURL && <a className="btn-secondary" href={report.sourceURL} target="_blank" rel="noreferrer">Original source</a>}
          {report.documentURL && <a className="btn-secondary" href={report.documentURL} target="_blank" rel="noreferrer">Source document</a>}
        </div>
      </div>
    </div>
  );
}

export default function PublicReportManager() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState('reports');
  const [reports, setReports] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [term, setTerm] = useState('');
  const [report, setReport] = useState(null);
  const [preview, setPreview] = useState(false);
  const [category, setCategory] = useState(blankCategory);
  const [source, setSource] = useState(blankSource);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [reportRows, categoryRows, sourceRows] = await Promise.all([
        listAdminPublicReports(), listAdminPublicReportCategories(), listAdminPublicReportSources(),
      ]);
      setReports(reportRows);
      setCategories(categoryRows);
      setSources(sourceRows);
    } catch (loadError) {
      setError(loadError.message || 'Public data manager could not load. Run the public-reports migration and confirm Netlify service credentials.');
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const filteredReports = useMemo(() => reports.filter((item) => [item.title, item.category?.name, item.source?.name, item.slug]
    .join(' ').toLowerCase().includes(term.trim().toLowerCase())), [reports, term]);

  async function saveReport(event) {
    event.preventDefault();
    if (!report) return;
    setSaving(true);
    try {
      const saved = await saveAdminPublicReport({
        ...report,
        slug: report.slug || slugify(report.title),
        referenceYear: report.referenceYear || null,
        verificationStatus: 'unverified',
        status: 'draft',
      }, report.id || '');
      toast.success('Draft saved. Review the source and methodology before verification.');
      setReport(null);
      await load();
      setTab('reports');
      if (!saved?.id) throw new Error('The server did not return the saved report.');
    } catch (saveError) { toast.error(saveError.message || 'Could not save report.'); }
    finally { setSaving(false); }
  }

  async function changeReportState(item, updates, success) {
    try {
      await saveAdminPublicReport(updates, item.id);
      toast.success(success);
      await load();
    } catch (stateError) { toast.error(stateError.message || 'Report status update failed.'); }
  }

  async function saveCategory(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await saveAdminPublicReportCategory({ ...category, slug: category.slug || slugify(category.name) }, category.id || '');
      toast.success('Report category saved.');
      setCategory(blankCategory);
      await load();
    } catch (saveError) { toast.error(saveError.message || 'Category save failed.'); }
    finally { setSaving(false); }
  }

  async function saveSource(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await saveAdminPublicReportSource(source, source.id || '');
      toast.success('Publisher/source saved.');
      setSource(blankSource);
      await load();
    } catch (saveError) { toast.error(saveError.message || 'Publisher/source save failed.'); }
    finally { setSaving(false); }
  }

  if (!isAdmin) return <section className="news-card p-6"><h1 className="text-xl font-extrabold">Admin permission required</h1><p className="mt-2 text-sm text-gray-600">Only active admins and superadmins may manage reports and sources.</p></section>;

  const tabs = [['reports', 'Reports'], ['categories', 'Categories'], ['sources', 'Publishers & Sources']];
  return (
    <section className="public-report-admin">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div><p className="section-kicker">PUBLIC DATA DESK</p><h1 className="mt-1 text-2xl font-extrabold">Reports Manager</h1><p className="mt-1 text-sm text-gray-600">Manage source records and review state. Publishing requires an explicit verified status.</p></div>
        <button type="button" className="btn-secondary" onClick={load} disabled={loading}><RefreshCw size={16} /> Refresh</button>
      </div>

      {error && <div className="public-data-feedback public-data-feedback-error mb-4" role="alert"><strong>Manager setup issue</strong><span>{error}</span><span>Run <code>supabase/public-reports.sql</code> in Supabase SQL Editor and ensure the existing Netlify variables <code>SUPABASE_URL</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code> are set.</span></div>}
      <div className="public-report-admin-tabs" role="tablist" aria-label="Public reports administration">
        {tabs.map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? 'is-active' : ''} onClick={() => { setTab(key); setReport(null); }}>{label}</button>)}
      </div>

      {tab === 'reports' && (report ? (
        <form className="public-report-editor" onSubmit={saveReport}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
            <div><p className="section-kicker">{report.id ? 'EDIT REPORT' : 'NEW REPORT DRAFT'}</p><h2 className="mt-1 text-xl font-extrabold">{report.title || 'Report details'}</h2></div>
            <div className="flex gap-2"><button type="button" className="btn-secondary" onClick={() => setPreview(true)}><Eye size={16} /> Preview</button><button type="button" className="btn-secondary" onClick={() => setReport(null)}>Cancel</button><button type="submit" className="btn-primary" disabled={saving}><Save size={16} /> {saving ? 'Saving…' : 'Save draft'}</button></div>
          </div>
          <div className="public-report-form-grid">
            <Field label="Report title *"><input className="input" value={report.title} onChange={(event) => setReport((old) => ({ ...old, title: event.target.value, slug: old.id || old.slug ? old.slug : slugify(event.target.value) }))} required maxLength={240} /></Field>
            <Field label="URL slug *"><input className="input" value={report.slug} onChange={(event) => setReport((old) => ({ ...old, slug: slugify(event.target.value) }))} required /></Field>
            <Field label="Category"><select className="input" value={report.categoryId} onChange={(event) => setReport((old) => ({ ...old, categoryId: event.target.value }))}><option value="">Select category</option>{categories.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
            <Field label="Publisher / source"><select className="input" value={report.sourceId} onChange={(event) => setReport((old) => ({ ...old, sourceId: event.target.value }))}><option value="">Select publisher</option>{sources.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
            <Field label="Publication date"><input className="input" type="date" value={report.publicationDate || ''} onChange={(event) => setReport((old) => ({ ...old, publicationDate: event.target.value }))} /></Field>
            <Field label="Data reference year"><input className="input" type="number" min="1000" max="9999" placeholder="Only when stated by source" value={report.referenceYear || ''} onChange={(event) => setReport((old) => ({ ...old, referenceYear: event.target.value }))} /></Field>
            <Field label="Reporting period"><input className="input" maxLength={160} placeholder="e.g. January–December 2025" value={report.referencePeriod || ''} onChange={(event) => setReport((old) => ({ ...old, referencePeriod: event.target.value }))} /></Field>
            <Field label="Original source URL" className="span-two"><input className="input" type="url" placeholder="https://..." value={report.sourceURL} onChange={(event) => setReport((old) => ({ ...old, sourceURL: event.target.value }))} /></Field>
            <Field label="Original document URL" className="span-two"><input className="input" type="url" placeholder="https://... (optional PDF/document link)" value={report.documentURL} onChange={(event) => setReport((old) => ({ ...old, documentURL: event.target.value }))} /></Field>
            <Field label="Summary" className="span-two"><textarea className="input min-h-24" value={report.summary} onChange={(event) => setReport((old) => ({ ...old, summary: event.target.value }))} maxLength={2000} /></Field>
            <Field label="Report overview" className="span-two"><textarea className="input min-h-48" value={report.body} onChange={(event) => setReport((old) => ({ ...old, body: event.target.value }))} maxLength={50000} placeholder="Write the FTP News explanation. Separate paragraphs with a blank line." /></Field>
            <Field label="Methodology" className="span-two"><textarea className="input min-h-32" value={report.methodology} onChange={(event) => setReport((old) => ({ ...old, methodology: event.target.value }))} placeholder="Explain how the publisher defines and calculates the measure." /></Field>
            <Field label="Scope and coverage" className="span-two"><textarea className="input min-h-24" value={report.scopeNotes} onChange={(event) => setReport((old) => ({ ...old, scopeNotes: event.target.value }))} /></Field>
            <Field label="Limitations" className="span-two"><textarea className="input min-h-24" value={report.limitations} onChange={(event) => setReport((old) => ({ ...old, limitations: event.target.value }))} /></Field>
          </div>
          <p className="mt-4 border-l-4 border-amber-400 bg-amber-50 p-3 text-sm leading-6 text-amber-950">Saving edits returns the report to an unpublished, unverified draft. Re-check the source before verifying and publishing it.</p>
        </form>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input className="input max-w-md" value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Search reports, publishers, categories" aria-label="Search reports" />
            <button className="btn-primary" type="button" onClick={() => setReport({ ...blankReport })}><FilePlus2 size={16} /> Create report</button>
          </div>
          {loading ? <p className="public-data-feedback" role="status">Loading report records…</p> : error ? <p className="public-data-feedback" role="status">Report records are unavailable until the migration/configuration issue above is resolved.</p> : !filteredReports.length ? <p className="public-data-feedback" role="status">No report drafts or published reports yet. Add a category and publisher, then create the first report draft.</p> : (
            <div className="public-report-admin-list">
              {filteredReports.map((item) => (
                <article className="public-report-admin-row" key={item.id}>
                  <div className="min-w-0"><h2>{item.title}</h2><p>{item.category?.name || 'No category'} · {item.source?.name || 'No publisher'} · <span className="capitalize">{item.status}</span> · {item.verificationStatus.replaceAll('_', ' ')}</p><span className="text-xs text-gray-500">/reports/{item.slug}</span></div>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-secondary" type="button" onClick={() => { setReport({ ...blankReport, ...item, referenceYear: item.referenceYear || '' }); setPreview(false); }}><Edit3 size={15} /> Edit</button>
                    {item.status === 'published' && <a className="btn-secondary" href={`/reports/${item.slug}`} target="_blank" rel="noreferrer"><Eye size={15} /> View</a>}
                    {item.status === 'archived' && <button className="btn-secondary" type="button" onClick={() => changeReportState(item, { status: 'draft' }, 'Report restored to drafts. Existing verification is preserved unless its content changes.')}>Restore to draft</button>}
                    {item.verificationStatus !== 'verified' && <button className="btn-secondary" type="button" onClick={() => {
                      const confirmed = window.confirm('Confirm you checked the original source, publication date, methodology, scope and limitations. This marks the report as verified by FTP News.');
                      if (confirmed) changeReportState(item, { verificationStatus: 'verified' }, 'Report verified. It is still unpublished.');
                    }}><Check size={15} /> Verify</button>}
                    {item.status !== 'published' && item.status !== 'archived' && <button className="btn-primary" type="button" disabled={item.verificationStatus !== 'verified'} title={item.verificationStatus !== 'verified' ? 'Verify the report first' : ''} onClick={() => changeReportState(item, { status: 'published' }, 'Report published.')}>Publish</button>}
                    {item.status === 'published' && <button className="btn-secondary" type="button" onClick={() => changeReportState(item, { status: 'draft' }, 'Report unpublished and saved as draft.')}>Unpublish</button>}
                    {item.status !== 'archived' && <button className="btn-secondary" type="button" onClick={() => changeReportState(item, { status: 'archived' }, 'Report archived.')}><Archive size={15} /> Archive</button>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      ))}

      {tab === 'categories' && (
        <div className="public-report-resource-layout">
          <form className="public-report-resource-form" onSubmit={saveCategory}>
            <h2>{category.id ? 'Edit category' : 'Add report category'}</h2>
            <Field label="Name *"><input className="input" value={category.name} onChange={(event) => setCategory((old) => ({ ...old, name: event.target.value, slug: old.id ? old.slug : slugify(event.target.value) }))} required /></Field>
            <Field label="Slug *"><input className="input" value={category.slug} onChange={(event) => setCategory((old) => ({ ...old, slug: slugify(event.target.value) }))} required /></Field>
            <Field label="Description"><textarea className="input min-h-24" value={category.description} onChange={(event) => setCategory((old) => ({ ...old, description: event.target.value }))} /></Field>
            {category.id && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={category.isActive} onChange={(event) => setCategory((old) => ({ ...old, isActive: event.target.checked }))} /> Active in public filters</label>}
            <div className="flex gap-2"><button className="btn-primary" disabled={saving}><Save size={15} /> Save category</button>{category.id && <button className="btn-secondary" type="button" onClick={() => setCategory(blankCategory)}>Cancel edit</button>}</div>
          </form>
          <div className="public-report-resource-list"><h2>Categories</h2>{categories.map((item) => <div key={item.id}><span><strong>{item.name}</strong><small>/{item.slug} · {item.isActive ? 'Active' : 'Inactive'}</small></span><button className="btn-secondary" type="button" onClick={() => setCategory({ ...item })}>Edit</button></div>)}{!categories.length && <p>No categories yet.</p>}</div>
        </div>
      )}

      {tab === 'sources' && (
        <div className="public-report-resource-layout">
          <form className="public-report-resource-form" onSubmit={saveSource}>
            <h2>{source.id ? 'Edit publisher/source' : 'Add publisher/source'}</h2>
            <Field label="Publisher / institution name *"><input className="input" value={source.name} onChange={(event) => setSource((old) => ({ ...old, name: event.target.value }))} required /></Field>
            <Field label="Official website"><input className="input" type="url" placeholder="https://..." value={source.websiteURL} onChange={(event) => setSource((old) => ({ ...old, websiteURL: event.target.value }))} /></Field>
            <Field label="Organization type"><input className="input" placeholder="Government, UN agency, research body..." value={source.organizationType} onChange={(event) => setSource((old) => ({ ...old, organizationType: event.target.value }))} /></Field>
            <Field label="Jurisdiction"><input className="input" placeholder="India, Odisha, International..." value={source.jurisdiction} onChange={(event) => setSource((old) => ({ ...old, jurisdiction: event.target.value }))} /></Field>
            <Field label="Source notes"><textarea className="input min-h-20" value={source.notes} onChange={(event) => setSource((old) => ({ ...old, notes: event.target.value }))} /></Field>
            {source.id && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={source.isActive} onChange={(event) => setSource((old) => ({ ...old, isActive: event.target.checked }))} /> Active for new reports</label>}
            <div className="flex gap-2"><button className="btn-primary" disabled={saving}><Save size={15} /> Save publisher</button>{source.id && <button className="btn-secondary" type="button" onClick={() => setSource(blankSource)}>Cancel edit</button>}</div>
          </form>
          <div className="public-report-resource-list"><h2>Publishers &amp; sources</h2>{sources.map((item) => <div key={item.id}><span><strong>{item.name}</strong><small>{item.jurisdiction || 'Jurisdiction not set'} · {item.isActive ? 'Active' : 'Inactive'}</small></span><button className="btn-secondary" type="button" onClick={() => setSource({ ...item })}>Edit</button></div>)}{!sources.length && <p>No publisher records yet.</p>}</div>
        </div>
      )}
      {preview && report && <ReportPreview report={report} categories={categories} sources={sources} onClose={() => setPreview(false)} />}
    </section>
  );
}
