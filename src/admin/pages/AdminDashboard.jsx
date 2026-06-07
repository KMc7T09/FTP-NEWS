import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Activity, ArrowRight, Eye, FileText, Heart, MessageCircle, Share2, TrendingUp, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { demoArticles, demoCategories } from '../../data/demoContent.js';
import { formatDate } from '../../utils/format.js';
import { listArticles, listComments, listLikes, listPageVisits, listProfiles, saveArticle, saveCategory } from '../../supabase/api.js';

function Stat({ label, value, icon: Icon, tone = 'light' }) {
  const dark = tone === 'dark';
  return (
    <div className={dark ? 'dashboard-card' : 'metric-card'}>
      <div className="flex items-center justify-between gap-3">
        <p className={`text-sm font-semibold ${dark ? 'text-gray-300' : 'text-gray-500'}`}>{label}</p>
        {Icon && <Icon size={20} className={dark ? 'text-red-300' : 'text-brand-red'} />}
      </div>
      <p className="mt-3 text-3xl font-extrabold">{value}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const { isAdmin, isEditor, isSuperAdmin } = useAuth();
  const [stats, setStats] = useState({ articles: 0, users: 0, comments: 0, pending: 0, banned: 0, reach: 0, likes: 0, shares: 0 });
  const [articles, setArticles] = useState([]);
  const [users, setUsers] = useState([]);
  const [comments, setComments] = useState([]);
  const [visits, setVisits] = useState([]);

  function loadStats() {
    Promise.all([
      listArticles({ limit: 200 }),
      isAdmin ? listProfiles() : Promise.resolve([]),
      isAdmin ? listComments() : Promise.resolve([]),
      isAdmin ? listLikes() : Promise.resolve([]),
      isSuperAdmin ? listPageVisits({ limit: 250 }) : Promise.resolve([]),
    ])
      .then(([articleRows, userRows, commentRows, likes, visitRows]) => {
        setArticles(articleRows);
        setUsers(userRows);
        setComments(commentRows);
        setVisits(visitRows);
        setStats({
          articles: articleRows.length,
          users: userRows.length,
          comments: commentRows.length,
          pending: commentRows.filter((item) => item.status === 'pending').length,
          banned: userRows.filter((item) => item.status === 'banned').length,
          reach: articleRows.reduce((total, item) => total + Number(item.views || 0), 0) + visitRows.length,
          likes: likes.length,
          shares: articleRows.reduce((total, item) => total + Number(item.shares || 0), 0),
        });
      })
      .catch(() => {});
  }

  useEffect(loadStats, [isAdmin]);

  async function addDemoContent() {
    try {
      await Promise.all([
        ...demoCategories.map((category) => saveCategory(category)),
        ...demoArticles.map((article) => saveArticle(article)),
      ]);
      toast.success('Demo articles added.');
      loadStats();
    } catch (error) {
      toast.error(error.message || 'Demo content save failed.');
    }
  }

  const published = articles.filter((item) => item.status === 'published').length;
  const drafts = articles.filter((item) => item.status === 'draft').length;
  const topArticles = [...articles]
    .sort((a, b) => Number(b.views || 0) + Number(b.shares || 0) - (Number(a.views || 0) + Number(a.shares || 0)))
    .slice(0, 5);
  const latestUsers = users.slice(0, 5);
  const recentComments = comments.slice(0, 5);
  const uniqueVisitors = new Set(visits.map((item) => item.visitor_id)).size;

  return (
    <section>
      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="section-kicker">FTP Command Center</p>
          <h1 className="mt-2 text-3xl font-extrabold text-gray-950">Publishing Dashboard</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            {isEditor && !isAdmin
              ? 'You can write, edit, and publish articles. User, settings, ads, and moderation controls stay with admins.'
              : 'Create stories, manage users, moderate comments, track visitor activity, and monitor audience growth from one place.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && <Link to="/admin/categories" className="btn-secondary">Add Category</Link>}
          {isAdmin && <button type="button" className="btn-secondary" onClick={addDemoContent}>Add Demo Articles</button>}
          <Link to="/admin/articles/new" className="btn-primary">Create Article</Link>
        </div>
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total Articles" value={stats.articles} icon={FileText} tone="dark" />
        {isAdmin && <Stat label="Reach" value={stats.reach} icon={Eye} tone="dark" />}
        {isAdmin && <Stat label="Likes" value={stats.likes} icon={Heart} tone="dark" />}
        {isAdmin && <Stat label="Total Users" value={stats.users} icon={Users} tone="dark" />}
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Published" value={published} icon={TrendingUp} />
        <Stat label="Drafts" value={drafts} icon={FileText} />
        {isAdmin && <Stat label="Comments" value={stats.comments} icon={MessageCircle} />}
        {isAdmin && <Stat label="Pending" value={stats.pending} icon={Activity} />}
        {isAdmin && <Stat label="Shares" value={stats.shares} icon={Share2} />}
      </div>

      {isAdmin && (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="soft-panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-200 p-5">
              <div>
                <p className="section-kicker">Performance</p>
                <h2 className="mt-1 text-xl font-extrabold">Top Articles</h2>
              </div>
              <Link to="/admin/articles" className="text-sm font-bold text-brand-blue">Manage <ArrowRight size={14} className="inline" /></Link>
            </div>
            <div className="divide-y divide-gray-100">
              {topArticles.length ? topArticles.map((article, index) => (
                <div key={article.id} className="grid gap-3 p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-red-50 font-extrabold text-brand-red">{index + 1}</span>
                  <div>
                    <p className="font-extrabold text-gray-950">{article.title}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{article.categoryName || 'News'} · {article.status}</p>
                  </div>
                  <div className="flex gap-3 text-sm font-semibold text-gray-600">
                    <span className="inline-flex items-center gap-1"><Eye size={15} /> {article.views || 0}</span>
                    <span className="inline-flex items-center gap-1"><Share2 size={15} /> {article.shares || 0}</span>
                  </div>
                </div>
              )) : <p className="p-5 text-sm text-gray-500">No articles yet.</p>}
            </div>
          </div>

          <div className="grid gap-6">
            {isSuperAdmin && (
              <div className="dashboard-card">
                <p className="section-kicker text-red-300">Superadmin Analytics</p>
                <h2 className="mt-2 text-xl font-extrabold">Audience Snapshot</h2>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-white/10 p-4">
                    <p className="text-xs font-semibold text-gray-300">Recent visits</p>
                    <p className="mt-2 text-2xl font-extrabold">{visits.length}</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-4">
                    <p className="text-xs font-semibold text-gray-300">Unique visitors</p>
                    <p className="mt-2 text-2xl font-extrabold">{uniqueVisitors}</p>
                  </div>
                </div>
                <Link to="/admin/visitors" className="mt-4 inline-flex text-sm font-bold text-red-200 hover:text-white">Open visitor analytics <ArrowRight size={14} className="ml-1 mt-0.5" /></Link>
              </div>
            )}
            <div className="soft-panel p-5">
              <p className="section-kicker">Recent Users</p>
              <div className="mt-4 space-y-3">
                {latestUsers.length ? latestUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between gap-3 rounded-md bg-gray-50 p-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold">{user.name || user.email}</p>
                      <p className="truncate text-xs text-gray-500">{user.email}</p>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-gray-700">{user.role}</span>
                  </div>
                )) : <p className="text-sm text-gray-500">No users yet.</p>}
              </div>
            </div>
            <div className="soft-panel p-5">
              <p className="section-kicker">Moderation Queue</p>
              <div className="mt-4 space-y-3">
                {recentComments.length ? recentComments.map((comment) => (
                  <div key={comment.id} className="rounded-md bg-gray-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-bold">{comment.userName || 'Reader'}</p>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${comment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{comment.status}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-gray-600">{comment.text}</p>
                    <p className="mt-2 text-xs text-gray-400">{formatDate(comment.createdAt)}</p>
                  </div>
                )) : <p className="text-sm text-gray-500">No comments yet.</p>}
              </div>
            </div>
          </div>
        </div>
      )}
      {isAdmin && stats.banned > 0 && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          {stats.banned} banned user account found. Review Users page when needed.
        </div>
      )}
    </section>
  );
}
