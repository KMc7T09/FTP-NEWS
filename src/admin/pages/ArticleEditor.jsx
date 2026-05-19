import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext.jsx';
import { createSlug } from '../../utils/slug.js';
import { excerptFrom } from '../../utils/format.js';
import RichTextEditor from '../../components/common/RichTextEditor.jsx';
import { getArticle, listCategories, saveArticle } from '../../supabase/api.js';

const blank = {
  title: '',
  excerpt: '',
  content: '',
  featuredImageURL: '',
  categoryId: '',
  categoryName: '',
  categorySlug: '',
  tags: '',
  status: 'draft',
  isFeatured: false,
  isTrending: false,
  metaTitle: '',
  metaDescription: '',
};

export default function ArticleEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, profile } = useAuth();
  const [form, setForm] = useState(blank);
  const [categories, setCategories] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!id) return;
    getArticle(id).then((article) => {
      if (article) setForm({ ...blank, ...article, tags: (article.tags || []).join(', ') });
    });
  }, [id]);

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const category = categories.find((item) => item.id === form.categoryId);
      const categoryName = category?.name || form.categoryName || 'General';
      const categorySlug = category?.slug || createSlug(categoryName);
      await saveArticle({
        ...form,
        id,
        slug: createSlug(form.title),
        excerpt: form.excerpt || excerptFrom(form.content),
        categoryId: category?.id || categorySlug,
        categoryName,
        categorySlug,
        tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        authorId: currentUser.id,
        authorName: profile?.name || currentUser.email || 'FTP Desk',
        publishedAt: form.status === 'published' ? form.publishedAt || new Date().toISOString() : null,
      });
      toast.success(id ? 'Article updated.' : 'Article created.');
      navigate('/admin/articles');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h1 className="mb-6 text-2xl font-extrabold">{id ? 'Edit Article' : 'Create Article'}</h1>
      <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="news-card space-y-5 p-5">
          <div>
            <label className="label">Title</label>
            <input className="input mt-2" value={form.title} onChange={(event) => setField('title', event.target.value)} required />
          </div>
          <div>
            <label className="label">Excerpt</label>
            <textarea className="input mt-2 min-h-24" value={form.excerpt} onChange={(event) => setField('excerpt', event.target.value)} />
          </div>
          <div>
            <label className="label">Article Body</label>
            <div className="mt-2">
              <RichTextEditor value={form.content} onChange={(value) => setField('content', value)} />
            </div>
          </div>
        </div>
        <aside className="news-card space-y-5 p-5">
          <div>
            <label className="label">Status</label>
            <select className="input mt-2" value={form.status} onChange={(event) => setField('status', event.target.value)}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input mt-2" value={form.categoryId} onChange={(event) => setField('categoryId', event.target.value)}>
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <input className="input mt-3" value={form.categoryName} onChange={(event) => setField('categoryName', event.target.value)} placeholder="Or type category name" />
          </div>
          <div>
            <label className="label">Tags</label>
            <input className="input mt-2" value={form.tags} onChange={(event) => setField('tags', event.target.value)} placeholder="politics, local, breaking" />
          </div>
          <div>
            <label className="label">Featured Image URL</label>
            <input className="input mt-2" value={form.featuredImageURL} onChange={(event) => setField('featuredImageURL', event.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={form.isFeatured} onChange={(event) => setField('isFeatured', event.target.checked)} /> Featured
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={form.isTrending} onChange={(event) => setField('isTrending', event.target.checked)} /> Trending
          </label>
          <div>
            <label className="label">Meta Title</label>
            <input className="input mt-2" value={form.metaTitle} onChange={(event) => setField('metaTitle', event.target.value)} />
          </div>
          <div>
            <label className="label">Meta Description</label>
            <textarea className="input mt-2 min-h-20" value={form.metaDescription} onChange={(event) => setField('metaDescription', event.target.value)} />
          </div>
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Saving...' : 'Save Article'}</button>
        </aside>
      </form>
    </section>
  );
}
