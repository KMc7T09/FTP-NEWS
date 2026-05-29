import Seo from '../components/common/Seo.jsx';
import useSettings from '../hooks/useSettings.js';

export default function FounderPage() {
  const settings = useSettings();

  return (
    <>
      <Seo title="Founder | THE FTP NEWS" description="Meet KMC7T09, founder of THE FTP NEWS, a full stack developer and student from Odisha." />
      <section className="container-page py-10">
        <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
          <div className="news-card p-6">
            {settings.founderPhotoURL ? (
              <img src={settings.founderPhotoURL} alt="" className="h-28 w-28 rounded-full object-cover" />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gray-950 text-4xl font-extrabold text-white">FTP</div>
            )}
            <h1 className="mt-5 text-3xl font-extrabold">{settings.founderName || 'Founder'}</h1>
            <p className="mt-2 text-gray-600">{settings.founderTitle || 'Founder, Full Stack Developer and Student'}</p>
            <div className="mt-5 rounded-lg bg-gray-100 p-4 text-sm leading-6 text-gray-700">
              <p><strong>Based in:</strong> Odisha, India</p>
              <p><strong>Author name:</strong> {settings.authorName || 'R.C. Khotei'}</p>
              <p><strong>Contact:</strong> {settings.contactEmail}</p>
            </div>
          </div>
          <div className="news-card p-6">
            <h2 className="text-2xl font-extrabold">About The Founder</h2>
            <p className="mt-4 whitespace-pre-line leading-8 text-gray-700">{settings.founderBio}</p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {['Student', 'Full Stack Developer', 'Odisha Based'].map((item) => (
                <div key={item} className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm font-bold text-gray-800">
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
