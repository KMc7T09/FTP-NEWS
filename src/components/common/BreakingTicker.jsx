import { Link } from 'react-router-dom';

export default function BreakingTicker({ articles = [] }) {
  const headlines = articles.slice(0, 6);
  if (!headlines.length) return null;

  return (
    <section className="border-y border-gray-900 bg-gray-950 text-white">
      <div className="container-page flex min-h-11 items-center gap-4 overflow-hidden">
        <div className="shrink-0 bg-brand-red px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide">
          Breaking
        </div>
        <div className="ticker-mask min-w-0 flex-1 overflow-hidden">
          <div className="ticker-track flex w-max gap-8">
            {[...headlines, ...headlines].map((article, index) => (
              <Link key={`${article.id}-${index}`} to={`/article/${article.slug}`} className="whitespace-nowrap text-sm font-semibold hover:text-red-200">
                {article.title}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
