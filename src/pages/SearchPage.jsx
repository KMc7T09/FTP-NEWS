import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import ArticleCard from '../components/article/ArticleCard.jsx';
import Seo from '../components/common/Seo.jsx';
import { listArticles } from '../supabase/api.js';

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [input, setInput] = useState(params.get('q') || '');
  const term = params.get('q') || '';
  const [articles, setArticles] = useState([]);
  const results = articles.filter((article) => {
    const value = term.toLowerCase();
    const haystack = [article.title, article.categoryName, article.excerpt, article.content, ...(article.tags || [])].join(' ').toLowerCase();
    return !value || haystack.includes(value);
  });

  useEffect(() => {
    listArticles({ publishedOnly: true, limit: 100 })
      .then(setArticles)
      .catch(() => setArticles([]));
  }, [term]);

  function submit(event) {
    event.preventDefault();
    setParams(input.trim() ? { q: input.trim() } : {});
  }

  return (
    <>
      <Seo title="Search News | FTP NEWS" description="Search articles by title, category, tags, and content." />
      <section className="border-b border-gray-200 bg-white">
        <div className="container-page py-10">
          <p className="section-kicker">FTP Search</p>
          <h1 className="mt-2 text-4xl font-extrabold text-gray-950">Search News</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">Search FTP stories by headline, category, tags, author, or article text.</p>
          <form onSubmit={submit} className="mt-6 flex overflow-hidden rounded-lg border border-gray-300 bg-gray-50 shadow-sm">
            <span className="flex items-center px-4 text-gray-400"><Search size={20} /></span>
            <input className="w-full bg-transparent py-4 pr-4 text-base outline-none" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Search articles" />
          <button className="bg-brand-red px-5 font-bold text-white">Search</button>
          </form>
        </div>
      </section>
      <section className="container-page py-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h2 className="text-2xl font-extrabold">{term ? `Results for "${term}"` : 'Latest searchable stories'}</h2>
          <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-gray-600">{results.length} results</span>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {results.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
        {!results.length ? <p className="rounded-lg bg-white p-6 text-gray-600">No matching published articles found.</p> : null}
      </section>
    </>
  );
}
