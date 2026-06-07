import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BarChart3, Clock, Search, ShieldCheck, Sparkles } from 'lucide-react';
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
  const secondary = latest.filter((item) => item.id !== hero?.id).slice(0, 2);

  function submit(event) {
    event.preventDefault();
    if (search.trim()) navigate(`/search?q=${encodeURIComponent(search.trim())}`);
  }

  return (
    <>
      <Seo title="FTP NEWS" description="Fresh Take Politics, latest breaking news, analysis, and community updates." />
      <section className="border-b border-gray-200 bg-white">
        <div className="container-page grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_330px] lg:py-10">
          <div className="space-y-6">
            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
              <div>
                <p className="section-kicker">Fresh Take Politics</p>
                <h1 className="mt-2 text-4xl font-extrabold leading-tight text-gray-950 sm:text-6xl">THE FTP NEWS</h1>
              </div>
              <p className="max-w-2xl text-base leading-7 text-gray-600">
                Fresh, clear, and independent political news with verified context for readers across India.
              </p>
            </div>
            <form onSubmit={submit} className="flex overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
              <span className="flex items-center px-4 text-gray-400">
                <Search size={20} />
              </span>
              <input className="w-full bg-transparent py-3 pr-4 outline-none" placeholder="Search title, category, tags, or story text" value={search} onChange={(event) => setSearch(event.target.value)} />
              <button className="bg-brand-red px-4 text-sm font-bold text-white sm:px-5">Search</button>
            </form>
            <div className="grid gap-5 xl:grid-cols-[1.45fr_0.85fr]">
              {hero ? <ArticleCard article={hero} large priority /> : loading ? <ArticleSkeleton /> : null}
              <div className="grid gap-5">
                {secondary.map((article) => <ArticleCard key={article.id} article={article} compact />)}
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <AdSlot label="Header Ad Slot" position="header" />
            <div className="dashboard-card">
              <p className="section-kicker text-red-300">Why Readers Trust FTP</p>
              <div className="mt-4 grid gap-4">
                <div className="flex gap-3">
                  <ShieldCheck className="mt-1 text-brand-red" size={20} />
                  <div>
                    <p className="font-extrabold">Verified context</p>
                    <p className="text-sm leading-6 text-gray-300">Stories are structured around facts, source notes, and reader clarity.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Clock className="mt-1 text-brand-red" size={20} />
                  <div>
                    <p className="font-extrabold">Fast updates</p>
                    <p className="text-sm leading-6 text-gray-300">Latest posts, comments, likes, and shares stay connected to Supabase.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Sparkles className="mt-1 text-brand-red" size={20} />
                  <div>
                    <p className="font-extrabold">Pan-India reading tools</p>
                    <p className="text-sm leading-6 text-gray-300">Translate, listen, and summarize article text from the article page.</p>
                  </div>
                </div>
              </div>
            </div>
            <TrendingSidebar />
          </div>
        </div>
      </section>

      <section className="container-page py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="section-kicker">Latest Desk</p>
            <h1 className="mt-2 text-2xl font-extrabold text-gray-950 sm:text-3xl">Latest News</h1>
          </div>
          <Link to="/search" className="btn-secondary">
            View all <ArrowRight size={16} />
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
          <div className="mb-6 flex items-end justify-between gap-3">
            <div>
              <p className="section-kicker">Explore Topics</p>
              <h2 className="mt-2 text-xl font-extrabold sm:text-2xl">Category Sections</h2>
            </div>
            <BarChart3 className="hidden text-brand-red sm:block" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <Link key={category.id} to={`/category/${category.slug}`} className="news-card group p-5">
                <span className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-md bg-red-50 font-extrabold text-brand-red group-hover:bg-brand-red group-hover:text-white">
                  {category.name.slice(0, 1)}
                </span>
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
