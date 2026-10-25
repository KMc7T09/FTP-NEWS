import { useEffect, useMemo, useState } from 'react';
import { Download, ExternalLink, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import Seo from '../components/common/Seo.jsx';
import { listPublishedPublicDataEditions } from '../supabase/api.js';

function csvCell(value) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadCsv(rows, filename) {
  const columns = ['indicator', 'edition', 'publication_date', 'reference_period_start', 'reference_period_end', 'geography_name', 'geography_type', 'geography_code', 'value', 'value_text', 'unit', 'published_rank', 'rank_scope', 'source', 'source_url', 'source_page'];
  const lines = [columns.join(','), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(','))];
  const url = URL.createObjectURL(new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function PublicRankingsPage() {
  const [editions, setEditions] = useState([]);
  const [mode, setMode] = useState('india');
  const [search, setSearch] = useState('');
  const [year, setYear] = useState('all');
  const [source, setSource] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    listPublishedPublicDataEditions()
      .then((records) => { if (active) setEditions(records); })
      .catch((loadError) => { if (active) setError(loadError.message || 'Public datasets could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const years = [...new Set(editions.map((item) => item.publication_date?.slice(0, 4)).filter(Boolean))].sort().reverse();
  const sources = [...new Map(editions.filter((item) => item.source).map((item) => [item.source.id, item.source])).values()];
  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return editions.map((edition) => ({
      ...edition,
      observations: (edition.observations || []).filter((row) => mode === 'india'
        ? ['state', 'ut', 'district'].includes(row.geography_type)
        : row.geography_type === 'country'),
    })).filter((edition) => {
      const matchesSearch = !term || [edition.edition_label, edition.indicator?.name, edition.indicator?.definition, edition.source?.name, edition.indicator?.category?.name, ...(edition.observations || []).map((row) => row.geography_name)].join(' ').toLocaleLowerCase().includes(term);
      const matchesYear = year === 'all' || edition.publication_date?.startsWith(year);
      const matchesSource = source === 'all' || edition.source_id === source;
      return matchesSearch && matchesYear && matchesSource && edition.observations.length > 0;
    });
  }, [editions, mode, search, year, source]);

  const flatRows = visible.flatMap((edition) => edition.observations.map((row) => ({
    indicator: edition.indicator?.name,
    edition: edition.edition_label,
    publication_date: edition.publication_date,
    reference_period_start: edition.reference_period_start,
    reference_period_end: edition.reference_period_end,
    geography_name: row.geography_name,
    geography_type: row.geography_type,
    geography_code: row.geography_code,
    value: row.value,
    value_text: row.value_text,
    unit: row.unit || edition.indicator?.unit,
    published_rank: row.published_rank,
    rank_scope: row.rank_scope,
    source: edition.source?.name,
    source_url: edition.source_url,
    source_page: row.source_page,
  })));

  return (
    <main className="container-page public-data-catalogue py-8 sm:py-12">
      <Seo title="State & Global Rankings | THE FTP NEWS" description="Explore source-linked state, district and international public data with reporting periods and methodology." url="https://the-ftp-news.netlify.app/rankings" />
      <div className="public-data-section-heading">
        <div><p className="section-kicker">PUBLIC REPORTS &amp; DATA</p><h1>Rankings explorer</h1><p>Compare only published source records. Published ranks are kept separate from the underlying values; FTP News does not calculate substitute ranks here.</p></div>
        <button className="btn-secondary" type="button" onClick={() => downloadCsv(flatRows, `ftp-${mode}-public-data.csv`)} disabled={!flatRows.length}><Download size={16} /> Export CSV</button>
      </div>

      <div className="public-report-admin-tabs mt-6" role="tablist" aria-label="Ranking scope">
        <button type="button" role="tab" aria-selected={mode === 'india'} className={mode === 'india' ? 'is-active' : ''} onClick={() => setMode('india')}>India state &amp; district data</button>
        <button type="button" role="tab" aria-selected={mode === 'world'} className={mode === 'world' ? 'is-active' : ''} onClick={() => setMode('world')}>India in the world</button>
      </div>

      <div className="public-data-filters mt-4 flex-wrap">
        <label className="public-data-search"><Search size={17} /><span className="sr-only">Search indicators, reports and places</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search indicator, place, source" /></label>
        <label htmlFor="ranking-year">Publication year</label>
        <select id="ranking-year" value={year} onChange={(event) => setYear(event.target.value)}><option value="all">All years</option>{years.map((item) => <option key={item}>{item}</option>)}</select>
        <label htmlFor="ranking-source">Publisher</label>
        <select id="ranking-source" value={source} onChange={(event) => setSource(event.target.value)}><option value="all">All publishers</option>{sources.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      </div>

      {loading ? <div className="public-data-feedback" role="status">Loading verified datasets…</div> : error ? <div className="public-data-feedback public-data-feedback-error" role="alert"><strong>Data unavailable</strong><span>{error}</span></div> : visible.length === 0 ? (
        <div className="public-data-feedback mt-5" role="status"><strong>No published datasets in this view yet</strong><span>Only source-reviewed records entered and published by an administrator appear here. Browse the <Link className="underline" to="/reports">report archive</Link> or check back after datasets are reviewed.</span></div>
      ) : (
        <div className="mt-6 space-y-8">
          {visible.map((edition) => (
            <section className="public-report-admin-list" key={edition.id} aria-labelledby={`dataset-${edition.id}`}>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 p-4">
                <div><p className="section-kicker">{edition.indicator?.category?.name || 'PUBLIC DATA'} · {edition.edition_label}</p><h2 id={`dataset-${edition.id}`} className="mt-1 text-xl font-extrabold">{edition.indicator?.name}</h2><p className="mt-1 text-sm text-gray-600">{edition.indicator?.definition}</p></div>
                <div className="text-sm text-gray-600"><p><strong>Publisher:</strong> {edition.source?.name || 'Not listed'}</p><p><strong>Publication:</strong> {edition.publication_date || 'Not stated'} · <strong>Data:</strong> {edition.reference_period_start || 'period not specified'}{edition.reference_period_end ? ` to ${edition.reference_period_end}` : ''}</p><a className="inline-flex items-center gap-1 text-brand-red underline" href={edition.source_url} target="_blank" rel="noreferrer">Original source <ExternalLink size={13} /></a></div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm"><thead><tr><th className="p-3">Place</th><th className="p-3">Reported value</th><th className="p-3">Publisher's rank</th><th className="p-3">Source note</th></tr></thead><tbody>
                  {edition.observations.map((row) => <tr className="border-t border-gray-100" key={row.id}><td className="p-3"><strong>{row.geography_name}</strong><span className="ml-2 text-xs uppercase text-gray-500">{row.geography_type}</span></td><td className="p-3">{row.is_missing ? 'Not available' : (row.value_text || (row.value == null ? 'Not reported' : `${row.value.toLocaleString('en-IN')}${row.unit || edition.indicator?.unit ? ` ${row.unit || edition.indicator?.unit}` : ''}`))}</td><td className="p-3">{row.published_rank ? `${row.published_rank}${row.rank_scope ? ` · ${row.rank_scope}` : ''}` : 'Not supplied'}</td><td className="p-3">{row.source_page || row.notes || 'See linked source'}</td></tr>)}
                </tbody></table>
              </div>
              <div className="grid gap-3 border-t border-gray-200 p-4 text-sm text-gray-700 sm:grid-cols-3"><p><strong className="block text-xs uppercase text-gray-500">Methodology</strong>{edition.methodology}</p><p><strong className="block text-xs uppercase text-gray-500">Scope</strong>{edition.scope_notes || 'See publisher source.'}</p><p><strong className="block text-xs uppercase text-gray-500">Limitations</strong>{edition.limitations || 'No additional note supplied.'}</p></div>
              {edition.report?.slug && <Link className="m-4 inline-flex items-center gap-1 text-sm font-bold text-brand-red" to={`/reports/${edition.report.slug}`}>Read source report details <ExternalLink size={14} /></Link>}
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
