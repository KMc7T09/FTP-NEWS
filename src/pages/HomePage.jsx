import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { useFeaturedArticles, usePublishedArticles } from '../hooks/useArticles.js';
import ArticleCard from '../components/article/ArticleCard.jsx';
import TrendingSidebar from '../components/article/TrendingSidebar.jsx';
import AdSlot from '../components/common/AdSlot.jsx';
import Seo from '../components/common/Seo.jsx';
import { ArticleSkeleton } from '../components/ui/Skeleton.jsx';
import { staticCategories } from '../data/demoContent.js';

export default function HomePage() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const categories = staticCategories;
  const { data: latest, loading } = usePublishedArticles(12);
  const { data: featured } = useFeaturedArticles();
  const hero = featured[0] || latest[0];

  function submit(event) {
    event.preventDefault();
    if (search.trim()) navigate(`/search?q=${encodeURIComponent(search.trim())}`);
  }

  return (
    <>
      <Seo title="FTP NEWS" description="Fresh Take Politics, latest breaking news, analysis, and community updates." />
      <section className="border-b border-gray-200 bg-white">
        <div className="container-page grid gap-8 py-8 lg:grid-cols-[1fr_330px]">
          <div className="space-y-6">
            <form onSubmit={submit} className="flex overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
              <span className="flex items-center px-4 text-gray-400">
                <Search size={20} />
              </span>
              <input className="w-full bg-transparent py-3 pr-4 outline-none" placeholder="Search title, category, tags, or story text" value={search} onChange={(event) => setSearch(event.target.value)} />
              <button className="bg-brand-red px-4 text-sm font-bold text-white sm:px-5">Search</button>
            </form>
            {hero ? <ArticleCard article={hero} large /> : loading ? <ArticleSkeleton /> : null}
          </div>
          <div className="space-y-6">
            <AdSlot label="Header Ad Slot" position="header" />
            <TrendingSidebar />
          </div>
        </div>
      </section>

      <section className="container-page py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-gray-950">Latest News</h1>
          <Link to="/search" className="text-sm font-bold text-brand-blue">
            View all
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, index) => <ArticleSkeleton key={index} />)
            : latest.slice(0, 9).map((article) => <ArticleCard key={article.id} article={article} />)}
        </div>
      </section>

      <section className="bg-white py-10">
        <div className="container-page">
          <AdSlot label="Home Page Ad Slot" position="home" className="mb-8" />
        <h2 className="mb-6 text-xl font-extrabold sm:text-2xl">Category Sections</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <Link key={category.id} to={`/category/${category.slug}`} className="news-card p-5">
                <h3 className="text-lg font-extrabold">{category.name}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">{category.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
