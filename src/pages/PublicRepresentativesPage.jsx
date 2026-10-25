import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Search } from 'lucide-react';
import Seo from '../components/common/Seo.jsx';
import { listPublishedPublicRepresentatives } from '../supabase/api.js';

export default function PublicRepresentativesPage() {
  const [records, setRecords] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    listPublishedPublicRepresentatives().then((rows) => { if (active) setRecords(rows); })
      .catch((cause) => { if (active) setError(cause.message || 'Directory is unavailable.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return records.filter((item) => !term || [item.full_name, item.office_title, item.constituency, item.state_or_ut, item.party].join(' ').toLocaleLowerCase().includes(term));
  }, [records, query]);

  return <main className="container-page public-data-catalogue py-8 sm:py-12">
    <Seo title="Public Representatives | THE FTP NEWS" description="Source-linked public information about elected representatives, with terms, constituency and publication evidence." url="https://the-ftp-news.netlify.app/representatives" />
    <header className="public-data-section-heading"><div><p className="section-kicker">PUBLIC REPORTS &amp; DATA</p><h1>Public representatives</h1><p>Published profiles contain public-interest information linked to cited sources. Allegations and private personal information are not included.</p></div></header>
    <label className="public-data-search mt-5"><Search size={17} /><span className="sr-only">Search representatives</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, office, constituency, state or party" /></label>
    {loading ? <div className="public-data-feedback mt-5" role="status">Loading source-reviewed profiles…</div> : error ? <div className="public-data-feedback public-data-feedback-error mt-5" role="alert"><strong>Directory unavailable</strong><span>{error}</span></div> : visible.length === 0 ? <div className="public-data-feedback mt-5" role="status"><strong>{records.length ? 'No matching profiles' : 'No profiles published yet'}</strong><span>Profiles appear after an editor adds an official source, reviews the facts and publishes the verified record.</span></div> : <div className="public-data-report-grid mt-6">{visible.map((item) => <article className="public-data-report-card" key={item.id}>
      <div className="public-data-report-meta"><span>{item.office_title || 'Public representative'}</span><span className="public-data-status is-verified">Source reviewed</span></div>
      <h2>{item.full_name}</h2>
      <p className="public-data-report-summary">{item.summary || 'No additional profile summary provided.'}</p>
      <div className="public-data-report-facts">{[['Constituency', item.constituency], ['State / UT', item.state_or_ut], ['Party', item.party], ['Party as of', item.party_as_of], ['Term', [item.term_start, item.term_end].filter(Boolean).join(' – ')], ['Publisher', item.source?.name]].filter(([, value]) => value).map(([label, value]) => <span key={label}><strong>{label}</strong><span>{value}</span></span>)}</div>
      {(item.election_results || item.asset_disclosure || item.attendance_participation || item.documented_public_work) && <div className="mt-4 space-y-2 border-t border-gray-200 pt-3 text-sm">{item.election_results && <p><strong>Election results:</strong> {item.election_results}</p>}{item.asset_disclosure && <p><strong>Declared assets:</strong> {item.asset_disclosure}</p>}{item.attendance_participation && <p><strong>Participation:</strong> {item.attendance_participation}</p>}{item.documented_public_work && <p><strong>Documented public work:</strong> {item.documented_public_work}</p>}</div>}
      <div className="public-data-report-links"><a href={item.source_url} target="_blank" rel="noopener noreferrer">Original source <ExternalLink size={13} /></a></div>
      <p className="mt-3 text-xs text-gray-500">FTP profile summary; confirm claims against the linked original source. Verified {item.verified_at ? new Date(item.verified_at).toLocaleDateString('en-IN') : 'date not available'}.</p>
    </article>)}</div>}
  </main>;
}
