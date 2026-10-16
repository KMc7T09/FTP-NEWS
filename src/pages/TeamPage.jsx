import Seo from '../components/common/Seo.jsx';
import useSettings from '../hooks/useSettings.js';

export default function TeamPage() {
  const settings = useSettings();
  const team = (settings.teamText || '')
    .split('\n')
    .map((line) => {
      const [name, role, photoURL, link] = line.split('|').map((part) => part?.trim());
      return name ? { name, role: role || 'Team member', photoURL, link } : null;
    })
    .filter(Boolean);

  return (
    <>
      <Seo title="Team | THE FTP NEWS" description="THE FTP NEWS editorial, politics, community, and support team." />
      <section className="container-page editorial-page team-page py-8 sm:py-12">
        <div className="editorial-hero trust-hero">
          <p className="section-kicker text-red-200">People Behind The Platform</p>
          <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">FTP Team</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-gray-200">
            This page is ready for editors, writers, reporters, designers, fact-checkers and support members. Add names, roles, photos and profile links from Settings.
          </p>
        </div>
        <div className="team-grid mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {team.length ? team.map((member) => (
            <div key={member.name} className="news-card p-5">
              {member.photoURL ? (
                <img src={member.photoURL} alt="" className="h-20 w-20 rounded-full object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-red text-xl font-extrabold text-white">{member.name.slice(0, 2)}</div>
              )}
              <h2 className="mt-4 font-extrabold">{member.name}</h2>
              <p className="mt-2 text-sm text-gray-600">{member.role}</p>
              {member.link ? (
                <a href={member.link} target="_blank" rel="noreferrer" className="mt-4 inline-flex text-sm font-bold text-brand-blue hover:text-brand-red">
                  View profile
                </a>
              ) : null}
            </div>
          )) : (
            <div className="team-empty flex min-h-44 items-center gap-5 rounded-lg border border-dashed border-gray-300 bg-white p-6 sm:col-span-2 lg:col-span-3">
              <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-md bg-gray-950 font-serif text-lg font-black text-white sm:flex">FTP</div>
              <div>
                <h2 className="font-serif text-xl font-bold">Our team directory</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">Team profiles will appear here when names, roles, photos, and links are added in newsroom settings.</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
