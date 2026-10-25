import { ArrowUpRight, Instagram, Mail, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import useSettings from '../../hooks/useSettings.js';

export default function Footer() {
  const settings = useSettings();
  const socialLinks = settings.socialLinks || {};
  const socials = [
    { name: 'Instagram', url: socialLinks.instagram || 'https://www.instagram.com/freshtakepolitics?igsh=MTJmYXlrdWxieGt1cg==', icon: Instagram },
    { name: 'WhatsApp', url: socialLinks.whatsapp || 'https://wa.me/918458025633', icon: MessageCircle },
  ];
  const contactEmail = settings.contactEmail || 'freshtakepolitics@gmail.com';
  const year = new Date().getFullYear();
  const categories = ['Politics', 'India', 'Odisha', 'World', 'Opinion', 'Fact Check', 'Youth'];

  return (
    <footer className="site-footer mt-14 bg-gray-950 text-white">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:py-14">
        <div>
          <p className="section-kicker text-red-300">Independent digital newsroom</p>
          <h2 className="mt-2 font-serif text-5xl font-bold">THE FTP NEWS</h2>
          <p className="mt-2 text-xs font-extrabold uppercase tracking-[0.2em] text-red-200">Fresh Take Politics</p>
          <p className="mt-4 max-w-md text-sm leading-7 text-gray-300">{settings.footerText || 'Independent reporting, clear context, and verified updates from Odisha and across India.'}</p>
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
            <Link to="/reports" className="hover:text-white">Public Reports &amp; Data</Link>
            <Link to="/about" className="hover:text-white">About</Link>
            <Link to="/contact" className="hover:text-white">Contact</Link>
            <Link to="/founder" className="hover:text-white">Founder</Link>
            <Link to="/team" className="hover:text-white">Team</Link>
            <a className="inline-flex items-center gap-2 hover:text-white" href={`mailto:${contactEmail}`}><Mail size={14} /> {contactEmail}</a>
          </div>
        </div>
        <div>
          <h3 className="font-bold">Social</h3>
          <div className="mt-3 grid gap-2 text-sm text-gray-300">
            {socials.map(({ name, url, icon: Icon }) => (
              <a key={name} href={url} target="_blank" rel="noreferrer" aria-label={`THE FTP NEWS on ${name}`} className="inline-flex w-fit items-center gap-2 rounded-md px-2 py-2 transition hover:bg-white/10 hover:text-white focus-visible:outline-white">
                <Icon size={17} /> {name} <ArrowUpRight size={13} />
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-3 py-4 text-xs text-gray-400 sm:flex-row sm:items-center sm:justify-between">
          <p>Copyright © {year} THE FTP NEWS · Fresh Take Politics. All rights reserved.</p>
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
