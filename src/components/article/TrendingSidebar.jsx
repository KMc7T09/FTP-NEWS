import { Link } from 'react-router-dom';
import { Flame } from 'lucide-react';
import { useTrendingArticles } from '../../hooks/useArticles.js';

export default function TrendingSidebar() {
  const { data } = useTrendingArticles();

  return (
    <aside className="space-y-4">
      <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
        <Flame className="text-brand-red" size={20} />
        <h2 className="text-lg font-extrabold">Trending</h2>
      </div>
      <div className="space-y-4">
        {data.map((article, index) => (
          <Link key={article.id} to={`/article/${article.slug}`} className="grid grid-cols-[32px_1fr] gap-3">
            <span className="text-2xl font-extrabold text-gray-300">{index + 1}</span>
            <span className="text-sm font-bold leading-5 text-gray-900 hover:text-brand-blue">{article.title}</span>
          </Link>
        ))}
      </div>
    </aside>
  );
}
