import { useEffect, useState } from 'react';
import { Archive, Check, ExternalLink, FileDown, Pencil, Plus, RefreshCw, Search, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext.jsx';
import { importAdminPublicRepresentatives, listAdminPublicRepresentatives, listAdminPublicReportSources, previewOfficialRepresentativesImport, saveAdminPublicRepresentative, updateAdminPublicRepresentativeStatus } from '../../supabase/api.js';

const blank = { slug: '', full_name: '', office_title: '', constituency: '', state_or_ut: '', party: '', party_as_of: '', term_start: '', term_end: '', summary: '', election_results: '', asset_disclosure: '', attendance_participation: '', documented_public_work: '', source_id: '', source_url: '' };
const fields = [['office_title','Elected office / level'], ['constituency','Area (village, panchayat, ward, district or constituency)'], ['state_or_ut','State / UT'], ['party','Party (as of date below)'], ['party_as_of','Party as-of date','date'], ['term_start','Term start','date'], ['term_end','Term end','date'], ['source_url','Official source URL','url']];

function slugify(value) { return String(value).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

function parseCsv(text) {
  const rows = [];
  let row = []; let cell = ''; let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted && char === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell); cell = '';
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
    } else cell += char;
  }
  if (quoted) throw new Error('CSV has an unclosed quoted field.');
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  if (rows.length < 2) throw new Error('CSV needs a header and at least one data row.');
  const headers = rows[0].map((value) => value.replace(/^\uFEFF/, '').trim());
  if (new Set(headers.map((header) => header.toLowerCase())).size !== headers.length) throw new Error('CSV has duplicate column names.');
  return { headers, records: rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || '']))) };
}

