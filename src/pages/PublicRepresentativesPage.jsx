import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, MapPin, Search, UsersRound } from 'lucide-react';
import Seo from '../components/common/Seo.jsx';
import { listPublishedPublicRepresentatives } from '../supabase/api.js';

const officialDirectories = [
  { title: 'Lok Sabha', detail: 'Sitting members, constituencies and parliamentary activity.', href: 'https://sansad.in/ls/members' },
  { title: 'Rajya Sabha', detail: 'Members, States / UTs and term information.', href: 'https://sansad.in/rs/members' },
  { title: 'Voter Services, ECI', detail: 'Official voter services include “Know your MP/MLA”.', href: 'https://voters.eci.gov.in/' },
  { title: 'e-GramSwaraj', detail: 'Panchayat profiles include elected-member details and local planning records.', href: 'https://panchayat.gov.in/en/e-gramswaraj/' },
];

function officeTier(item) {
  const office = `${item.office_title || ''} ${item.constituency || ''}`.toLocaleLowerCase();
  if (/sarpanch|panchayat|gram pradhan|mukhiya|ward member|municipal|corporator|councillor|councilor|mayor/.test(office)) return 'local';
  if (/\bmla\b|\bmlc\b|chief minister|state minister|legislative assembly|legislative council/.test(office)) return 'state';
  if (/prime minister|president of india|union minister|lok sabha|rajya sabha|\bmp\b|member of parliament/.test(office)) return 'national';
  return 'other';
}

function formatTerm(item) {
  const start = item.term_start ? new Date(`${item.term_start}T00:00:00`).getFullYear() : '';
  const end = item.term_end ? new Date(`${item.term_end}T00:00:00`).getFullYear() : '';
  return start || end ? `${start || 'Start not listed'} – ${end || 'End not listed'}` : 'Term dates not listed';
}

