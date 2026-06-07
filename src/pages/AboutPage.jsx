import Seo from '../components/common/Seo.jsx';
import useSettings from '../hooks/useSettings.js';

export default function AboutPage() {
  const settings = useSettings();

  return (
    <>
      <Seo title="About | THE FTP NEWS" description="About THE FTP NEWS, Fresh Take Politics, an independent news and analysis platform from Odisha." />
      <section className="container-page py-10">
        <div className="trust-hero">
          <p className="section-kicker text-red-200">Fresh Take Politics</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-extrabold leading-tight sm:text-5xl">Independent political news for young India.</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-gray-200">
            FTP means Fresh Take Politics. We publish political news, explainers, public updates, opinion and fact-check stories with a focus on clarity, context, and reader trust.
          </p>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            ['Mission', 'Explain politics and public issues in simple, serious language for readers across Odisha and India.'],
            ['Founder', `${settings.founderName || 'KMC7T09'} is a student and full stack developer from Odisha. Author name: ${settings.authorName || 'R.C. Khotei'}.`],
            ['Editorial Promise', 'Separate news, analysis, opinion, fact-check and corrections so readers know what is verified and what is developing.'],
          ].map(([title, text]) => (
            <div key={title} className="news-card p-6">
              <h2 className="font-extrabold">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-gray-600">{text}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <div className="news-card p-6">
            <p className="section-kicker">What FTP Covers</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {['Politics', 'India', 'Odisha', 'World', 'Opinion', 'Fact Check', 'Youth'].map((item) => (
                <span key={item} className="rounded-md bg-gray-50 px-4 py-3 text-sm font-extrabold text-gray-900">{item}</span>
              ))}
            </div>
          </div>
          <div className="news-card p-6">
            <p className="section-kicker">Reader Trust</p>
            <p className="mt-4 text-sm leading-7 text-gray-600">
              Every serious article should show author, date, category, reading time, source/reference and correction path. This helps FTP grow as a credible political platform, not just a posting site.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
