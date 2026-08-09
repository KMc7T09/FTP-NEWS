import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import ArticleCard from '../article/ArticleCard.jsx';

export default function SectionBlock({ kicker, title, description, articles = [], to, articleStats = {} }) {
  return (
    <section className="container-page py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          {kicker && <p className="section-kicker">{kicker}</p>}
          <h2 className="mt-2 text-2xl font-extrabold text-gray-950 sm:text-3xl">{title}</h2>
          {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">{description}</p>}
        </div>
        {to && (
          <Link to={to} className="btn-secondary">
            View more <ArrowRight size={16} />
          </Link>
        )}
      </div>
      {articles.length ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => <ArticleCard key={article.id} article={article} stats={articleStats[article.id]} />)}
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm font-semibold text-gray-600">
          No published stories in this section yet.
        </div>
      )}
    </section>
  );
}
