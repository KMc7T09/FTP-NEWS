import { ArrowUpRight, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import useSettings from '../../hooks/useSettings.js';

export default function Footer() {
  const settings = useSettings();
  const socials = Object.entries(settings.socialLinks || {}).filter(([, value]) => value);
  const year = new Date().getFullYear();
  const categories = ['Politics', 'India', 'Odisha', 'World', 'Opinion', 'Fact Check', 'Youth'];

  return (
    <footer className="mt-14 bg-gray-950 text-white">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:py-12">
        <div>
          <h2 className="font-serif text-4xl font-bold">FTP</h2>
          <p className="mt-1 text-xs font-extrabold uppercase tracking-[0.2em] text-red-200">Fresh Take Politics</p>
          <p className="mt-3 max-w-md text-sm leading-6 text-gray-300">{settings.footerText}</p>
        </div>
        <div>
          <h3 className="font-bold">Categories</h3>
          <div className="mt-3 grid gap-2 text-sm text-gray-300">
            {categories.map((item) => (
              <Link key={item} to={`/category/${item.toLowerCase().replaceAll(' ', '-')}`} className="hover:text-white">
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
            {settings.contactEmail && <a className="inline-flex items-center gap-2 hover:text-white" href={`mailto:${settings.contactEmail}`}><Mail size={14} /> {settings.contactEmail}</a>}
          </div>
        </div>
        <div>
          <h3 className="font-bold">Social</h3>
          <div className="mt-3 grid gap-2 text-sm text-gray-300">
            {socials.length ? (
              socials.map(([name, url]) => (
                  <a key={name} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 capitalize hover:text-white">
                    {name} <ArrowUpRight size={13} />
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
          <p>Copyright © {year} FTP - Fresh Take Politics. All rights reserved.</p>
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
