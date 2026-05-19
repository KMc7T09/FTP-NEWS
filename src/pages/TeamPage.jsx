import Seo from '../components/common/Seo.jsx';

const team = [
  { name: 'Editorial Desk', role: 'News and verification' },
  { name: 'Politics Desk', role: 'Fresh Take Politics coverage' },
  { name: 'Community Desk', role: 'Reader tips and corrections' },
];

export default function TeamPage() {
  return (
    <>
      <Seo title="Team | FTP NEWS" description="FTP NEWS team details." />
      <section className="container-page py-10">
        <h1 className="text-4xl font-extrabold">Team</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-gray-600">
          Add your editors, writers, reporters, designers, and support members here.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {team.map((member) => (
            <div key={member.name} className="news-card p-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-red text-xl font-extrabold text-white">{member.name.slice(0, 2)}</div>
              <h2 className="mt-4 font-extrabold">{member.name}</h2>
              <p className="mt-2 text-sm text-gray-600">{member.role}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
