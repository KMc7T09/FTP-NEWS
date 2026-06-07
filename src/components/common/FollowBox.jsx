import { Link } from 'react-router-dom';
import { Radio } from 'lucide-react';
import useSettings from '../../hooks/useSettings.js';

export default function FollowBox() {
  const settings = useSettings();
  const socials = Object.entries(settings.socialLinks || {}).filter(([, value]) => value);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-center gap-2">
        <Radio size={20} className="text-brand-red" />
        <h2 className="text-lg font-extrabold">Follow FTP</h2>
      </div>
      <p className="mt-3 text-sm leading-6 text-gray-600">Fresh Take Politics covers politics, Odisha, India, opinion, and fact-check stories.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {socials.length ? socials.map(([name, url]) => (
          <a key={name} href={url} target="_blank" rel="noreferrer" className="btn-secondary capitalize">
            {name}
          </a>
        )) : (
          <Link to="/contact" className="btn-secondary">Contact FTP</Link>
        )}
      </div>
    </div>
  );
}
