import Seo from '../components/common/Seo.jsx';
import useSettings from '../hooks/useSettings.js';

export default function FounderPage() {
  const settings = useSettings();

  return (
    <>
      <Seo title="Founder | THE FTP NEWS" description="Meet KMC7T09, founder of THE FTP NEWS, a full stack developer and student from Odisha." />
      <section className="container-page py-10">
        <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
          <div className="dashboard-card">
            {settings.founderPhotoURL ? (
              <img src={settings.founderPhotoURL} alt={settings.founderName || 'KMC7T09'} className="h-32 w-32 rounded-full border-4 border-white/20 object-cover" />
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-brand-red text-4xl font-extrabold text-white">FTP</div>
            )}
            <p className="mt-6 section-kicker text-red-200">Founder</p>
            <h1 className="mt-2 text-3xl font-extrabold">{settings.founderName || 'KMC7T09'}</h1>
            <p className="mt-2 text-gray-300">{settings.founderTitle || 'Founder, Full Stack Developer and Student'}</p>
            <div className="mt-5 rounded-lg bg-white/10 p-4 text-sm leading-6 text-gray-200">
              <p><strong>Based in:</strong> Odisha, India</p>
              <p><strong>Author name:</strong> {settings.authorName || 'R.C. Khotei'}</p>
              <p><strong>Contact:</strong> {settings.contactEmail}</p>
            </div>
          </div>
          <div className="news-card p-6 sm:p-8">
            <p className="section-kicker">About The Founder</p>
            <h2 className="mt-2 text-3xl font-extrabold">Building FTP as a youth-first political platform.</h2>
            <p className="mt-4 whitespace-pre-line leading-8 text-gray-700">{settings.founderBio}</p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {['Student', 'Full Stack Developer', 'Odisha Based'].map((item) => (
                <div key={item} className="rounded-lg border border-gray-200 bg-[#fbfaf7] p-4 text-sm font-bold text-gray-800">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
