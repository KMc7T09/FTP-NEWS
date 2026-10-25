import { useEffect, useMemo, useState } from 'react';
import { Archive, Check, Download, FileSpreadsheet, Plus, RefreshCw, Upload, CloudDownload } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  createAdminPublicDataEdition,
  createAdminPublicDataIndicator,
  importAdminPublicDataObservations,
  listAdminPublicDataEditions,
  listAdminPublicDataIndicators,
  listAdminPublicReportCategories,
  listAdminPublicReportSources,
  listAdminPublicReports,
  previewOfficialPublicDataImport,
  updateAdminPublicDataEdition,
} from '../../supabase/api.js';

const emptyIndicator = { name: '', slug: '', definition: '', unit: '', categoryId: '', geographyLevel: 'state', direction: 'neutral', notes: '' };
const emptyEdition = { indicatorId: '', sourceId: '', reportId: '', editionLabel: '', publicationDate: '', referencePeriodStart: '', referencePeriodEnd: '', sourceURL: '', documentURL: '', methodology: '', scopeNotes: '', limitations: '' };

function slugify(text) {
  return String(text || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted && char === '"' && text[index + 1] === '"') { cell += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(cell); cell = '';
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
    } else cell += char;
  }
  if (quoted) throw new Error('CSV has an unclosed quoted field.');
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  if (rows.length < 2) throw new Error('CSV must include a header row and at least one data row.');
  const headers = rows[0].map((header) => header.trim().toLowerCase().replace(/[ -]+/g, '_'));
  if (new Set(headers).size !== headers.length) throw new Error('CSV contains duplicate column headings.');
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
}

const importHeaders = 'geography_code,geography_name,geography_type,value,value_text,unit,published_rank,rank_scope,is_missing,notes,source_page';

