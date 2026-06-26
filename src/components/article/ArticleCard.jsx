import { Link } from 'react-router-dom';
import { Clock, Heart, MessageCircle, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatDate, readTime } from '../../utils/format.js';
import { countArticleComments, countArticleLikes, getArticleBySlugDb } from '../../supabase/api.js';

function isUuid(value = '') {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}

export default function ArticleCard({ article, large = false, compact = false }) {
  const [stats, setStats] = useState({ likes: 0, comments: 0 });
  const articlePath = `/article/${article.slug}`;

  useEffect(() => {
    let alive = true;
    async function loadStats() {
      const realId = isUuid(article.id) ? article.id : (await getArticleBySlugDb(article.slug))?.id;
      if (!realId) return [0, 0];
      return Promise.all([countArticleLikes(realId), countArticleComments(realId)]);
    }

    loadStats()
      .then(([likes, comments]) => {
        if (alive) setStats({ likes, comments });
      })
      .catch(() => {
        if (alive) setStats({ likes: 0, comments: 0 });
      });

    return () => {
      alive = false;
    };
  }, [article.id, article.slug]);

  return (
    <article className={`news-card group overflow-hidden ${large ? 'sm:grid sm:min-h-[340px] sm:grid-cols-[1.08fr_0.92fr] sm:items-stretch' : ''}`}>
      <Link to={articlePath} className={`relative block overflow-hidden bg-gray-200 ${large ? 'aspect-video sm:aspect-auto sm:h-full sm:min-h-[340px]' : ''} ${compact ? 'hidden sm:block' : ''}`}>
        {large && (
          <img
            src={article.featuredImageURL || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80'}
            alt=""
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-xl"
            aria-hidden="true"
            loading="eager"
          />
        )}
        <img
          src={article.featuredImageURL || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80'}
          alt={article.title}
          className={`relative z-10 h-full w-full transition duration-500 group-hover:scale-[1.02] ${large ? 'min-h-52 object-contain object-center sm:min-h-[340px]' : 'min-h-52 object-cover object-center'} ${compact ? 'sm:min-h-36' : ''}`}
          loading={large ? 'eager' : 'lazy'}
        />
        <span className="absolute left-3 top-3 rounded-md bg-white/95 px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide text-brand-red shadow-sm">
          {article.categoryName || 'News'}
        </span>
      </Link>
      <div className={`flex flex-col gap-3 ${large ? 'bg-white p-5 sm:p-6' : compact ? 'p-4' : 'p-5'}`}>
        <div className="flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-wide text-brand-red">
          <Link to={`/category/${article.categorySlug || article.categoryId}`}>{article.categoryName || 'News'}</Link>
          <span className="text-gray-400">{formatDate(article.publishedAt)}</span>
        </div>
        <Link to={articlePath}>
          <h2 className={`${large ? 'text-2xl sm:text-[1.7rem]' : compact ? 'text-lg' : 'text-xl'} font-extrabold leading-tight text-gray-950 hover:text-brand-blue ${large ? 'line-clamp-5' : ''}`}>
            {article.title}
          </h2>
        </Link>
        {!compact && <p className={`text-sm leading-6 text-gray-600 ${large ? 'line-clamp-4' : 'line-clamp-3'}`}>{article.excerpt}</p>}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 text-xs font-medium text-gray-500">
          <span className="inline-flex min-w-0 items-center gap-1.5 font-semibold text-gray-700">
            <UserRound size={14} /> <span className="truncate">{article.authorName || 'News Desk'}</span>
          </span>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Heart size={14} /> {stats.likes}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageCircle size={14} /> {stats.comments}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock size={14} /> {readTime(article.content)}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
