import Seo from '../components/common/Seo.jsx';
import useSettings from '../hooks/useSettings.js';

export default function FounderPage() {
  const settings = useSettings();

  return (
    <>
      <Seo title="Founder | THE FTP NEWS" description="Meet KMC7T09, founder of THE FTP NEWS, a full stack developer and student from Odisha." />
      <section className="container-page py-10">
        <div className="founder-profile grid gap-6 lg:grid-cols-[minmax(270px,0.72fr)_1.28fr]">
          <div className="founder-identity dashboard-card">
            {settings.founderPhotoURL ? (
              <img src={settings.founderPhotoURL} alt={settings.founderName || 'KMC7T09'} className="h-56 w-full rounded-md border border-white/15 object-cover object-center" />
            ) : (
              <div className="flex aspect-[4/3] w-full items-center justify-center rounded-md border border-white/15 bg-white/5 font-serif text-7xl font-black text-white">FTP</div>
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
          <div className="founder-story news-card p-6 sm:p-9">
            <p className="section-kicker">About The Founder</p>
            <h2 className="mt-2 text-3xl font-extrabold">Building FTP as a youth-first political platform.</h2>
            <p className="mt-4 whitespace-pre-line leading-8 text-gray-700">{settings.founderBio}</p>
            <div className="mt-8 grid gap-0 divide-y divide-gray-200 border-y border-gray-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {['Student', 'Full Stack Developer', 'Odisha Based'].map((item) => (
                <div key={item} className="px-4 py-4 text-sm font-bold text-gray-800 sm:first:pl-0">
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
