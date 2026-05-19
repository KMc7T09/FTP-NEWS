import { Bookmark, Flag, Heart, MessageCircle, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import { formatDate, readTime } from '../utils/format.js';
import ArticleCard from '../components/article/ArticleCard.jsx';
import AdSlot from '../components/common/AdSlot.jsx';
import InlineTranslate from '../components/common/InlineTranslate.jsx';
import Seo from '../components/common/Seo.jsx';
import { getArticleBySlug, getArticlesByCategory } from '../data/demoContent.js';
import {
  countArticleLikes,
  ensureArticleInSupabase,
  getArticleBySlugDb,
  hasUserBookmarked,
  hasUserLiked,
  listArticles,
  listComments,
  recordShare,
  saveComment,
  toggleBookmark,
  toggleLike,
} from '../supabase/api.js';
import { getModerationReason, hasVulgarContent } from '../utils/moderation.js';

export default function ArticlePage() {
  const { slug } = useParams();
  const { currentUser, profile, isBanned, isEditor, isAdmin } = useAuth();
  const [article, setArticle] = useState(getArticleBySlug(slug));
  const [related, setRelated] = useState(article ? getArticlesByCategory(article.categorySlug || article.categoryId).filter((item) => item.id !== article.id).slice(0, 3) : []);
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState('');
  const [liking, setLiking] = useState(false);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [translatedContent, setTranslatedContent] = useState('');
  const canInteractWithArticle = Boolean(article?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(article.id));

  async function getRealArticleForAction() {
    if (canInteractWithArticle) return article;
    if (!article) throw new Error('Article not found.');
    const existing = await getArticleBySlugDb(article.slug);
    if (existing) {
      setArticle(existing);
      return existing;
    }
    if (isAdmin || isEditor) {
      const saved = await ensureArticleInSupabase(article);
      setArticle(saved);
      toast.success('Article added to Supabase.');
      return saved;
    }
    throw new Error('This article is being prepared. Please try again later.');
  }

  useEffect(() => {
    getArticleBySlugDb(slug)
      .then((row) => {
        const next = row || getArticleBySlug(slug);
        setArticle(next);
        if (next) {
          listArticles({ publishedOnly: true, categorySlug: next.categorySlug || next.categoryId, limit: 4 })
            .then((items) => setRelated(items.filter((item) => item.id !== next.id).slice(0, 3)))
            .catch(() => {});
        }
      })
      .catch(() => setArticle(getArticleBySlug(slug)));
  }, [slug]);

  useEffect(() => {
    setTranslatedContent('');
  }, [article?.id, article?.content]);

  useEffect(() => {
    if (!article?.id) return;
    listComments({ approvedOnly: true })
      .then((items) => setComments(items.filter((item) => item.articleId === article.id)))
      .catch(() => setComments([]));
    if (currentUser && canInteractWithArticle) {
      hasUserLiked(article.id, currentUser.id).then(setLiked).catch(() => setLiked(false));
      hasUserBookmarked(article.id, currentUser.id).then(setBookmarked).catch(() => setBookmarked(false));
      countArticleLikes(article.id).then(setLikeCount).catch(() => setLikeCount(0));
    }
  }, [article?.id, canInteractWithArticle, currentUser?.id]);

  async function submitComment(event) {
    event.preventDefault();
    try {
      if (!currentUser) return toast.error('Please log in to comment.');
      if (isBanned) return toast.error('Your account is banned from commenting.');
      if (!comment.trim()) return;
      const realArticle = await getRealArticleForAction();
      const saved = await saveComment({
        articleId: realArticle.id,
        userId: currentUser.id,
        userName: profile?.name || currentUser.email || 'Reader',
        userEmail: currentUser.email,
        text: comment.trim(),
        status: hasVulgarContent(comment) ? 'pending' : 'approved',
        moderationReason: getModerationReason(comment),
      });
      setComments((items) => (saved.status === 'approved' ? [saved, ...items] : items));
      setComment('');
      toast.success(saved.status === 'approved' ? 'Comment posted.' : 'Comment sent for approval.');
    } catch (error) {
      toast.error(error.message || 'Comment failed.');
    }
  }

  async function bookmarkArticle() {
    if (!currentUser) return toast.error('Please log in to bookmark.');
    try {
      const realArticle = await getRealArticleForAction();
      const next = await toggleBookmark(realArticle.id, currentUser.id);
      setBookmarked(next);
      toast.success(next ? 'Bookmarked.' : 'Bookmark removed.');
    } catch (error) {
      toast.error(error.message || 'Bookmark failed.');
    }
  }

  async function likeArticle() {
    if (!currentUser) return toast.error('Please log in to like.');
    setLiking(true);
    try {
      const realArticle = await getRealArticleForAction();
      const liked = await toggleLike(realArticle.id, currentUser.id);
      setLiked(liked);
      setLikeCount((count) => Math.max(0, count + (liked ? 1 : -1)));
      toast.success(liked ? 'Liked.' : 'Like removed.');
    } catch (error) {
      toast.error(error.message || 'Like failed.');
    } finally {
      setLiking(false);
    }
  }

  async function shareArticle() {
    const data = { title: article.title, url: window.location.href };
    if (navigator.share) await navigator.share(data);
    else await navigator.clipboard?.writeText(window.location.href);
    getRealArticleForAction()
      .then((realArticle) => recordShare(realArticle.id, realArticle.shares || 0))
      .catch(() => {});
    toast.success('Share link ready.');
  }

  async function reportComment(item) {
    if (!currentUser) return toast.error('Please log in to report.');
    toast.success('Report received.');
  }

  if (!article) {
    return <div className="container-page py-16 text-center text-gray-600">Article not found or not available.</div>;
  }

  return (
    <>
      <Seo title={article.metaTitle || article.title} description={article.metaDescription || article.excerpt} image={article.featuredImageURL} type="article" />
      <article className="bg-white">
        <div className="container-page grid gap-10 py-8 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="mb-4 flex flex-wrap gap-3 text-sm font-bold uppercase tracking-wide text-brand-red">
              <Link to={`/category/${article.categorySlug || article.categoryId}`}>{article.categoryName}</Link>
              <span className="text-gray-400">{formatDate(article.publishedAt)}</span>
              <span className="text-gray-400">{readTime(article.content)}</span>
            </div>
            <h1 className="max-w-4xl text-3xl font-extrabold leading-tight text-gray-950 md:text-5xl">{article.title}</h1>
            <p className="mt-4 text-lg leading-8 text-gray-600">{article.excerpt}</p>
            <div className="mt-5 flex items-center justify-between border-y border-gray-200 py-4">
              <span className="text-sm font-semibold text-gray-700">By {article.authorName || 'News Desk'}</span>
              <div className="flex flex-wrap justify-end gap-2">
                <button className={bookmarked ? 'btn-primary' : 'btn-secondary'} onClick={bookmarkArticle}>
                  <Bookmark size={16} /> {bookmarked ? 'Bookmarked' : 'Bookmark'}
                </button>
                <button className={liked ? 'btn-primary bg-red-600 hover:bg-red-700' : 'btn-secondary'} onClick={likeArticle} disabled={liking}>
                  <Heart size={16} fill={liked ? 'currentColor' : 'none'} /> {liked ? 'Unlike' : 'Like'} {likeCount ? `(${likeCount})` : ''}
                </button>
                <span className="btn-secondary cursor-default">
                  <MessageCircle size={16} /> {comments.length}
                </span>
                <button className="btn-secondary" onClick={shareArticle}>
                  <Share2 size={16} /> Share
                </button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <InlineTranslate html={article.content} onTranslated={setTranslatedContent} onReset={() => setTranslatedContent('')} />
            </div>
            <img src={article.featuredImageURL} alt={article.title} className="mt-6 max-h-[560px] w-full rounded-lg object-cover" />
            <AdSlot label="Article Middle Ad Slot" position="article-middle" className="my-8" />
            <div className="prose-news" dangerouslySetInnerHTML={{ __html: translatedContent || article.content }} />
            <AdSlot label="Article Bottom Ad Slot" position="article-bottom" className="my-8" />

            <section className="mt-10">
              <h2 className="mb-4 flex items-center gap-2 text-2xl font-extrabold">
                Comments <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">{comments.length}</span>
              </h2>
              <form onSubmit={submitComment} className="news-card mb-6 p-4">
                <textarea className="input min-h-28" value={comment} onChange={(event) => setComment(event.target.value)} placeholder={isBanned ? 'Banned users cannot comment.' : 'Join the discussion'} disabled={isBanned} />
                <button className="btn-primary mt-3" disabled={isBanned}>
                  Post Comment
                </button>
              </form>
              <div className="space-y-4">
                {comments.map((item) => (
                  <div key={item.id} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex justify-between gap-4">
                      <div>
                        <p className="font-bold">{item.userName}</p>
                        <p className="mt-2 text-sm leading-6 text-gray-700">{item.text}</p>
                      </div>
                      <button className="text-gray-400 hover:text-brand-red" onClick={() => reportComment(item)} aria-label="Report comment">
                        <Flag size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
          <aside className="space-y-6">
            <AdSlot label="Sidebar Ad Slot" position="sidebar" />
            <h2 className="text-xl font-extrabold">Related Articles</h2>
            {related.map((item) => (
              <ArticleCard key={item.id} article={item} />
            ))}
          </aside>
        </div>
      </article>
    </>
  );
}
