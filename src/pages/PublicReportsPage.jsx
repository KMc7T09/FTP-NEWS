import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BarChart3, BookOpenCheck, BriefcaseBusiness, Building2, Cpu, Earth, ExternalLink, GraduationCap, HeartPulse, Landmark, Leaf, Scale, Search, ShieldCheck, UsersRound, Wifi } from 'lucide-react';
import { Link } from 'react-router-dom';
import Seo from '../components/common/Seo.jsx';
import { listPublicReportCategories, listPublishedReports } from '../supabase/api.js';

function displayDate(value) {
  if (!value) return 'Date not provided';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}

function verificationLabel(status) {
  return status === 'verified' ? 'FTP verified' : 'Verification pending';
}

const topics = [
  { name: 'Government & Official Reports', description: 'Publications, surveys and data released by government departments and public institutions.', icon: Landmark },
  { name: 'Politicians & Public Representatives', description: 'Publicly documented roles, terms and records with their original sources.', icon: Building2 },
  { name: 'Health & Healthcare', description: 'Health outcomes, services and access, with definitions and reference periods.', icon: HeartPulse },
  { name: 'Education & Literacy', description: 'Literacy, access and learning indicators, with coverage and limitations.', icon: GraduationCap },
  { name: 'Economy & Employment', description: 'Economic and employment measures with units, periods and publishers.', icon: BriefcaseBusiness },
  { name: 'Human Development & Poverty', description: 'Living standards and development measures, kept in their source context.', icon: UsersRound },
  { name: 'Environment & Climate', description: 'Environmental and climate observations with clear time and geographic scope.', icon: Leaf },
  { name: 'Infrastructure & Digital Access', description: 'Connectivity and public infrastructure indicators with comparable definitions.', icon: Wifi },
  { name: 'Innovation & Technology', description: 'Research, innovation and technology measures linked to their original datasets.', icon: Cpu },
  { name: 'Gender & Social Development', description: 'Social development indicators with population coverage and reporting context.', icon: UsersRound },
  { name: 'Law, Justice & Governance', description: 'Governance and justice information grounded in official records and reports.', icon: Scale },
  { name: 'State & District Data', description: 'Geographic comparisons only where the source supports a fair comparison.', icon: Earth },
  { name: 'India in the World', description: "India's published international comparisons, preserving each publisher's method.", icon: Earth },
];