export default function PublicRepresentativesPage() {
  const [records, setRecords] = useState([]);
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    listPublishedPublicRepresentatives().then((rows) => { if (active) setRecords(rows); })
      .catch((cause) => { if (active) setError(cause.message || 'Directory is unavailable.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const states = useMemo(() => [...new Set(records.map((item) => item.state_or_ut).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [records]);
  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return records.filter((item) => {
      const searchable = [item.full_name, item.office_title, item.constituency, item.state_or_ut, item.party,
        item.summary, item.election_results, item.attendance_participation, item.documented_public_work]
        .filter(Boolean).join(' ').toLocaleLowerCase();
      return (!term || searchable.includes(term))
        && (stateFilter === 'all' || item.state_or_ut === stateFilter)
        && (tierFilter === 'all' || officeTier(item) === tierFilter);
    });
  }, [records, query, stateFilter, tierFilter]);

  return <main className="container-page public-data-catalogue py-8 sm:py-12">
    <Seo title="Elected Representatives | THE FTP NEWS" description="Search source-verified public profiles of elected representatives by area, office and State / UT." url="https://the-ftp-news.netlify.app/representatives" />
    <header className="public-data-section-heading">
      <div>
        <p className="section-kicker">PUBLIC REPORTS &amp; DATA · REPRESENTATIVES</p>
        <h1>Elected representatives</h1>
        <p>Search published, source-reviewed profiles by representative, constituency, locality or State / UT. Public-work notes are shown only when linked to evidence.</p>
      </div>
      <div className="public-data-count" aria-live="polite"><UsersRound size={18} /><strong>{loading ? '…' : visible.length}</strong><span>{visible.length === 1 ? 'profile' : 'profiles'}</span></div>
    </header>

    <section className="mt-6 rounded-md border border-gray-200 bg-white p-4 sm:p-5" aria-label="Search and filter representatives">
      <label className="public-data-search w-full">
        <Search size={18} aria-hidden="true" />
        <span className="sr-only">Search by name or area</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Enter village, panchayat, district, constituency, State / UT or name" />
        {query && <button type="button" aria-label="Clear search" onClick={() => setQuery('')}>×</button>}
      </label>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="public-data-filter-control"><span>Office level</span><select value={tierFilter} onChange={(event) => setTierFilter(event.target.value)}><option value="all">All levels</option><option value="local">Panchayat / local</option><option value="state">State</option><option value="national">National</option><option value="other">Other / not classified</option></select></label>
        <label className="public-data-filter-control"><span>State / UT</span><select value={stateFilter} onChange={(event) => setStateFilter(event.target.value)}><option value="all">All States / UTs</option>{states.map((state) => <option key={state} value={state}>{state}</option>)}</select></label>
        {(query || stateFilter !== 'all' || tierFilter !== 'all') && <button className="btn-secondary self-start sm:self-end" type="button" onClick={() => { setQuery(''); setStateFilter('all'); setTierFilter('all'); }}>Clear filters</button>}
      </div>
    </section>

    {loading ? <div className="public-data-feedback mt-5" role="status">Loading source-reviewed profiles…</div>
      : error ? <div className="public-data-feedback public-data-feedback-error mt-5" role="alert"><strong>Directory unavailable</strong><span>{error}</span></div>
        : visible.length === 0 ? <div className="public-data-feedback mt-5" role="status"><strong>{records.length ? 'No matching profiles' : 'No profiles published yet'}</strong><span>{records.length ? 'Try a broader area name or clear one of the filters.' : 'Only profiles reviewed and published by THE FTP NEWS appear here. This directory does not yet contain a complete national roll of elected representatives.'}</span></div>
          : <div className="public-data-report-grid mt-6">{visible.map((item) => <article className="public-data-report-card" key={item.id}>
            <div className="public-data-report-meta"><span>{item.office_title || 'Elected representative'}</span><span className="public-data-status is-verified">Source reviewed</span></div>
            <h2>{item.full_name}</h2>
            {item.summary && <p className="public-data-report-summary">{item.summary}</p>}
            <div className="public-data-report-facts">{[
              ['Area / constituency', item.constituency], ['District / State / UT', item.state_or_ut], ['Party', item.party],
              ['Party as of', item.party_as_of], ['Term', formatTerm(item)], ['Official publisher', item.source?.name],
            ].filter(([, value]) => value).map(([label, value]) => <span key={label}><strong>{label}</strong><span>{value}</span></span>)}</div>
            {(item.documented_public_work || item.attendance_participation || item.election_results || item.asset_disclosure) && <div className="mt-4 space-y-2 border-t border-gray-200 pt-3 text-sm">
              {item.documented_public_work && <p><strong>Documented public work:</strong> {item.documented_public_work}</p>}
              {item.attendance_participation && <p><strong>Participation:</strong> {item.attendance_participation}</p>}
              {item.election_results && <p><strong>Election record:</strong> {item.election_results}</p>}
              {item.asset_disclosure && <p><strong>Declared assets:</strong> {item.asset_disclosure}</p>}
            </div>}
            <div className="public-data-report-links"><a href={item.source_url} target="_blank" rel="noopener noreferrer">Original evidence <ExternalLink size={13} /></a></div>
            <p className="mt-3 text-xs text-gray-500">Profile facts should be read with the cited source. Last verified {item.verified_at ? new Date(item.verified_at).toLocaleDateString('en-IN') : 'date not listed'}.</p>
          </article>)}</div>}

    <section className="mt-12 border-t border-gray-200 pt-7" aria-labelledby="official-directories-title">
      <div className="public-data-section-heading"><div><p className="section-kicker">PRIMARY SOURCES</p><h2 id="official-directories-title">Official representative directories</h2><p>Government source portals are separate systems; this section links to their public records and does not imply those portals feed this directory automatically.</p></div></div>
      <div className="public-data-report-grid mt-5">{officialDirectories.map((source) => <article className="public-data-report-card" key={source.title}><div className="public-data-report-meta"><span><MapPin size={14} /> Official directory</span></div><h3>{source.title}</h3><p className="public-data-report-summary">{source.detail}</p><div className="public-data-report-links"><a href={source.href} target="_blank" rel="noopener noreferrer">Open official source <ExternalLink size={13} /></a></div></article>)}</div>
    </section>
  </main>;
}
