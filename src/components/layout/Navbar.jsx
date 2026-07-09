import { CalendarDays, LogOut, Menu, Search, User, UserPlus, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import useSettings from '../../hooks/useSettings.js';
import { useAuth } from '../../context/AuthContext.jsx';

const navItems = [
  ['Home', '/'],
  ['Politics', '/category/politics'],
  ['India', '/category/india'],
  ['Odisha', '/category/odisha'],
  ['World', '/category/world'],
  ['Opinion', '/category/opinion'],
  ['Fact Check', '/category/fact-check'],
  ['Youth', '/category/youth'],
  ['Weather', '/weather'],
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const navigate = useNavigate();
  const settings = useSettings();
  const { currentUser, isAdmin, isEditor, logout } = useAuth();
  const today = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

  function submitSearch(event) {
    event.preventDefault();
    if (term.trim()) navigate(`/search?q=${encodeURIComponent(term.trim())}`);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-300 bg-white/95 backdrop-blur">
      <div className="border-b border-gray-200 bg-gray-950 text-white">
        <div className="container-page flex min-h-9 items-center justify-between gap-3 text-xs font-semibold">
          <span className="hidden items-center gap-2 sm:inline-flex"><CalendarDays size={14} /> {today}</span>
          <span className="section-kicker text-red-200">Independent Digital News Platform</span>
          <button className="inline-flex items-center gap-1 hover:text-red-200" onClick={() => navigate('/search')}>
            <Search size={14} /> Search
          </button>
        </div>
      </div>
      <div className="container-page flex min-h-20 items-center justify-between gap-3 py-3">
        <button className="rounded-md p-2 hover:bg-gray-100 lg:hidden" onClick={() => setOpen((value) => !value)} aria-label="Open menu">
          {open ? <X /> : <Menu />}
        </button>
        <Link to="/" className="min-w-0 text-center lg:text-left">
          {settings.logoURL ? <img src={settings.logoURL} alt="FTP logo" className="mx-auto mb-1 h-10 w-10 rounded object-cover lg:mx-0" loading="lazy" /> : null}
          <span className="block font-serif text-4xl font-extrabold leading-none tracking-normal text-gray-950 sm:text-5xl">FTP</span>
          <span className="mt-1 block text-[11px] font-extrabold uppercase tracking-[0.22em] text-brand-red">Fresh Take Politics</span>
        </Link>
        <form onSubmit={submitSearch} className="hidden w-72 items-center rounded-md border border-gray-200 bg-gray-50 px-3 lg:flex">
          <Search size={17} className="text-gray-400" />
          <input className="w-full bg-transparent px-2 py-2 text-sm outline-none" placeholder="Search news" value={term} onChange={(event) => setTerm(event.target.value)} />
        </form>
        <div className="flex items-center gap-2">
          {currentUser ? (
            <>
              <Link to="/profile" className="btn-secondary px-3" aria-label="Profile">
                <User size={17} /> <span className="hidden sm:inline">Profile</span>
              </Link>
              {(isAdmin || isEditor) && <Link to="/admin/dashboard" className="btn-secondary hidden sm:inline-flex">Admin</Link>}
              <button onClick={logout} className="rounded-md p-2 text-gray-700 hover:bg-gray-100" aria-label="Log out"><LogOut size={19} /></button>
            </>
          ) : (
            <Link to="/login" className="btn-primary px-3"><UserPlus size={16} /> Join</Link>
          )}
        </div>
      </div>
      <nav className="hidden border-t border-gray-200 bg-white lg:block">
        <div className="container-page flex min-h-11 items-center justify-center gap-6 overflow-x-auto">
          {navItems.map(([label, path]) => (
            <NavLink key={path} to={path} className={({ isActive }) => `whitespace-nowrap text-sm font-extrabold uppercase tracking-wide ${isActive ? 'text-brand-red' : 'text-gray-800 hover:text-brand-red'}`}>
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
      {open && (
        <div className="container-page space-y-3 border-t border-gray-100 py-4 lg:hidden">
          <form onSubmit={submitSearch} className="flex items-center rounded-md border border-gray-200 bg-gray-50 px-3">
            <Search size={17} className="text-gray-400" />
            <input
              className="w-full bg-transparent px-2 py-2 text-sm outline-none"
              placeholder="Search news"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
            />
          </form>
          {navItems.map(([label, path]) => (
            <Link key={path} to={path} className="block text-sm font-semibold" onClick={() => setOpen(false)}>
              {label}
            </Link>
          ))}
          {currentUser && (isAdmin || isEditor) && (
            <Link to="/admin/dashboard" className="block text-sm font-semibold" onClick={() => setOpen(false)}>
              Admin
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
