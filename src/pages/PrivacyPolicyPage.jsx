import Seo from '../components/common/Seo.jsx';
import useSettings from '../hooks/useSettings.js';

export default function PrivacyPolicyPage() {
  const settings = useSettings();
  return (
    <>
      <Seo title="Privacy Policy | THE FTP NEWS" description="Privacy Policy for THE FTP NEWS readers, account users, commenters, and contact form users." />
      <section className="container-page py-10">
        <div className="trust-hero mb-6 max-w-4xl">
          <p className="section-kicker text-red-200">Reader Trust</p>
          <h1 className="mt-2 text-4xl font-extrabold">Privacy Policy</h1>
          <p className="mt-3 text-sm leading-6 text-gray-300">How FTP handles account, contact, analytics and community data.</p>
        </div>
        <div className="news-card max-w-4xl p-6">
          <div className="mt-6 space-y-5 text-sm leading-7 text-gray-700">
            <p>THE FTP NEWS collects only the information needed to run reader accounts, comments, bookmarks, contact messages, and publishing features.</p>
            <p>Account login is handled by Supabase Authentication. We do not store user passwords in our public database.</p>
            <p>When you contact us, we store your name, email, subject, message type, and message so the admin team can respond or review your request.</p>
            <p>Comments, likes, bookmarks, and profile details may be stored to provide interactive website features. Public comments may be visible to other readers after moderation.</p>
            <p>We may use analytics, hosting logs, and security tools to protect the website and understand performance. Advertising tools may be added in the future with proper disclosure.</p>
            <p>To request correction or deletion of personal information, contact: <strong>{settings.contactEmail}</strong>.</p>
          </div>
        </div>
      </section>
    </>
  );
}
