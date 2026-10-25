import { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpenCheck,
  BriefcaseBusiness,
  Building2,
  Cpu,
  Earth,
  GraduationCap,
  HeartPulse,
  Landmark,
  Leaf,
  Scale,
  Search,
  ShieldCheck,
  UsersRound,
  Wifi,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Seo from '../components/common/Seo.jsx';

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
  const [query, setQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const filteredTopics = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return topics.filter((topic) => (
      !normalizedQuery
      || topic.name.toLocaleLowerCase().includes(normalizedQuery)
      || topic.description.toLocaleLowerCase().includes(normalizedQuery)
    ));
  }, [query]);

  const selected = topics.find((topic) => topic.name === selectedTopic);

  return (
    <div className="public-data-page">
      <Seo
        title="Public Reports & Data | THE FTP NEWS"
        description="Explore source-led public reports and data topics from THE FTP NEWS. Rankings and comparisons will be published with their source, reporting period and methodology."
        url="https://the-ftp-news.netlify.app/reports"
      />

      <section className="public-data-masthead">
        <div className="container-page public-data-masthead-inner">
          <div className="public-data-title-block">
            <p className="section-kicker">THE FTP NEWS · PUBLIC DATA DESK</p>
            <h1>Public Reports<br /><span>&amp; Data</span></h1>
            <p className="public-data-intro">
              Evidence, explained with its source, time period and limits. Browse a topic to see what belongs in the catalogue; verified records will appear as they are reviewed and published.
            </p>
            <div className="public-data-actions">
              <a href="#topics" className="btn-primary">Explore topics <ArrowRight size={16} /></a>
              <Link to="/" className="public-data-text-link">Back to the newsroom</Link>
            </div>
          </div>
          <aside className="public-data-principles" aria-label="Data publication principles">
            <div className="public-data-principles-heading">
              <ShieldCheck size={19} />
              <span>Our data standard</span>
            </div>
            <p>Numbers need context. Every published record should identify who produced it, what period it covers and how it was measured.</p>
            <ul>
              <li><span>01</span> Source before ranking</li>
              <li><span>02</span> Reference year kept visible</li>
              <li><span>03</span> Missing data stays missing</li>
            </ul>
            <Link to="/editorial-policy">Read our editorial policy <ArrowRight size={14} /></Link>
          </aside>
          <div className="public-data-index-line" aria-hidden="true"><span>REPORTS</span><span>INDICATORS</span><span>PUBLIC RECORDS</span></div>
        </div>
      </section>

      <section className="container-page public-data-catalogue" id="topics" aria-labelledby="topics-title">
        <div className="public-data-section-heading">
          <div>
            <p className="section-kicker">BROWSE THE CATALOGUE</p>
            <h2 id="topics-title">Start with a topic</h2>
            <p>Choose a subject area, or search the catalogue. Topic names are an index, not a claim that a ranking or dataset is already available.</p>
          </div>
          <label className="public-data-search">
            <Search size={17} aria-hidden="true" />
            <span className="sr-only">Search public data topics</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search topics" />
            {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear topic search">×</button>}
          </label>
        </div>

        <div className="public-data-directory-layout">
          <div className="public-data-topic-grid" aria-label="Public data topics">
            {filteredTopics.map(({ name, description, icon: Icon }, index) => (
              <button
                className={`public-data-topic${selectedTopic === name ? ' is-selected' : ''}`}
                key={name}
                type="button"
                aria-pressed={selectedTopic === name}
                onClick={() => setSelectedTopic((current) => current === name ? '' : name)}
              >
                <span className="public-data-topic-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="public-data-topic-icon"><Icon size={19} strokeWidth={1.8} /></span>
                <span className="public-data-topic-copy">
                  <strong>{name}</strong>
                  <span>{description}</span>
                </span>
                <ArrowRight className="public-data-topic-arrow" size={17} aria-hidden="true" />
              </button>
            ))}
            {filteredTopics.length === 0 && (
              <div className="public-data-no-topics" role="status">No topics match “{query}”. Try a broader search.</div>
            )}
          </div>

          <aside className="public-data-results" aria-live="polite">
            <div className="public-data-results-topline"><BookOpenCheck size={17} /> REPORT INDEX</div>
            <p className="public-data-results-kicker">{selected ? 'SELECTED TOPIC' : 'CURRENT CATALOGUE'}</p>
            <h3>{selected?.name || 'Source-verified records'}</h3>
            <p className="public-data-results-copy">
              {selected?.description || 'The catalogue will distinguish published source rankings from FTP News calculations and keep reporting periods visible.'}
            </p>
            <div className="public-data-empty-state">
              <span className="public-data-empty-mark"><Search size={19} /></span>
              <strong>No verified reports published yet</strong>
              <span>We will not fill this space with sample figures. Records will be listed after their source, edition, scope and methodology are checked.</span>
            </div>
            <Link to="/contact" className="public-data-source-link">Suggest an official source <ArrowRight size={14} /></Link>
          </aside>
        </div>
      </section>

      <section className="public-data-method-band" aria-label="How public data is presented">
        <div className="container-page public-data-method-inner">
          <div><span className="public-data-method-number">01</span><strong>Find the original</strong><p>Publisher and source links stay attached to the report.</p></div>
          <div><span className="public-data-method-number">02</span><strong>Read the measure</strong><p>Units, coverage and reference periods explain what is being compared.</p></div>
          <div><span className="public-data-method-number">03</span><strong>Check the limits</strong><p>Missing values and methodology notes remain visible to readers.</p></div>
        </div>
      </section>
    </div>
  );
}
