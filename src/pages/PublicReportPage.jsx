import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, ExternalLink, FileText, ShieldCheck } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import Seo from '../components/common/Seo.jsx';
import { getPublishedReportBySlug } from '../supabase/api.js';

function formatDate(value) {
  if (!value) return 'Not provided';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}

function TextBlock({ title, children }) {
  if (!children) return null;
  return <section className="public-report-section"><h2>{title}</h2><div>{children.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div></section>;
}

export default function PublicReportPage() {
  const { slug } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setReport(await getPublishedReportBySlug(slug)); }
    catch (loadError) { setError(loadError.message || 'This report could not be loaded.'); }
    finally { setLoading(false); }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <main className="container-page public-report-state"><div className="public-data-report-skeleton" /><p role="status">Loading report…</p></main>;
  if (error) return <main className="container-page public-report-state" role="alert"><h1>Report unavailable</h1><p>{error}</p><button className="btn-secondary" onClick={load}>Try again</button><Link to="/reports">Back to reports</Link></main>;
  if (!report) return <main className="container-page public-report-state"><h1>Report not found</h1><p>This report may be unpublished or the link may be incorrect.</p><Link className="btn-secondary" to="/reports"><ArrowLeft size={16} /> Browse reports</Link></main>;

  return (
    <article className="container-page public-report-detail">
      <Seo
        title={`${report.title} | Public Reports | THE FTP NEWS`}
        description={report.summary || `${report.title}: source, reporting period and methodology from THE FTP NEWS Public Data Desk.`}
        url={`https://the-ftp-news.netlify.app/reports/${report.slug}`}
      />
      <Link className="public-report-back" to="/reports"><ArrowLeft size={16} /> All public reports</Link>
      <header className="public-report-header">
        <div className="public-report-eyebrow"><span>{report.category?.name || 'Public report'}</span><span className={`public-data-status ${report.verificationStatus === 'verified' ? 'is-verified' : ''}`}><ShieldCheck size={13} /> {report.verificationStatus === 'verified' ? 'Verified by FTP News' : 'Verification pending'}</span></div>
        <h1>{report.title}</h1>
        {report.summary && <p className="public-report-summary">{report.summary}</p>}
        <div className="public-report-metadata">
          <span><strong>Publisher</strong>{report.source?.name || 'Not listed'}</span>
          <span><strong>Publication date</strong><span className="inline-flex items-center gap-1"><CalendarDays size={14} />{formatDate(report.publicationDate)}</span></span>
          <span><strong>Publication year</strong>{report.publicationYear || 'Not provided'}</span>
          <span><strong>Reporting period</strong>{report.referencePeriod || report.referenceYear || 'Not specified by source'}</span>
          {report.verificationStatus === 'verified' && <span><strong>FTP verification</strong>{formatDate(report.verifiedAt?.slice(0, 10))}</span>}
        </div>
      </header>

      <div className="public-report-layout">
        <div className="public-report-content">
          <TextBlock title="Report overview">{report.body}</TextBlock>
          <TextBlock title="Methodology">{report.methodology}</TextBlock>
          <TextBlock title="Scope and coverage">{report.scopeNotes}</TextBlock>
          <TextBlock title="Limitations">{report.limitations}</TextBlock>
        </div>
        <aside className="public-report-source-panel">
          <p className="section-kicker">ORIGINAL MATERIAL</p>
          <h2>{report.source?.name || 'Publisher/source'}</h2>
          {report.source?.organizationType && <p>{report.source.organizationType}{report.source.jurisdiction ? ` · ${report.source.jurisdiction}` : ''}</p>}
          {report.sourceURL && <a href={report.sourceURL} target="_blank" rel="noreferrer">Open original source <ExternalLink size={15} /></a>}
          {report.documentURL && <a href={report.documentURL} target="_blank" rel="noreferrer"><FileText size={15} /> Open source document <ExternalLink size={14} /></a>}
          {report.source?.websiteURL && <a href={report.source.websiteURL} target="_blank" rel="noreferrer">Publisher website <ExternalLink size={14} /></a>}
          <p className="public-report-source-note">The source document and FTP News explanation are separate. Use the publisher's original material for full context.</p>
        </aside>
      </div>
    </article>
  );
}
