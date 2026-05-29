import { Link } from 'react-router-dom';
import useSettings from '../../hooks/useSettings.js';

export default function Footer() {
  const settings = useSettings();
  const socials = Object.entries(settings.socialLinks || {}).filter(([, value]) => value);
  const year = new Date().getFullYear();

  return (
    <footer className="mt-14 bg-gray-950 text-white">
      <div className="container-page grid gap-8 py-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <h2 className="font-serif text-2xl font-bold">{settings.websiteName}</h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-gray-300">{settings.footerText}</p>
        </div>
        <div>
          <h3 className="font-bold">Categories</h3>
          <div className="mt-3 grid gap-2 text-sm text-gray-300">
            {['Politics', 'Business', 'Technology', 'Sports', 'Entertainment'].map((item) => (
              <Link key={item} to={`/category/${item.toLowerCase()}`} className="hover:text-white">
                {item}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-bold">Trust</h3>
          <div className="mt-3 grid gap-2 text-sm text-gray-300">
            <Link to="/about" className="hover:text-white">About</Link>
            <Link to="/contact" className="hover:text-white">Contact</Link>
            <Link to="/founder" className="hover:text-white">Founder</Link>
            <Link to="/team" className="hover:text-white">Team</Link>
            <span>{settings.contactEmail}</span>
          </div>
        </div>
        <div>
          <h3 className="font-bold">Social</h3>
          <div className="mt-3 grid gap-2 text-sm text-gray-300">
            {socials.length ? (
              socials.map(([name, url]) => (
                <a key={name} href={url} target="_blank" rel="noreferrer" className="capitalize hover:text-white">
                  {name}
                </a>
              ))
            ) : (
              <span>Add social handles from Settings</span>
            )}
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-3 py-4 text-xs text-gray-400 sm:flex-row sm:items-center sm:justify-between">
          <p>Copyright © {year} {settings.websiteName || 'THE FTP NEWS'}. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            <Link to="/privacy-policy" className="hover:text-white">Privacy</Link>
            <Link to="/terms" className="hover:text-white">Terms</Link>
            <Link to="/editorial-policy" className="hover:text-white">Editorial Policy</Link>
            <Link to="/disclaimer" className="hover:text-white">Disclaimer</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
