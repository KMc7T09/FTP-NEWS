import { CalendarDays, LogOut, Menu, Search, User, UserPlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
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
  ['Reports & Data', '/reports'],
  ['Weather', '/weather'],
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const navigate = useNavigate();
  const { currentUser, isAdmin, isEditor, logout } = useAuth();
  const today = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  function submitSearch(event) {
    event.preventDefault();
    if (term.trim()) navigate(`/search?q=${encodeURIComponent(term.trim())}`);
  }

  return (
    <header className="site-header sticky top-0 z-40 border-b border-gray-300 bg-white">
      <div className="border-b border-gray-200 bg-gray-950 text-white">
        <div className="container-page flex min-h-9 items-center justify-between gap-3 text-xs font-semibold">
          <span className="hidden items-center gap-2 sm:inline-flex"><CalendarDays size={14} /> {today}</span>
          <span className="section-kicker text-[10px] text-red-200 sm:text-xs">Independent Digital News Platform</span>
          <button className="inline-flex items-center gap-1 hover:text-red-200" onClick={() => navigate('/search')}>
            <Search size={14} /> Search
          </button>
        </div>
      </div>
      <div className="container-page masthead flex min-h-24 items-center justify-between gap-4 py-3">
        <button className="rounded-md p-2 hover:bg-gray-100 focus-visible:outline-brand-red lg:hidden" onClick={() => setOpen((value) => !value)} aria-label={open ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={open} aria-controls="mobile-navigation">
          {open ? <X /> : <Menu />}
        </button>
        <Link to="/" className="brand-lockup min-w-0 text-left" aria-label="THE FTP NEWS home">
          <span className="block font-serif text-4xl font-extrabold leading-none text-gray-950 sm:text-5xl">FTP</span>
          <span className="mt-1 block text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-red sm:text-[11px]">THE FTP NEWS · Fresh Take Politics</span>
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
      <nav aria-label="Primary navigation" className="hidden border-t border-gray-200 bg-white lg:block">
        <div className="container-page flex min-h-11 items-center justify-center gap-4 overflow-x-auto xl:gap-6">
          {navItems.map(([label, path]) => (
            <NavLink key={path} to={path} className={({ isActive }) => `whitespace-nowrap border-b-2 py-3 text-xs font-extrabold uppercase tracking-wide transition-colors ${isActive ? 'border-brand-red text-brand-red' : 'border-transparent text-gray-700 hover:border-gray-400 hover:text-brand-red'}`}>
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
      {open && (
        <nav id="mobile-navigation" aria-label="Mobile navigation" className="container-page space-y-2 border-t border-gray-100 py-4 lg:hidden">
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
            <NavLink key={path} to={path} className={({ isActive }) => `block rounded-md px-3 py-2.5 text-sm font-bold ${isActive ? 'bg-red-50 text-brand-red' : 'text-gray-800 hover:bg-gray-50'}`} onClick={() => setOpen(false)}>
              {label}
            </NavLink>
          ))}
          {currentUser && (isAdmin || isEditor) && (
            <Link to="/admin/dashboard" className="block text-sm font-semibold" onClick={() => setOpen(false)}>
              Admin
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
