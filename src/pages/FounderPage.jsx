import Seo from '../components/common/Seo.jsx';
import useSettings from '../hooks/useSettings.js';

export default function FounderPage() {
  const settings = useSettings();

  return (
    <>
      <Seo title="Founder | FTP NEWS" description="Founder details for FTP NEWS." />
      <section className="container-page py-10">
        <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
          <div className="news-card p-6">
            {settings.founderPhotoURL ? (
              <img src={settings.founderPhotoURL} alt="" className="h-28 w-28 rounded-full object-cover" />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gray-950 text-4xl font-extrabold text-white">FTP</div>
            )}
            <h1 className="mt-5 text-3xl font-extrabold">{settings.founderName || 'Founder'}</h1>
            <p className="mt-2 text-gray-600">{settings.founderTitle || 'Fresh Take Politics'}</p>
          </div>
          <div className="news-card p-6">
            <h2 className="text-2xl font-extrabold">About The Founder</h2>
            <p className="mt-4 whitespace-pre-line leading-8 text-gray-700">{settings.founderBio}</p>
          </div>
        </div>
      </section>
    </>
  );
}