export default function PublicRepresentativeManager() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState([]);
  const [sources, setSources] = useState([]);
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [importForm, setImportForm] = useState({ resourceId: '', officeTitle: '', sourceId: '', sourceUrl: 'https://www.data.gov.in/resource/constituency-wise-detailed-result-during-2024', rowsAreElected: false, winnerByVotes: false, mapping: { name: '', area: '', state: '', party: '' } });
  const [importPreview, setImportPreview] = useState(null);
  const [csvRecords, setCsvRecords] = useState([]);
  const [csvName, setCsvName] = useState('');
  const [importing, setImporting] = useState(false);
  const [importFields, setImportFields] = useState([]);
  const [inspecting, setInspecting] = useState(false);
  const [importError, setImportError] = useState('');

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

  async function previewImport(event) {
    event.preventDefault(); setImportError(''); setImportPreview(null); setImporting(true);
    try {
      if (!csvRecords.length) { setImportPreview(await previewOfficialRepresentativesImport(importForm)); return; }
      const mapping = importForm.mapping;
      if (!importForm.sourceId || !importForm.officeTitle || !mapping.name || !mapping.area) throw new Error('Choose a publisher, office, name field and area field first.');
      let selected = csvRecords;
      if (mapping.elected && mapping.electedValue) {
        selected = selected.filter((record) => String(record[mapping.elected] || '').trim().toLowerCase() === mapping.electedValue.trim().toLowerCase());
      } else if (importForm.winnerByVotes && mapping.votes) {
        if (!mapping.state) throw new Error('Map the State / UT column before deriving winners from votes.');
        const winners = new Map();
        for (const record of csvRecords) {
          const key = `${String(record[mapping.state] || '').trim().toLowerCase()}|${String(record[mapping.area] || '').trim().toLowerCase()}`;
          const votes = Number(String(record[mapping.votes] || '').replace(/[,\s]/g, ''));
          if (!record[mapping.state] || !record[mapping.area] || !Number.isFinite(votes)) throw new Error('Winner-by-votes needs a state, constituency and valid total-votes value on every row.');
          const prior = winners.get(key);
          if (!prior || votes > prior.votes) winners.set(key, { record, votes, tied: false });
          else if (votes === prior.votes) prior.tied = true;
        }
        const tied = [...winners.entries()].find(([, winner]) => winner.tied);
        if (tied) throw new Error(`The source has tied highest votes for ${tied[0].replace('|', ', ')}. Verify the official successful-candidate record instead.`);
        selected = [...winners.values()].map((entry) => entry.record);
      } else if (!importForm.rowsAreElected) {
        throw new Error('For a list of all candidates, select the vote field to derive one highest-vote winner per constituency, or map an explicit elected-status field.');
      }
      if (!selected.length) throw new Error('No rows matched the elected/winner rule. Check the source columns and values.');
      const rows = selected.map((record, index) => {
        const name = String(record[mapping.name] || '').trim();
        const area = String(record[mapping.area] || '').trim();
        if (!name || !area) throw new Error(`CSV row ${index + 1} has no mapped person name or area.`);
        const state = String(record[mapping.state] || '').trim();
        const slug = slugify([name, importForm.officeTitle, area, state].filter(Boolean).join(' '));
        if (!slug) throw new Error(`CSV row ${index + 1} could not be converted to a profile slug.`);
        return {
          slug, full_name: name, office_title: importForm.officeTitle, constituency: area,
          state_or_ut: state, party: String(record[mapping.party] || '').trim(),
          election_results: mapping.votes ? `Votes: ${String(record[mapping.votes] || '').trim()}; source edition: 2024 Lok Sabha election.` : '',
          source_id: importForm.sourceId, source_url: importForm.sourceUrl,
        };
      });
      const slugs = new Set();
      if (rows.some((row) => slugs.has(row.slug) || !slugs.add(row.slug))) throw new Error('CSV contains duplicate winner/name-area rows.');
      setImportPreview({ ok: true, provider: 'Official data.gov.in CSV', sourceUrl: importForm.sourceUrl, sourceCount: csvRecords.length, count: rows.length, electedOnly: true, rows });
    }
    catch (cause) { setImportError(cause.message || 'Official data preview failed.'); }
    finally { setImporting(false); }
  }

  async function loadCsv(file) {
    setImportError(''); setImportPreview(null);
    try {
      const parsed = parseCsv(await file.text());
      if (parsed.records.length > 1000) throw new Error('This import supports up to 1,000 rows at a time.');
      const headers = parsed.headers;
      const guess = (pattern) => headers.find((header) => pattern.test(header)) || '';
      setCsvRecords(parsed.records); setCsvName(file.name); setImportFields(headers);
      setImportForm((old) => ({ ...old, mapping: {
        ...old.mapping,
        state: old.mapping.state || guess(/state/i),
        area: old.mapping.area || guess(/constituency|pc.?name|area|district/i),
        name: old.mapping.name || guess(/candidate.?name|winner|member.?name|name/i),
        party: old.mapping.party || guess(/party/i),
        votes: old.mapping.votes || guess(/total.?votes|votes.?polled|vote.?count/i),
        elected: old.mapping.elected || guess(/winner|elected|result.?status/i),
      } }));
      toast.success(`${parsed.records.length} CSV rows loaded. Review the field mapping.`);
    } catch (cause) { setCsvRecords([]); setCsvName(''); setImportFields([]); setImportError(cause.message || 'CSV could not be read.'); }
  }

  async function inspectImport() {
    setImportError(''); setImportFields([]); setInspecting(true);
    try {
      const result = await previewOfficialRepresentativesImport({ resourceId: importForm.resourceId, inspectOnly: true });
      setImportFields(result.availableFields || []);
      const fields = result.availableFields || [];
      const guess = (pattern) => fields.find((field) => pattern.test(field)) || '';
      setImportForm((old) => ({ ...old, mapping: {
        ...old.mapping,
        name: old.mapping.name || guess(/name|member|candidate/i),
        area: old.mapping.area || guess(/constituency|panchayat|ward|area|district/i),
        state: old.mapping.state || guess(/^state|state_name/i),
        party: old.mapping.party || guess(/party/i),
        partyAsOf: old.mapping.partyAsOf || guess(/party.*date|date.*party/i),
        termStart: old.mapping.termStart || guess(/term.*start|start.*term/i),
        termEnd: old.mapping.termEnd || guess(/term.*end|end.*term/i),
        summary: old.mapping.summary || guess(/summary|description|profile/i),
        election: old.mapping.election || guess(/election.*result|result.*election|votes/i),
        work: old.mapping.work || guess(/public.*work|work.*detail|development.*work/i),
        elected: old.mapping.elected || guess(/winner|elected|returned|result.*status/i),
      } }));
      toast.success(`Found ${fields.length} fields in ${result.count} records. Check the field mapping.`);
    } catch (cause) { setImportError(cause.message || 'Could not inspect the official resource.'); }
    finally { setInspecting(false); }
  }

  async function saveImport() {
    if (!importPreview?.rows?.length || !importPreview.electedOnly) return;
    if (!window.confirm(`Import ${importPreview.rows.length} official-source records as unverified drafts? This will update existing records with matching slugs.`)) return;
    setImporting(true); setImportError('');
    try { const result = await importAdminPublicRepresentatives(importPreview.rows); toast.success(`${result.saved} records imported as unverified drafts.`); setImportPreview(null); await load(); }
    catch (cause) { setImportError(cause.message || 'Could not import records.'); }
    finally { setImporting(false); }
  }

  if (!isAdmin) return <div className="public-data-feedback"><strong>Admin permission required</strong></div>;
  return <section className="public-report-admin"><div className="mb-5 flex items-end justify-between gap-4"><div><p className="section-kicker">PUBLIC DATA DESK</p><h1 className="mt-1 text-2xl font-extrabold">Representatives</h1><p className="mt-1 text-sm text-gray-600">Enter only source-backed public-interest information. New or edited profiles require fresh review.</p></div><button className="btn-secondary" type="button" onClick={load} disabled={loading}><RefreshCw size={16} /> Refresh</button></div>
    {error && <div className="public-data-feedback public-data-feedback-error mb-4" role="alert"><strong>Manager unavailable</strong><span>{error}</span><span>Apply <code>supabase/public-representatives.sql</code> after Public Reports integrity migration.</span></div>}
    <section className="public-report-resource-form mb-6" aria-labelledby="representative-import-title">
      <h2 id="representative-import-title"><Upload size={17} /> Bulk import from data.gov.in</h2>
      <p className="text-sm text-gray-600">Use the official CSV download below. The 2024 Lok Sabha detailed-results resource lists no API service, so an API key alone cannot fetch it. CSV rows are previewed first and imported only as unverified drafts.</p>
      <div className="mt-3 flex flex-wrap items-center gap-3"><a className="text-sm text-emerald-800 underline" href="https://www.data.gov.in/resource/constituency-wise-detailed-result-during-2024" target="_blank" rel="noopener noreferrer">Open official 2024 Lok Sabha detailed results <ExternalLink size={13} /></a><label className="btn-secondary cursor-pointer"><Upload size={15} /> {csvName || 'Choose downloaded CSV'}<input className="sr-only" type="file" accept=".csv,text/csv" onChange={(event) => event.target.files?.[0] && loadCsv(event.target.files[0])} /></label>{csvRecords.length > 0 && <button type="button" className="btn-secondary" onClick={() => { setCsvRecords([]); setCsvName(''); setImportPreview(null); setImportFields([]); }}>Clear CSV</button>}</div>
      <p className="mt-2 text-xs text-gray-500">Download the CSV from the government dataset page after signing in, then select it here. No API key is needed for this CSV route.</p>
      <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={previewImport}>
        {!csvRecords.length && <><label className="public-report-field"><span>Optional API resource ID</span><input className="input" value={importForm.resourceId} onChange={(event) => setImportForm((old) => ({ ...old, resourceId: event.target.value }))} placeholder="Only for datasets with an enabled API" /></label><div className="flex items-end"><button className="btn-secondary" type="button" onClick={inspectImport} disabled={inspecting || !importForm.resourceId}><Search size={15} /> {inspecting ? 'Inspecting…' : 'Inspect API fields'}</button></div></>}
        <label className="public-report-field"><span>Office represented by this dataset *</span><input className="input" required value={importForm.officeTitle} onChange={(event) => setImportForm((old) => ({ ...old, officeTitle: event.target.value }))} placeholder="For example: Gram Panchayat member" /></label>
        <label className="public-report-field"><span>Registered publisher *</span><select className="input" required value={importForm.sourceId} onChange={(event) => setImportForm((old) => ({ ...old, sourceId: event.target.value }))}><option value="">Select official publisher</option>{sources.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="public-report-field sm:col-span-2"><span>Official source URL *</span><input className="input" type="url" required value={importForm.sourceUrl} onChange={(event) => setImportForm((old) => ({ ...old, sourceUrl: event.target.value }))} /></label>
        {Object.entries({ name: 'Person name field *', area: 'Area / constituency field *', state: 'State / UT field', party: 'Party field', votes: 'Total votes field (to derive the constituency winner)', partyAsOf: 'Party as-of date field', termStart: 'Term start field', termEnd: 'Term end field', summary: 'Profile summary field', election: 'Election results field', work: 'Documented public work field' }).map(([key, label]) => <label className="public-report-field" key={key}><span>{label}</span><select className="input" required={key === 'name' || key === 'area'} value={importForm.mapping[key] || ''} disabled={!importFields.length} onChange={(event) => setImportForm((old) => ({ ...old, mapping: { ...old.mapping, [key]: event.target.value } }))}><option value="">{key === 'name' || key === 'area' ? 'Select a source field' : 'Not provided by source'}</option>{importFields.map((field) => <option key={field} value={field}>{field}</option>)}</select></label>)}
        <label className="public-report-field"><span>Winner / elected-status field (for candidate lists)</span><select className="input" value={importForm.mapping.elected || ''} disabled={!importFields.length} onChange={(event) => setImportForm((old) => ({ ...old, rowsAreElected: false, mapping: { ...old.mapping, elected: event.target.value } }))}><option value="">No winner filter</option>{importFields.map((field) => <option key={field} value={field}>{field}</option>)}</select></label>
        {importForm.mapping.elected && <label className="public-report-field"><span>Exact value meaning elected / winner *</span><input className="input" required value={importForm.mapping.electedValue || ''} onChange={(event) => setImportForm((old) => ({ ...old, mapping: { ...old.mapping, electedValue: event.target.value } }))} placeholder="Use the exact value from the source, e.g. Won" /></label>}
        <label className="sm:col-span-2 flex items-start gap-2 text-sm text-gray-700"><input type="checkbox" checked={importForm.winnerByVotes} disabled={!importForm.mapping.votes || Boolean(importForm.mapping.elected)} onChange={(event) => setImportForm((old) => ({ ...old, winnerByVotes: event.target.checked, rowsAreElected: false }))} /><span>For all-candidate result files, select one highest-vote candidate per constituency. Confirm the source's total-votes column before using.</span></label>
        <label className="sm:col-span-2 flex items-start gap-2 text-sm text-gray-700"><input type="checkbox" checked={importForm.rowsAreElected} disabled={importForm.winnerByVotes || Boolean(importForm.mapping.elected)} onChange={(event) => setImportForm((old) => ({ ...old, rowsAreElected: event.target.checked }))} /><span>Every row in this file is explicitly a successful/elected candidate, not all candidates.</span></label>
        <div className="sm:col-span-2"><button className="btn-secondary" disabled={importing || !sources.length || !importFields.length}><Search size={15} /> {importing ? 'Preparing preview…' : 'Preview official records'}</button></div>
      </form>
      {importError && <div className="public-data-feedback public-data-feedback-error mt-3" role="alert">{importError}</div>}
      {importPreview && <div className="mt-4 border-t border-gray-200 pt-4"><p className="text-sm font-bold">Preview: {importPreview.count} elected rows from {importPreview.sourceCount} source rows · not yet imported</p><p className="mt-1 break-all text-xs text-gray-600">Source: {importPreview.sourceUrl}</p><div className="mt-3 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr><th className="p-2">Name</th><th className="p-2">Office</th><th className="p-2">Area</th><th className="p-2">State / UT</th></tr></thead><tbody>{importPreview.rows.slice(0, 8).map((row) => <tr className="border-t border-gray-100" key={row.slug}><td className="p-2">{row.full_name}</td><td className="p-2">{row.office_title}</td><td className="p-2">{row.constituency}</td><td className="p-2">{row.state_or_ut || 'Not provided'}</td></tr>)}</tbody></table></div><p className="mt-2 text-xs text-gray-600">Imported profiles stay draft and unverified. Review the source and facts, then verify and publish through the normal workflow.</p>{!importPreview.electedOnly && <p className="mt-2 text-sm font-semibold text-red-700">Import blocked: confirm the source lists only elected holders or filter the winner field.</p>}<button className="btn-primary mt-3" type="button" disabled={importing || !importPreview.electedOnly} onClick={saveImport}><FileDown size={15} /> {importing ? 'Importing…' : `Import ${importPreview.count} as drafts`}</button></div>}
    </section>
    <form className="public-report-resource-form" onSubmit={submit}><h2><Plus size={17} /> {editId ? 'Edit profile' : 'New profile'}</h2>
      <label className="public-report-field"><span>Full name *</span><input className="input" required value={form.full_name} onChange={(event) => setForm((old) => ({ ...old, full_name: event.target.value, slug: old.slug ? old.slug : slugify(event.target.value) }))} /></label>
      <label className="public-report-field"><span>Slug *</span><input className="input" required value={form.slug} onChange={(event) => setForm((old) => ({ ...old, slug: slugify(event.target.value) }))} /></label>
      <div className="grid gap-3 sm:grid-cols-2">{fields.map(([key, label, type = 'text']) => <label className="public-report-field" key={key}><span>{label}{key === 'source_url' ? ' *' : ''}</span><input className="input" type={type} required={key === 'source_url'} placeholder={key === 'constituency' ? 'Puri, Sakhigopal, Ward 4, Assembly constituency…' : ''} value={form[key]} onChange={(event) => setForm((old) => ({ ...old, [key]: event.target.value }))} /></label>)}</div>
      <label className="public-report-field"><span>Publisher *</span><select className="input" required value={form.source_id} onChange={(event) => setForm((old) => ({ ...old, source_id: event.target.value }))}><option value="">Select registered publisher</option>{sources.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><span className="text-xs text-gray-500">Register publishers under Admin → Public Reports → Publishers &amp; Sources.</span></label>
      {[['summary','Profile summary'], ['election_results','Election results (with period)'], ['asset_disclosure','Declared assets (cite affidavit/year)'], ['attendance_participation','Attendance / participation (cite period)'], ['documented_public_work','Documented public work (cite source and period)']].map(([key, label]) => <label className="public-report-field" key={key}><span>{label}</span><textarea className="input min-h-20" value={form[key]} onChange={(event) => setForm((old) => ({ ...old, [key]: event.target.value }))} /></label>)}
      <div className="flex gap-2"><button className="btn-primary" disabled={saving || !sources.length}><Check size={15} /> Save as draft</button>{editId && <button type="button" className="btn-secondary" onClick={() => { setForm(blank); setEditId(''); }}>Cancel edit</button>}</div>
    </form>
    <div className="mt-7">{loading ? <div className="public-data-feedback" role="status">Loading profiles…</div> : rows.length === 0 ? <div className="public-data-feedback"><strong>No representative profiles yet</strong><span>Register a publisher, then add and verify a profile with its official evidence.</span></div> : <div className="public-report-admin-list">{rows.map((item) => <article className="public-report-admin-row" key={item.id}><div><h3>{item.full_name} · {item.office_title || 'Public representative'}</h3><p>{item.constituency}{item.state_or_ut ? `, ${item.state_or_ut}` : ''} · {item.source?.name}</p><p className="text-xs capitalize">{item.status} · {item.verification_status}</p></div><div className="flex flex-wrap gap-2"><button className="btn-secondary" type="button" onClick={() => edit(item)}><Pencil size={14} /> Edit</button>{item.status !== 'archived' && item.verification_status !== 'verified' && <button className="btn-secondary" type="button" onClick={() => { if (window.confirm('Confirm that each published claim, date and cited official source has been checked.')) status(item, { verification_status: 'verified' }, 'Profile verified; publish separately.'); }}><Check size={14} /> Verify</button>}{item.status !== 'published' && item.status !== 'archived' && <button className="btn-primary" type="button" disabled={item.verification_status !== 'verified'} onClick={() => status(item, { status: 'published' }, 'Profile published.')}>Publish</button>}{item.status === 'published' && <button className="btn-secondary" type="button" onClick={() => status(item, { status: 'draft' }, 'Profile unpublished.')}>Unpublish</button>}{item.status !== 'archived' && <button className="btn-secondary" type="button" onClick={() => status(item, { status: 'archived' }, 'Profile archived.')}><Archive size={14} /> Archive</button>}</div></article>)}</div>}</div>
  </section>;
}
