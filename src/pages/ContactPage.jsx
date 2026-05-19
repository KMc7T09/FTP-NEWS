import Seo from '../components/common/Seo.jsx';
import useSettings from '../hooks/useSettings.js';

export default function ContactPage() {
  const settings = useSettings();
  return (
    <>
      <Seo title="Contact | FTP NEWS" description="Contact FTP NEWS for tips, corrections, partnerships, and editorial queries." />
      <section className="container-page py-10">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-extrabold">Contact FTP NEWS</h1>
          <p className="mt-4 text-lg leading-8 text-gray-600">
            Send news tips, correction requests, partnership queries, and editorial messages to our desk.
          </p>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="news-card p-5">
            <h2 className="font-extrabold">News Desk</h2>
            <p className="mt-3 text-sm text-gray-600">{settings.contactEmail}</p>
          </div>
          <div className="news-card p-5">
            <h2 className="font-extrabold">Corrections</h2>
            <p className="mt-3 text-sm text-gray-600">Share the article link and explain the correction clearly.</p>
          </div>
          <div className="news-card p-5">
            <h2 className="font-extrabold">Partnerships</h2>
            <p className="mt-3 text-sm text-gray-600">For ads, collaborations, and sponsorship discussions.</p>
          </div>
        </div>
      </section>
    </>
  );
}
