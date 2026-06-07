import { BarChart3, Eye, FileText, Inbox, LayoutDashboard, MessageSquare, Newspaper, Settings, ShieldCheck, Tag, Users } from 'lucide-react';
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
  ['Ads', '/admin/ads', BarChart3, 'admin'],
  ['Settings', '/admin/settings', Settings, 'admin'],
];

export default function AdminLayout() {
  const { isAdmin, isSuperAdmin } = useAuth();
  const visibleLinks = links.filter(([, , , required]) => !required || (required === 'superadmin' ? isSuperAdmin : isAdmin));

  return (
    <div className="min-h-screen bg-gray-100 lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-r border-gray-900 bg-gray-950 text-white">
        <div className="flex h-16 items-center gap-2 border-b border-white/10 px-5">
          <ShieldCheck className="text-brand-red" />
          <span>
            <span className="block font-extrabold leading-tight">FTP Admin</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">Control Room</span>
          </span>
        </div>
        <nav className="flex gap-1 overflow-x-auto p-3 lg:grid lg:overflow-visible lg:p-4">
          {visibleLinks.map(([label, path, Icon]) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold ${isActive ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`
              }
            >
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div>
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white/95 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-brand-red" />
            <span className="font-extrabold">Publishing Dashboard</span>
          </div>
          <Link to="/" className="btn-secondary">
            View Site
          </Link>
        </header>
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
