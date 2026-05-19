import { Bookmark, LogOut, Menu, Search, User } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import useSettings from '../../hooks/useSettings.js';
import { useAuth } from '../../context/AuthContext.jsx';

const navItems = [
  ['Politics', '/category/politics'],
  ['Business', '/category/business'],
  ['Technology', '/category/technology'],
  ['Sports', '/category/sports'],
  ['Entertainment', '/category/entertainment'],
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const navigate = useNavigate();
  const settings = useSettings();
  const { currentUser, isAdmin, isEditor, logout } = useAuth();

  function submitSearch(event) {
    event.preventDefault();
    if (term.trim()) navigate(`/search?q=${encodeURIComponent(term.trim())}`);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="container-page flex min-h-16 items-center gap-2 py-2 md:gap-4 md:py-0">
        <button className="md:hidden" onClick={() => setOpen((value) => !value)} aria-label="Open menu">
          <Menu />
        </button>
        <Link to="/" className="flex min-w-0 shrink items-center gap-2 md:shrink-0 md:gap-3">
          {settings.logoURL ? <img src={settings.logoURL} alt="" className="h-9 w-9 rounded object-cover" /> : null}
          <span className="min-w-0">
            <span className="block truncate font-serif text-base font-bold leading-tight text-gray-950 sm:text-xl">{settings.websiteName}</span>
            <span className="hidden text-[11px] font-bold uppercase tracking-wide text-brand-red sm:block">Fresh Take Politics</span>
          </span>
        </Link>
        <nav className="hidden flex-1 items-center justify-center gap-5 md:flex">
          {navItems.map(([label, path]) => (
            <NavLink key={path} to={path} className="text-sm font-semibold text-gray-700 hover:text-brand-red">
              {label}
            </NavLink>
          ))}
        </nav>
        <form onSubmit={submitSearch} className="hidden w-64 items-center rounded-md border border-gray-200 bg-gray-50 px-3 md:flex">
          <Search size={17} className="text-gray-400" />
          <input
            className="w-full bg-transparent px-2 py-2 text-sm outline-none"
            placeholder="Search news"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
          />
        </form>
        <div className="ml-auto flex items-center gap-2">
          {currentUser ? (
            <>
              <Link to="/profile" className="rounded-md p-2 text-gray-700 hover:bg-gray-100" aria-label="Profile">
                <User size={19} />
              </Link>
              {(isAdmin || isEditor) && (
              <Link to="/admin/dashboard" className="btn-secondary hidden sm:inline-flex">
                Admin
              </Link>
              )}
              <button onClick={logout} className="rounded-md p-2 text-gray-700 hover:bg-gray-100" aria-label="Log out">
                <LogOut size={19} />
              </button>
            </>
          ) : (
            <Link to="/login" className="btn-primary px-3">
              <Bookmark size={16} /> Login
            </Link>
          )}
        </div>
      </div>
      {open && (
        <div className="container-page space-y-3 border-t border-gray-100 py-4 md:hidden">
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
