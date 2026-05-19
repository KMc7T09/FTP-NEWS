import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext.jsx';
import { demoArticles, demoCategories } from '../../data/demoContent.js';
import { listArticles, listComments, listLikes, listProfiles, saveArticle, saveCategory } from '../../supabase/api.js';

function Stat({ label, value }) {
  return (
    <div className="news-card p-5">
      <p className="text-sm font-semibold text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-extrabold">{value}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const { isAdmin, isEditor } = useAuth();
  const [stats, setStats] = useState({ articles: 0, users: 0, comments: 0, pending: 0, banned: 0, reach: 0, likes: 0, shares: 0 });

  function loadStats() {
    Promise.all([
      listArticles({ limit: 200 }),
      isAdmin ? listProfiles() : Promise.resolve([]),
      isAdmin ? listComments() : Promise.resolve([]),
      isAdmin ? listLikes() : Promise.resolve([]),
    ])
      .then(([articles, users, comments, likes]) => {
        setStats({
          articles: articles.length,
          users: users.length,
          comments: comments.length,
          pending: comments.filter((item) => item.status === 'pending').length,
          banned: users.filter((item) => item.status === 'banned').length,
          reach: articles.reduce((total, item) => total + Number(item.views || 0), 0),
          likes: likes.length,
          shares: articles.reduce((total, item) => total + Number(item.shares || 0), 0),
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

  return (
    <section>
      <h1 className="mb-6 text-2xl font-extrabold">Dashboard</h1>
      <div className="news-card mb-6 grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <h2 className="text-lg font-extrabold">Publish workflow</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            {isEditor && !isAdmin
              ? 'You can write, edit, and publish articles. User, settings, ads, and moderation controls stay with admins.'
              : 'Create categories, publish articles, manage users, moderate comments, and update settings from this panel.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && <Link to="/admin/categories" className="btn-secondary">Add Category</Link>}
          {isAdmin && <button type="button" className="btn-secondary" onClick={addDemoContent}>Add Demo Articles</button>}
          <Link to="/admin/articles/new" className="btn-primary">Create Article</Link>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Total Articles" value={stats.articles} />
        {isAdmin && <Stat label="Reach" value={stats.reach} />}
        {isAdmin && <Stat label="Likes" value={stats.likes} />}
        {isAdmin && <Stat label="Total Users" value={stats.users} />}
        {isAdmin && <Stat label="Total Comments" value={stats.comments} />}
        {isAdmin && <Stat label="Pending Comments" value={stats.pending} />}
        {isAdmin && <Stat label="Shares" value={stats.shares} />}
        {isAdmin && <Stat label="Banned Users" value={stats.banned} />}
      </div>
    </section>
  );
}
