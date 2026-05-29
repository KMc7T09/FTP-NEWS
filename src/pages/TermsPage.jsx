import Seo from '../components/common/Seo.jsx';
import useSettings from '../hooks/useSettings.js';

export default function TermsPage() {
  const settings = useSettings();
  return (
    <>
      <Seo title="Terms | THE FTP NEWS" description="Terms and conditions for using THE FTP NEWS." />
      <section className="container-page py-10">
        <div className="news-card max-w-4xl p-6">
          <h1 className="text-4xl font-extrabold">Terms and Conditions</h1>
          <div className="mt-6 space-y-5 text-sm leading-7 text-gray-700">
            <p>By using THE FTP NEWS, you agree to use the website lawfully and respectfully.</p>
            <p>Readers may comment, like, bookmark, and report content. Abusive, vulgar, spam, or illegal content may be hidden, deleted, or sent for moderation.</p>
            <p>Website articles are for public information and analysis. Do not copy, republish, or commercially reuse our content without permission.</p>
            <p>We may edit, update, correct, remove, or archive content when needed for accuracy, safety, or legal reasons.</p>
            <p>For permissions, corrections, or complaints, contact: <strong>{settings.contactEmail}</strong>.</p>
          </div>
        </div>
      </section>
    </>
  );
}
