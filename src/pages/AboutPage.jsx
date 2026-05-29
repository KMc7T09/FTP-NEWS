import Seo from '../components/common/Seo.jsx';
import useSettings from '../hooks/useSettings.js';

export default function AboutPage() {
  const settings = useSettings();

  return (
    <>
      <Seo title="About | THE FTP NEWS" description="About THE FTP NEWS, Fresh Take Politics, an independent news and analysis platform from Odisha." />
      <section className="container-page py-10">
        <div className="max-w-4xl">
          <p className="text-sm font-extrabold uppercase tracking-wide text-brand-red">Fresh Take Politics</p>
          <h1 className="mt-2 text-4xl font-extrabold">About THE FTP NEWS</h1>
          <p className="mt-5 text-lg leading-8 text-gray-700">
            THE FTP NEWS means Fresh Take Politics. We publish independent political news, explainers, public updates, and reader-first analysis with a focus on clarity, context, and verification.
          </p>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            ['Mission', 'To explain politics and public issues in simple language for readers across Odisha and India.'],
            ['Founder', `${settings.founderName || 'KMC7T09'} is a student and full stack developer from Odisha. Author name: ${settings.authorName || 'R.C. Khotei'}.`],
            ['Editorial Promise', 'We aim to separate facts, analysis, opinion, and corrections so readers can understand what is verified and what is developing.'],
          ].map(([title, text]) => (
            <div key={title} className="news-card p-5">
              <h2 className="font-extrabold">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-gray-600">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
