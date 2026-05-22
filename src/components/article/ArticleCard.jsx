import { Link } from 'react-router-dom';
import { Clock, Heart, MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatDate, readTime } from '../../utils/format.js';
import { countArticleComments, countArticleLikes, getArticleBySlugDb } from '../../supabase/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

function isUuid(value = '') {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}

export default function ArticleCard({ article, large = false }) {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({ likes: 0, comments: 0 });
  const articlePath = currentUser ? `/article/${article.slug}` : '/login';

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
    <article className={`news-card overflow-hidden ${large ? 'md:grid md:grid-cols-[1.2fr_1fr]' : ''}`}>
      <Link to={articlePath} className="block bg-gray-200">
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
        <Link to={articlePath}>
          <h2 className={`${large ? 'text-3xl' : 'text-xl'} font-extrabold leading-tight text-gray-950 hover:text-brand-blue`}>
            {article.title}
          </h2>
        </Link>
        <p className="line-clamp-3 text-sm leading-6 text-gray-600">{article.excerpt}</p>
        {!currentUser ? <p className="text-xs font-bold uppercase tracking-wide text-brand-red">Join to read full article</p> : null}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 text-xs font-medium text-gray-500">
          <span>{article.authorName || 'News Desk'}</span>
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
