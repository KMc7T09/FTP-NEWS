import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
      <section className="container-page py-10">
        <h1 className="mb-6 text-3xl font-extrabold">Search News</h1>
        <form onSubmit={submit} className="mb-8 flex overflow-hidden rounded-lg border border-gray-200 bg-white">
          <input className="w-full px-4 py-3 outline-none" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Search articles" />
          <button className="bg-brand-red px-5 font-bold text-white">Search</button>
        </form>
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
