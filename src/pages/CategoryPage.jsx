import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ArticleCard from '../components/article/ArticleCard.jsx';
import Seo from '../components/common/Seo.jsx';
import { listArticles } from '../supabase/api.js';

const descriptions = {
  politics: 'Political news, public issues, government decisions, and analysis from FTP.',
  india: 'National updates and public interest stories from across India.',
  odisha: 'Ground reports, politics, and community issues from Odisha.',
  world: 'International news and global political developments.',
  opinion: 'Views, explainers, youth voices, and editorial perspective.',
  'fact-check': 'Verification-led stories that check claims and public narratives.',
  youth: 'Student, youth, job, education, and future-focused stories.',
};

export default function CategoryPage() {
  const { slug } = useParams();
  const [count, setCount] = useState(9);
  const [data, setData] = useState([]);
  const title = slug.replaceAll('-', ' ');
  const featured = data[0];
  const rest = data.slice(1);

  useEffect(() => {
    listArticles({ publishedOnly: true, categorySlug: slug, limit: count })
      .then(setData)
      .catch(() => setData([]));
  }, [slug, count]);

  return (
    <>
      <Seo title={`${title} News | FTP - Fresh Take Politics`} description={descriptions[slug] || `Latest ${title} news and analysis from FTP.`} />
      <section className="border-b border-gray-200 bg-white">
        <div className="container-page py-10">
          <p className="section-kicker">FTP Category</p>
          <h1 className="mt-2 text-4xl font-extrabold capitalize text-gray-950">{title} News</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">{descriptions[slug] || `Latest ${title} news and analysis from FTP.`}</p>
        </div>
      </section>
      <section className="container-page py-10">
        {featured && <div className="mb-8"><ArticleCard article={featured} large /></div>}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-extrabold">All Stories</h2>
          <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-gray-600">{data.length} stories</span>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {rest.map((article) => (
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