export default function PublicReportsPage() {
  const [reports, setReports] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [topicQuery, setTopicQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [reportRows, categoryRows] = await Promise.all([listPublishedReports(), listPublicReportCategories()]);
      setReports(reportRows);
      setCategories(categoryRows);
    } catch (loadError) {
      setError(loadError.message || 'Public reports could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filteredReports = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return reports.filter((report) => {
      const matchesCategory = category === 'all' || report.categoryId === category;
      const matchesQuery = !normalized || [report.title, report.summary, report.category?.name, report.source?.name, report.referenceYear]
        .join(' ').toLocaleLowerCase().includes(normalized);
      return matchesCategory && matchesQuery;
    });
  }, [reports, category, query]);

  const filteredTopics = useMemo(() => {
    const normalized = topicQuery.trim().toLocaleLowerCase();
    return topics.filter((topic) => !normalized
      || topic.name.toLocaleLowerCase().includes(normalized)
      || topic.description.toLocaleLowerCase().includes(normalized));
  }, [topicQuery]);
  const selectedTopicDetails = topics.find((topic) => topic.name === selectedTopic);

  return (
    <div className="public-data-page">
      <Seo
        title="Public Reports & Data | THE FTP NEWS"
        description="Browse source-linked public reports from THE FTP NEWS, with publication dates, data reference periods, methodology and verification notes."
        url="https://the-ftp-news.netlify.app/reports"
      />
      <section className="public-data-masthead">
        <div className="container-page public-data-masthead-inner">
          <div className="public-data-title-block">
            <p className="section-kicker">THE FTP NEWS · PUBLIC DATA DESK</p>
            <h1>Public Reports<br /><span>&amp; Data</span></h1>
            <p className="public-data-intro">Browse public-data topics and source-linked reports. Topics are available now; report records appear as they are reviewed and published.</p>
            <div className="public-data-actions">
              <a href="#topics" className="btn-primary">Explore topics <ArrowRight size={16} /></a>
              <a href="#archive" className="btn-primary">Browse reports <ArrowRight size={16} /></a>
              <Link to="/rankings" className="btn-secondary"><BarChart3 size={16} /> Explore rankings</Link>
              <Link to="/editorial-policy" className="public-data-text-link">Editorial standards</Link>
            </div>
          </div>
          <aside className="public-data-principles" aria-label="Data publication principles">
            <div className="public-data-principles-heading"><ShieldCheck size={19} /><span>Our data standard</span></div>
            <p>We distinguish a publisher's reported rank from FTP News calculations. Publication year and data reference year are shown separately.</p>
            <ul>
              <li><span>01</span> Original source attached</li>
              <li><span>02</span> Methodology and scope visible</li>
              <li><span>03</span> No invented values or ranks</li>
            </ul>
            <Link to="/contact">Suggest an official source <ArrowRight size={14} /></Link>
          </aside>
          <div className="public-data-index-line" aria-hidden="true"><span>REPORT ARCHIVE</span><span>SOURCE NOTES</span><span>PUBLIC RECORDS</span></div>
        </div>
      </section>

      <section className="container-page public-data-catalogue" id="topics" aria-labelledby="topics-title">
        <div className="public-data-section-heading">
          <div><p className="section-kicker">BROWSE THE CATALOGUE</p><h2 id="topics-title">Start with a topic</h2><p>These topic areas are an index, not a claim that a report or ranking is already available.</p></div>
          <label className="public-data-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Search public data topics</span><input value={topicQuery} onChange={(event) => setTopicQuery(event.target.value)} placeholder="Search topics" />{topicQuery && <button type="button" onClick={() => setTopicQuery('')} aria-label="Clear topic search">×</button>}</label>
        </div>
        <div className="public-data-directory-layout">
          <div className="public-data-topic-grid" aria-label="Public data topics">
            {filteredTopics.map(({ name, description, icon: Icon }, index) => <button className={`public-data-topic${selectedTopic === name ? ' is-selected' : ''}`} key={name} type="button" aria-pressed={selectedTopic === name} onClick={() => setSelectedTopic((current) => current === name ? '' : name)}>
              <span className="public-data-topic-index">{String(index + 1).padStart(2, '0')}</span><span className="public-data-topic-icon"><Icon size={19} strokeWidth={1.8} /></span><span className="public-data-topic-copy"><strong>{name}</strong><span>{description}</span></span><ArrowRight className="public-data-topic-arrow" size={17} aria-hidden="true" />
            </button>)}
            {!filteredTopics.length && <div className="public-data-no-topics" role="status">No topics match “{topicQuery}”. Try a broader search.</div>}
          </div>
          <aside className="public-data-results" aria-live="polite"><div className="public-data-results-topline"><BookOpenCheck size={17} /> REPORT INDEX</div><p className="public-data-results-kicker">{selectedTopicDetails ? 'SELECTED TOPIC' : 'CURRENT CATALOGUE'}</p><h3>{selectedTopicDetails?.name || 'Source-verified records'}</h3><p className="public-data-results-copy">{selectedTopicDetails?.description || 'Reports are listed below after their source, edition, scope and methodology have been reviewed.'}</p><div className="public-data-empty-state"><span className="public-data-empty-mark"><Search size={19} /></span><strong>Topics are ready to browse</strong><span>Open the report archive below to see source-reviewed publications. Topic labels do not stand in for missing data.</span></div><Link to="/rankings" className="public-data-source-link">Explore published rankings <ArrowRight size={14} /></Link></aside>
        </div>
      </section>

      <section className="container-page public-data-catalogue" id="archive" aria-labelledby="archive-title">
        <div className="public-data-section-heading">
          <div>
            <p className="section-kicker">SOURCE-LED ARCHIVE</p>
            <h2 id="archive-title">Public reports</h2>
            <p>Only published records appear here. A report's publisher, publication date and data period are kept distinct.</p>
          </div>
          <label className="public-data-search">
            <Search size={17} aria-hidden="true" />
            <span className="sr-only">Search published reports</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reports, topics, publishers" />
            {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear report search">×</button>}
          </label>
        </div>

        <div className="public-data-filters">
          <label htmlFor="report-category-filter">Category</label>
          <select id="report-category-filter" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">All categories</option>
            {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <span>{loading ? 'Loading archive' : `${filteredReports.length} report${filteredReports.length === 1 ? '' : 's'}`}</span>
        </div>

        {loading ? (
          <div className="public-data-report-grid" aria-label="Loading public reports">
            {[0, 1, 2].map((item) => <div className="public-data-report-skeleton" key={item} />)}
          </div>
        ) : error ? (
          <div className="public-data-feedback public-data-feedback-error" role="alert">
            <strong>Reports unavailable</strong><span>{error}</span><button type="button" className="btn-secondary" onClick={load}>Try again</button>
          </div>
        ) : filteredReports.length ? (
          <div className="public-data-report-grid">
            {filteredReports.map((report) => (
              <article className="public-data-report-card" key={report.id}>
                <div className="public-data-report-meta"><span>{report.category?.name || 'Public report'}</span><span className={`public-data-status ${report.verificationStatus === 'verified' ? 'is-verified' : ''}`}>{verificationLabel(report.verificationStatus)}</span></div>
                <h3><Link to={`/reports/${report.slug}`}>{report.title}</Link></h3>
                <p className="public-data-report-summary">{report.summary || 'Open the report for source and methodology details.'}</p>
                <div className="public-data-report-facts">
                  <span><strong>Publisher</strong>{report.source?.name || 'Not listed'}</span>
                  <span><strong>Published</strong>{report.publicationYear || displayDate(report.publicationDate)}</span>
                  <span><strong>Data period</strong>{report.referenceYear || 'Not specified'}</span>
                </div>
                <div className="public-data-report-links">
                  <Link to={`/reports/${report.slug}`}>Report details <ArrowRight size={15} /></Link>
                  {report.sourceURL && <a href={report.sourceURL} target="_blank" rel="noreferrer">Original source <ExternalLink size={14} /></a>}
                </div>
              </article>
            ))}
          </div>
        ) : reports.length ? (
          <div className="public-data-feedback" role="status"><strong>No matching reports</strong><span>Change the search or choose another category.</span></div>
        ) : (
          <div className="public-data-feedback" role="status"><BookOpenCheck size={22} /><strong>No reports have been published yet</strong><span>The archive will show a report after an administrator adds its source and methodology, verifies it, and publishes it.</span></div>
        )}
      </section>
    </div>
  );
}
