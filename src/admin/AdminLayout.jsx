import { BarChart3, CloudSun, Database, Eye, FileText, Inbox, LayoutDashboard, MessageSquare, Newspaper, Settings, ShieldCheck, Tag, Users, Vote } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const links = [
  ['Dashboard', '/admin/dashboard', LayoutDashboard],
  ['Articles', '/admin/articles', Newspaper],
  ['Categories', '/admin/categories', Tag, 'admin'],
  ['Users', '/admin/users', Users, 'admin'],
  ['Comments', '/admin/comments', MessageSquare, 'admin'],
  ['Contact Inbox', '/admin/contact-messages', Inbox, 'admin'],
  ['Visitors', '/admin/visitors', Eye, 'superadmin'],
  ['Weather', '/admin/weather', CloudSun, 'admin'],
  ['Public Reports', '/admin/reports', FileText, 'admin'],
  ['Rankings & Data', '/admin/public-data', Database, 'admin'],
  ['Representatives', '/admin/representatives', Vote, 'admin'],
  ['Ads', '/admin/ads', BarChart3, 'admin'],
  ['Settings', '/admin/settings', Settings, 'admin'],
];

export default function AdminLayout() {
  const { isAdmin, isSuperAdmin } = useAuth();
  const visibleLinks = links.filter(([, , , required]) => !required || (required === 'superadmin' ? isSuperAdmin : isAdmin));

  return (
    <div className="admin-shell min-h-screen bg-[#f4f6f8] lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="border-r border-gray-900 bg-gray-950 text-white lg:min-h-screen">
        <div className="flex h-16 items-center gap-2 border-b border-white/10 px-5">
          <ShieldCheck className="text-brand-red" />
          <span>
            <span className="block font-extrabold leading-tight">FTP Admin</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">Control Room</span>
          </span>
        </div>
        <nav aria-label="Admin navigation" className="flex gap-1 overflow-x-auto p-3 lg:sticky lg:top-16 lg:grid lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto lg:p-4">
          {visibleLinks.map(([label, path, Icon]) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex min-h-10 shrink-0 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors ${isActive ? 'border-l-2 border-brand-red bg-white text-gray-950 shadow-sm' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`
              }
            >
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-brand-red" />
            <span className="font-extrabold">Publishing Dashboard</span>
          </div>
          <Link to="/" className="btn-secondary">
            View Site
          </Link>
        </header>
        <main className="min-w-0 p-4 md:p-6 xl:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
