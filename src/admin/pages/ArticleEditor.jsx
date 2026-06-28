import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext.jsx';
import { createSlug } from '../../utils/slug.js';
import { cleanAuthorName, excerptFrom } from '../../utils/format.js';
import RichTextEditor from '../../components/common/RichTextEditor.jsx';
import { getArticle, listCategories, saveArticle } from '../../supabase/api.js';
import { staticCategories } from '../../data/demoContent.js';

const blank = {
  title: '',
  excerpt: '',
  content: '',
  odiaTitle: '',
  odiaExcerpt: '',
  odiaContent: '',
  featuredImageURL: '',
  categoryId: '',
  categoryName: '',
  categorySlug: '',
  authorName: '',
  tags: '',
  status: 'draft',
  isFeatured: false,
  isTrending: false,
  sourceName: '',
  sourceURL: '',
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
    listCategories()
      .then((items) => setCategories(items.length ? items : staticCategories))
      .catch(() => setCategories(staticCategories));
  }, []);

  useEffect(() => {
    if (!id) return;
    getArticle(id).then((article) => {
      if (article) setForm({ ...blank, ...article, tags: (article.tags || []).join(', ') });
    });
  }, [id]);

  useEffect(() => {
    if (id || form.authorName) return;
    setField('authorName', cleanAuthorName(profile?.name || '', 'R.C. Khotei'));
  }, [currentUser?.email, form.authorName, id, profile?.name]);

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
        authorName: cleanAuthorName(form.authorName || profile?.name || currentUser.email, 'R.C. Khotei'),
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
            <label className="label">Article Author Name</label>
            <input className="input mt-2" value={form.authorName || ''} onChange={(event) => setField('authorName', event.target.value)} placeholder="R.C. Khotei or guest author name" />
            <p className="mt-2 text-xs text-gray-500">This author name will appear on the article page and article cards.</p>
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
          <div className="rounded-lg border border-red-100 bg-red-50/60 p-4">
            <p className="section-kicker">Official Odia Version</p>
            <h2 className="mt-2 text-xl font-extrabold text-gray-950">Admin-written Odia translation</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              If you write Odia here, users selecting Odia will see this official version instead of Google auto-translate.
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="label">Odia Title</label>
                <input className="input mt-2" value={form.odiaTitle || ''} onChange={(event) => setField('odiaTitle', event.target.value)} placeholder="ଓଡ଼ିଆ ଶିରୋନାମ" />
              </div>
              <div>
                <label className="label">Odia Excerpt</label>
                <textarea className="input mt-2 min-h-24" value={form.odiaExcerpt || ''} onChange={(event) => setField('odiaExcerpt', event.target.value)} placeholder="ଓଡ଼ିଆ ସାରାଂଶ" />
              </div>
              <div>
                <label className="label">Odia Article Body</label>
                <div className="mt-2">
                  <RichTextEditor value={form.odiaContent || ''} onChange={(value) => setField('odiaContent', value)} />
                </div>
              </div>
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
            <p className="mt-2 text-xs leading-5 text-gray-500">
              Opinion = view/editorial, Fact Check = claim verification, World = international news, Youth = student/job/youth stories.
            </p>
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
          <div>
            <label className="label">Source Name</label>
            <input className="input mt-2" value={form.sourceName || ''} onChange={(event) => setField('sourceName', event.target.value)} placeholder="Official report, agency, website name" />
          </div>
          <div>
            <label className="label">Source Link</label>
            <input className="input mt-2" value={form.sourceURL || ''} onChange={(event) => setField('sourceURL', event.target.value)} placeholder="https://..." />
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
