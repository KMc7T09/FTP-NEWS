import Seo from '../components/common/Seo.jsx';

export default function FounderPage() {
  return (
    <>
      <Seo title="Founder | FTP NEWS" description="Founder details for FTP NEWS." />
      <section className="container-page py-10">
        <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
          <div className="news-card p-6">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gray-950 text-4xl font-extrabold text-white">FTP</div>
            <h1 className="mt-5 text-3xl font-extrabold">Founder</h1>
            <p className="mt-2 text-gray-600">Add founder name, photo, and social links from this page file.</p>
          </div>
          <div className="news-card p-6">
            <h2 className="text-2xl font-extrabold">About The Founder</h2>
            <p className="mt-4 leading-8 text-gray-700">
              FTP NEWS stands for Fresh Take Politics. The mission is to publish clear, independent, and useful reporting for readers across India.
            </p>
            <p className="mt-4 leading-8 text-gray-700">
              You can replace this text with the founder biography, journey, vision, contact details, and public social handles.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