export default function PublicDataManager() {
  const { isAdmin } = useAuth();
  const [indicators, setIndicators] = useState([]);
  const [editions, setEditions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sources, setSources] = useState([]);
  const [reports, setReports] = useState([]);
  const [indicator, setIndicator] = useState(emptyIndicator);
  const [edition, setEdition] = useState(emptyEdition);
  const [selectedEdition, setSelectedEdition] = useState('');
  const [importRows, setImportRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [provider, setProvider] = useState('world-bank');
  const [officialForm, setOfficialForm] = useState({ indicatorCode: '', year: String(new Date().getFullYear() - 1), resourceId: '', geographyType: 'state', codeField: '', nameField: '', valueField: '', unitField: '', rankField: '' });
  const [officialLoading, setOfficialLoading] = useState(false);
  const [officialSource, setOfficialSource] = useState('');
  const [term, setTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [indicatorRows, editionRows, categoryRows, sourceRows, reportRows] = await Promise.all([
        listAdminPublicDataIndicators(), listAdminPublicDataEditions(), listAdminPublicReportCategories(),
        listAdminPublicReportSources(), listAdminPublicReports(),
      ]);
      setIndicators(indicatorRows);
      setEditions(editionRows);
      setCategories(categoryRows);
      setSources(sourceRows);
      setReports(reportRows);
    } catch (loadError) { setError(loadError.message || 'Public data manager failed to load.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const filteredEditions = useMemo(() => editions.filter((item) => [item.edition_label, item.indicator?.name, item.source?.name].join(' ').toLowerCase().includes(term.trim().toLowerCase())), [editions, term]);

  async function saveNewIndicator(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const saved = await createAdminPublicDataIndicator({ ...indicator, slug: indicator.slug || slugify(indicator.name) });
      toast.success('Indicator definition saved as draft data setup.');
      setIndicator(emptyIndicator);
      await load();
      setEdition((old) => ({ ...old, indicatorId: saved.id }));
    } catch (saveError) { toast.error(saveError.message || 'Indicator could not be saved.'); }
    finally { setSaving(false); }
  }

  async function saveNewEdition(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const saved = await createAdminPublicDataEdition(edition);
      toast.success('Dataset edition created as an unpublished draft.');
      setEdition(emptyEdition);
      setSelectedEdition(saved.id);
      await load();
    } catch (saveError) { toast.error(saveError.message || 'Dataset edition could not be saved.'); }
    finally { setSaving(false); }
  }

  async function readCsv(file) {
    try {
      const parsed = parseCsv(await file.text());
      const allowed = new Set(importHeaders.split(','));
      const unknown = Object.keys(parsed[0]).filter((header) => !allowed.has(header));
      if (unknown.length) throw new Error(`Unexpected CSV column(s): ${unknown.join(', ')}. Use the documented template headings.`);
      if (parsed.some((row) => !row.geography_code || !row.geography_name || !['country', 'state', 'ut', 'district'].includes(row.geography_type.toLowerCase()))) {
        throw new Error('Each row needs a geography code, name and type (country/state/ut/district).');
      }
      const keys = parsed.map((row) => row.geography_code.trim());
      if (new Set(keys).size !== keys.length) throw new Error('Duplicate geography_code values found in this file.');
      if (parsed.some((row) => row.value && !Number.isFinite(Number(row.value)))) throw new Error('A numeric value is invalid. Leave it blank and set is_missing=true when the source has no value.');
      if (parsed.some((row) => row.published_rank && (!Number.isInteger(Number(row.published_rank)) || Number(row.published_rank) < 1))) throw new Error('Published ranks must be positive whole numbers.');
      if (parsed.length > 5000) throw new Error('Import is limited to 5,000 rows per file.');
      setImportRows(parsed);
      setFileName(file.name);
      toast.success(`${parsed.length} rows ready for preview.`);
    } catch (parseError) { setImportRows([]); toast.error(parseError.message || 'CSV could not be read.'); }
  }

  async function importCsv() {
    if (!selectedEdition || !importRows.length) return;
    if (!window.confirm('Import these source observations? This changes the edition to draft and clears any previous verification.')) return;
    setSaving(true);
    try {
      const count = await importAdminPublicDataObservations(selectedEdition, importRows);
      toast.success(`${count} source rows imported. The edition is now an unverified draft.`);
      setImportRows([]); setFileName('');
      await load();
    } catch (importError) { toast.error(importError.message || 'Import failed.'); }
    finally { setSaving(false); }
  }

  async function fetchOfficialPreview(event) {
    event.preventDefault();
    if (!selectedEdition) { toast.error('Select the draft dataset edition that will receive these rows.'); return; }
    const targetEdition = editions.find((item) => item.id === selectedEdition);
    if (!targetEdition || targetEdition.status !== 'draft' || targetEdition.verification_status === 'verified') {
      toast.error('Official API import is allowed only into an unverified draft edition.');
      return;
    }
    const level = targetEdition?.indicator?.geography_level;
    if (provider === 'world-bank' && level !== 'country' && level !== 'mixed') {
      toast.error('World Bank rows are country-level. Select an indicator configured for Country or Mixed geography.');
      return;
    }
    if (provider === 'data-gov-in' && level !== officialForm.geographyType && !(level === 'state' && officialForm.geographyType === 'ut') && level !== 'mixed') {
      toast.error(`Selected indicator expects ${level || 'unknown'} geography; the API mapping is ${officialForm.geographyType}.`);
      return;
    }
    setOfficialLoading(true);
    try {
      const result = await previewOfficialPublicDataImport(provider === 'world-bank'
        ? { provider, indicatorCode: officialForm.indicatorCode, year: officialForm.year }
        : {
          provider,
          resourceId: officialForm.resourceId,
          geographyType: officialForm.geographyType,
          mapping: { codeField: officialForm.codeField, nameField: officialForm.nameField, valueField: officialForm.valueField, unitField: officialForm.unitField, rankField: officialForm.rankField },
        });
      setImportRows(result.rows);
      setFileName(`${result.provider} · ${result.count} rows`);
      setOfficialSource(result.sourceUrl);
      toast.success(`${result.count} rows fetched for review. Nothing has been saved yet.`);
    } catch (fetchError) { toast.error(fetchError.message || 'Official API preview failed.'); }
    finally { setOfficialLoading(false); }
  }

  async function setState(item, updates, message) {
    try { await updateAdminPublicDataEdition(item.id, updates); toast.success(message); await load(); }
    catch (stateError) { toast.error(stateError.message || 'Dataset status update failed.'); }
  }

  if (!isAdmin) return <div className="public-data-feedback"><strong>Admin permission required</strong><span>Only active admins and superadmins can manage datasets.</span></div>;

  return (
    <section className="public-report-admin">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><p className="section-kicker">PUBLIC DATA DESK</p><h1 className="mt-1 text-2xl font-extrabold">Rankings &amp; datasets</h1><p className="mt-1 text-sm text-gray-600">Enter source-backed observations. Imports remain drafts until reviewed and verified.</p></div><button type="button" className="btn-secondary" onClick={load} disabled={loading}><RefreshCw size={16} /> Refresh</button></div>
      {error && <div className="public-data-feedback public-data-feedback-error mb-4" role="alert"><strong>Data manager unavailable</strong><span>{error}</span><span>Apply <code>supabase/public-data-rankings.sql</code> after the Public Reports migrations in a reviewed database environment.</span></div>}

      <div className="public-report-resource-layout">
        <form className="public-report-resource-form" onSubmit={saveNewIndicator}>
          <h2><Plus size={17} /> Define indicator</h2>
          <label className="public-report-field"><span>Indicator name *</span><input className="input" required value={indicator.name} onChange={(event) => setIndicator((old) => ({ ...old, name: event.target.value, slug: old.slug ? old.slug : slugify(event.target.value) }))} /></label>
          <label className="public-report-field"><span>URL slug *</span><input className="input" required value={indicator.slug} onChange={(event) => setIndicator((old) => ({ ...old, slug: slugify(event.target.value) }))} /></label>
          <label className="public-report-field"><span>Definition *</span><textarea className="input min-h-20" required value={indicator.definition} onChange={(event) => setIndicator((old) => ({ ...old, definition: event.target.value }))} /></label>
          <label className="public-report-field"><span>Unit</span><input className="input" placeholder="percent, index points, persons..." value={indicator.unit} onChange={(event) => setIndicator((old) => ({ ...old, unit: event.target.value }))} /></label>
          <label className="public-report-field"><span>Topic category</span><select className="input" value={indicator.categoryId} onChange={(event) => setIndicator((old) => ({ ...old, categoryId: event.target.value }))}><option value="">Select category</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <div className="grid grid-cols-2 gap-3"><label className="public-report-field"><span>Geography level</span><select className="input" value={indicator.geographyLevel} onChange={(event) => setIndicator((old) => ({ ...old, geographyLevel: event.target.value }))}><option value="state">State / UT</option><option value="district">District</option><option value="country">Country</option><option value="mixed">Mixed</option></select></label><label className="public-report-field"><span>Better direction</span><select className="input" value={indicator.direction} onChange={(event) => setIndicator((old) => ({ ...old, direction: event.target.value }))}><option value="neutral">No ranking direction</option><option value="higher_better">Higher is better</option><option value="lower_better">Lower is better</option></select></label></div>
          <button className="btn-primary" disabled={saving}><Plus size={15} /> Save indicator</button>
        </form>

        <form className="public-report-resource-form" onSubmit={saveNewEdition}>
          <h2><FileSpreadsheet size={17} /> Add dataset edition</h2>
          <label className="public-report-field"><span>Indicator *</span><select className="input" required value={edition.indicatorId} onChange={(event) => setEdition((old) => ({ ...old, indicatorId: event.target.value }))}><option value="">Select indicator</option>{indicators.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="public-report-field"><span>Publisher *</span><select className="input" required value={edition.sourceId} onChange={(event) => setEdition((old) => ({ ...old, sourceId: event.target.value }))}><option value="">Select publisher</option>{sources.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="public-report-field"><span>Related report (optional)</span><select className="input" value={edition.reportId} onChange={(event) => setEdition((old) => ({ ...old, reportId: event.target.value }))}><option value="">No linked report</option>{reports.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label className="public-report-field"><span>Edition label *</span><input className="input" required value={edition.editionLabel} placeholder="As printed by the publisher" onChange={(event) => setEdition((old) => ({ ...old, editionLabel: event.target.value }))} /></label>
          <label className="public-report-field"><span>Publication date *</span><input className="input" type="date" required value={edition.publicationDate} onChange={(event) => setEdition((old) => ({ ...old, publicationDate: event.target.value }))} /></label>
          <div className="grid grid-cols-2 gap-3"><label className="public-report-field"><span>Reference period start</span><input className="input" type="date" value={edition.referencePeriodStart} onChange={(event) => setEdition((old) => ({ ...old, referencePeriodStart: event.target.value }))} /></label><label className="public-report-field"><span>Reference period end</span><input className="input" type="date" value={edition.referencePeriodEnd} onChange={(event) => setEdition((old) => ({ ...old, referencePeriodEnd: event.target.value }))} /></label></div>
          <label className="public-report-field"><span>Original source URL *</span><input className="input" type="url" required placeholder="https://..." value={edition.sourceURL} onChange={(event) => setEdition((old) => ({ ...old, sourceURL: event.target.value }))} /></label>
          <label className="public-report-field"><span>Document URL (optional)</span><input className="input" type="url" placeholder="https://..." value={edition.documentURL} onChange={(event) => setEdition((old) => ({ ...old, documentURL: event.target.value }))} /></label>
          <label className="public-report-field"><span>Methodology *</span><textarea className="input min-h-20" required value={edition.methodology} onChange={(event) => setEdition((old) => ({ ...old, methodology: event.target.value }))} /></label>
          <label className="public-report-field"><span>Scope and coverage</span><textarea className="input min-h-16" value={edition.scopeNotes} onChange={(event) => setEdition((old) => ({ ...old, scopeNotes: event.target.value }))} /></label>
          <label className="public-report-field"><span>Limitations</span><textarea className="input min-h-16" value={edition.limitations} onChange={(event) => setEdition((old) => ({ ...old, limitations: event.target.value }))} /></label>
          <button className="btn-primary" disabled={saving || !indicators.length || !sources.length}><Plus size={15} /> Save as draft</button>
        </form>
      </div>

      <section className="mt-8 border-t border-gray-200 pt-6">
        <h2 className="text-xl font-extrabold">Fetch from official data APIs</h2>
        <p className="mt-1 max-w-4xl text-sm text-gray-600">Fetch a source dataset into the preview below. Imported rows remain unverified drafts; source review and explicit verification/publication are still required. API requests are made server-side and restricted to official provider hosts.</p>
        <form className="mt-4 grid gap-4 rounded-md border border-gray-200 bg-white p-4 md:grid-cols-2" onSubmit={fetchOfficialPreview}>
          <label className="public-report-field"><span>Official provider</span><select className="input" value={provider} onChange={(event) => { setProvider(event.target.value); setImportRows([]); setOfficialSource(''); }}><option value="world-bank">World Bank Indicators API (no API key)</option><option value="data-gov-in">Open Government Data India (data.gov.in)</option></select></label>
          <label className="public-report-field"><span>Target draft edition *</span><select className="input" required value={selectedEdition} onChange={(event) => setSelectedEdition(event.target.value)}><option value="">Select dataset edition</option>{editions.filter((item) => item.status === 'draft' && item.verification_status !== 'verified').map((item) => <option key={item.id} value={item.id}>{item.indicator?.name} · {item.edition_label} (draft)</option>)}</select></label>
          {provider === 'world-bank' ? <>
            <label className="public-report-field"><span>World Bank indicator code *</span><input className="input" required maxLength={80} value={officialForm.indicatorCode} onChange={(event) => setOfficialForm((old) => ({ ...old, indicatorCode: event.target.value.trim() }))} placeholder="e.g. NY.GDP.PCAP.CD" /></label>
            <label className="public-report-field"><span>Reference year *</span><input className="input" type="number" min="1960" max={new Date().getFullYear() + 1} required value={officialForm.year} onChange={(event) => setOfficialForm((old) => ({ ...old, year: event.target.value }))} /></label>
          </> : <>
            <label className="public-report-field"><span>data.gov.in resource ID *</span><input className="input" required maxLength={128} value={officialForm.resourceId} onChange={(event) => setOfficialForm((old) => ({ ...old, resourceId: event.target.value.trim() }))} placeholder="Copy from the official dataset resource page" /></label>
            <label className="public-report-field"><span>Geography type *</span><select className="input" value={officialForm.geographyType} onChange={(event) => setOfficialForm((old) => ({ ...old, geographyType: event.target.value }))}><option value="country">Country</option><option value="state">State</option><option value="ut">Union Territory</option><option value="district">District</option></select></label>
            <label className="public-report-field"><span>Record code field *</span><input className="input" required value={officialForm.codeField} onChange={(event) => setOfficialForm((old) => ({ ...old, codeField: event.target.value }))} placeholder="Exact JSON field name" /></label>
            <label className="public-report-field"><span>Geography name field *</span><input className="input" required value={officialForm.nameField} onChange={(event) => setOfficialForm((old) => ({ ...old, nameField: event.target.value }))} placeholder="Exact JSON field name" /></label>
            <label className="public-report-field"><span>Numeric value field *</span><input className="input" required value={officialForm.valueField} onChange={(event) => setOfficialForm((old) => ({ ...old, valueField: event.target.value }))} placeholder="Exact JSON field name" /></label>
            <label className="public-report-field"><span>Unit field (optional)</span><input className="input" value={officialForm.unitField} onChange={(event) => setOfficialForm((old) => ({ ...old, unitField: event.target.value }))} /></label>
            <label className="public-report-field"><span>Published rank field (optional)</span><input className="input" value={officialForm.rankField} onChange={(event) => setOfficialForm((old) => ({ ...old, rankField: event.target.value }))} /></label>
          </>}
          <div className="flex flex-wrap items-end gap-3"><button className="btn-secondary" type="submit" disabled={officialLoading || !selectedEdition}><CloudDownload size={16} /> {officialLoading ? 'Fetching…' : 'Fetch & preview'}</button>{officialSource && <span className="max-w-xl break-all text-xs text-gray-500">API source: {officialSource}</span>}</div>
          {provider === 'data-gov-in' && <p className="md:col-span-2 text-xs text-gray-500">Requires server-only Netlify variable <code>DATA_GOV_IN_API_KEY</code>. Never add the key to a VITE variable or browser code. Use only a resource page provided by data.gov.in.</p>}
        </form>
      </section>

      <section className="mt-8 border-t border-gray-200 pt-6">
        <h2 className="text-xl font-extrabold">Import observations from CSV</h2>
        <p className="mt-1 text-sm text-gray-600">Required columns: <code>geography_code, geography_name, geography_type</code>. Optional columns: value, value_text, unit, published_rank, rank_scope, is_missing, notes, source_page. Imports from this section or the official APIs upsert matching geography codes; rows omitted from a later import are not deleted. Any import returns the edition to an unverified draft.</p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="public-report-field min-w-64"><span>Dataset edition</span><select className="input" value={selectedEdition} onChange={(event) => setSelectedEdition(event.target.value)}><option value="">Select draft or published edition</option>{editions.map((item) => <option key={item.id} value={item.id}>{item.indicator?.name} · {item.edition_label} ({item.status})</option>)}</select></label>
          <label className="btn-secondary cursor-pointer"><Upload size={16} /> Choose CSV<input className="sr-only" type="file" accept=".csv,text/csv" onChange={(event) => event.target.files?.[0] && readCsv(event.target.files[0])} /></label>
          <button type="button" className="btn-secondary" onClick={() => { const blob = new Blob([`${importHeaders}\n`], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'ftp-observations-template.csv'; link.click(); URL.revokeObjectURL(url); }}><Download size={16} /> CSV template</button>
          <button type="button" className="btn-primary" disabled={saving || !selectedEdition || !importRows.length} onClick={importCsv}><Upload size={16} /> Import {importRows.length || ''} rows</button>
        </div>
        {fileName && <p className="mt-3 text-sm font-semibold" role="status">Previewing {fileName}: {importRows.length} row(s). First five shown below.</p>}
        {!!importRows.length && <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead><tr>{['geography_code','geography_name','geography_type','value','published_rank','source_page'].map((head) => <th className="p-2" key={head}>{head}</th>)}</tr></thead><tbody>{importRows.slice(0, 5).map((row, index) => <tr className="border-t" key={`${row.geography_code}-${index}`}>{['geography_code','geography_name','geography_type','value','published_rank','source_page'].map((key) => <td className="p-2" key={key}>{row[key] || '—'}</td>)}</tr>)}</tbody></table></div>}
      </section>

      <section className="mt-8 border-t border-gray-200 pt-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-extrabold">Dataset review queue</h2><p className="text-sm text-gray-600">Any change to provenance or observations resets the edition to draft and unverified.</p></div><input className="input max-w-sm" aria-label="Search datasets" value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Search editions, indicators, publishers" /></div>
        {loading ? <div className="public-data-feedback" role="status">Loading datasets…</div> : filteredEditions.length === 0 ? <div className="public-data-feedback" role="status"><strong>No dataset editions yet</strong><span>Define an indicator, add an edition, then import original source observations.</span></div> : <div className="public-report-admin-list">{filteredEditions.map((item) => <article className="public-report-admin-row" key={item.id}><div className="min-w-0"><h3>{item.indicator?.name || 'Indicator'} · {item.edition_label}</h3><p>{item.source?.name} · {item.publication_date || 'No publication date'} · {item.observations?.length || 0} observation(s)</p><p className="text-xs capitalize">{item.status} · {item.verification_status?.replaceAll('_', ' ')}</p></div><div className="flex flex-wrap gap-2"><button type="button" className="btn-secondary" onClick={() => setSelectedEdition(item.id)}><FileSpreadsheet size={15} /> Import rows</button>{item.status !== 'archived' && item.verification_status !== 'verified' && <button type="button" className="btn-secondary" onClick={() => { if (window.confirm('Confirm that you checked the original dataset, its period, methodology, scope, and limitations.')) setState(item, { verification_status: 'verified' }, 'Dataset verified. It is not yet public.'); }}><Check size={15} /> Verify</button>}{item.status !== 'published' && item.status !== 'archived' && <button type="button" className="btn-primary" disabled={item.verification_status !== 'verified'} title={item.verification_status !== 'verified' ? 'Verify the edition first' : ''} onClick={() => setState(item, { status: 'published' }, 'Dataset published.')}>Publish</button>}{item.status === 'published' && <button type="button" className="btn-secondary" onClick={() => setState(item, { status: 'draft' }, 'Dataset unpublished.')}>Unpublish</button>}{item.status !== 'archived' && <button type="button" className="btn-secondary" onClick={() => setState(item, { status: 'archived' }, 'Dataset archived.')}><Archive size={15} /> Archive</button>}</div></article>)}</div>}
      </section>
    </section>
  );
}
