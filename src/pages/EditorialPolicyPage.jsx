import Seo from '../components/common/Seo.jsx';
import useSettings from '../hooks/useSettings.js';

export default function EditorialPolicyPage() {
  const settings = useSettings();
  return (
    <>
      <Seo title="Editorial Policy | THE FTP NEWS" description="Editorial policy, corrections, sourcing, and publishing standards for THE FTP NEWS." />
      <section className="container-page py-10">
        <div className="trust-hero mb-6 max-w-4xl">
          <p className="section-kicker text-red-200">Newsroom Standards</p>
          <h1 className="mt-2 text-4xl font-extrabold">Editorial Policy</h1>
          <p className="mt-3 text-sm leading-6 text-gray-300">How FTP separates news, opinion, fact-checking, updates and corrections.</p>
        </div>
        <div className="news-card max-w-4xl p-6">
          <div className="mt-6 space-y-5 text-sm leading-7 text-gray-700">
            <p>THE FTP NEWS aims to publish clear, independent, and useful political news and explainers. FTP means Fresh Take Politics.</p>
            <p>We try to verify facts before publishing. Developing stories may be updated as more reliable information becomes available.</p>
            <p>Articles should separate reported facts, analysis, and opinion. Sources or credits should be added when material is based on official statements, public records, other media reports, or external references.</p>
            <p>Corrections are welcome. Readers can use the contact page and choose the correction message type. Verified corrections may be added to the article or updated in the story.</p>
            <p>Author name: <strong>{settings.authorName || 'R.C. Khotei'}</strong>. Founder: <strong>{settings.founderName || 'KMC7T09'}</strong>.</p>
          </div>
        </div>
      </section>
    </>
  );
}
