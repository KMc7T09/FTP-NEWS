import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { formatDate, readTime } from '../../utils/format.js';

export default function ArticleCard({ article, large = false }) {
  return (
    <article className={`news-card overflow-hidden ${large ? 'md:grid md:grid-cols-[1.2fr_1fr]' : ''}`}>
      <Link to={`/article/${article.slug}`} className="block bg-gray-200">
        <img
          src={article.featuredImageURL || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80'}
          alt={article.title}
          className={`h-full min-h-52 w-full object-cover ${large ? 'md:min-h-80' : ''}`}
        />
      </Link>
      <div className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-wide text-brand-red">
          <Link to={`/category/${article.categorySlug || article.categoryId}`}>{article.categoryName || 'News'}</Link>
          <span className="text-gray-400">{formatDate(article.publishedAt)}</span>
        </div>
        <Link to={`/article/${article.slug}`}>
          <h2 className={`${large ? 'text-3xl' : 'text-xl'} font-extrabold leading-tight text-gray-950 hover:text-brand-blue`}>
            {article.title}
          </h2>
        </Link>
        <p className="line-clamp-3 text-sm leading-6 text-gray-600">{article.excerpt}</p>
        <div className="mt-auto flex items-center justify-between text-xs font-medium text-gray-500">
          <span>{article.authorName || 'News Desk'}</span>
          <span className="inline-flex items-center gap-1">
            <Clock size={14} /> {readTime(article.content)}
          </span>
        </div>
      </div>
    </article>
  );
}
