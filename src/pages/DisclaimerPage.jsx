import Seo from '../components/common/Seo.jsx';
import useSettings from '../hooks/useSettings.js';

export default function DisclaimerPage() {
  const settings = useSettings();
  return (
    <>
      <Seo title="Disclaimer | THE FTP NEWS" description="Disclaimer for THE FTP NEWS articles, analysis, external links, and public information." />
      <section className="container-page py-10">
        <div className="news-card max-w-4xl p-6">
          <h1 className="text-4xl font-extrabold">Disclaimer</h1>
          <div className="mt-6 space-y-5 text-sm leading-7 text-gray-700">
            <p>THE FTP NEWS publishes news, analysis, explainers, and public-interest information. Content is provided for general information and should not be treated as legal, financial, medical, or professional advice.</p>
            <p>Political analysis and opinion may reflect interpretation based on available information. We aim for accuracy but cannot guarantee that every developing update is complete at the time of publication.</p>
            <p>External links, sources, or embedded material belong to their respective owners. We are not responsible for content or policies on external websites.</p>
            <p>For corrections, removal requests, or rights concerns, contact: <strong>{settings.contactEmail}</strong>.</p>
          </div>
        </div>
      </section>
    </>
  );
}
