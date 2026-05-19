import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ArticleCard from '../components/article/ArticleCard.jsx';
import Seo from '../components/common/Seo.jsx';
import { listArticles } from '../supabase/api.js';

export default function CategoryPage() {
  const { slug } = useParams();
  const [count, setCount] = useState(9);
  const [data, setData] = useState([]);

  useEffect(() => {
    listArticles({ publishedOnly: true, categorySlug: slug, limit: count })
      .then(setData)
      .catch(() => setData([]));
  }, [slug, count]);

  return (
    <>
      <Seo title={`${slug} News | FTP NEWS`} description={`Latest ${slug} news and analysis.`} />
      <section className="container-page py-10">
        <h1 className="mb-6 text-3xl font-extrabold capitalize">{slug} News</h1>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
        {!data.length ? <p className="rounded-lg bg-white p-6 text-gray-600">No published articles in this category yet.</p> : null}
        <div className="mt-8 text-center">
          <button className="btn-secondary" onClick={() => setCount((value) => value + 9)}>
            Load More
          </button>
        </div>
      </section>
    </>
  );
}
