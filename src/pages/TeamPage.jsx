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
      <section className="container-page py-10">
        <p className="text-sm font-extrabold uppercase tracking-wide text-brand-red">People Behind The Platform</p>
        <h1 className="mt-2 text-4xl font-extrabold">Team</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-gray-600">
          This page is ready for editors, writers, reporters, designers, and support members. Send names, roles, photos, and profile links whenever you want to add them.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {team.map((member) => (
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
          ))}
        </div>
      </section>
    </>
  );
}
