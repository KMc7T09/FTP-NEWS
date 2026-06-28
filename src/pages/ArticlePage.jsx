import { Bookmark, Copy, Download, Flag, Heart, MessageCircle, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import { cleanAuthorName, formatDate, readTime } from '../utils/format.js';
import ArticleCard from '../components/article/ArticleCard.jsx';
import AdSlot from '../components/common/AdSlot.jsx';
import ArticleListenControls from '../components/common/ArticleListenControls.jsx';
import ArticleSummaryControls from '../components/common/ArticleSummaryControls.jsx';
import InlineTranslate, { translateHtmlPreservingFormat, translateLongText } from '../components/common/InlineTranslate.jsx';
import Seo from '../components/common/Seo.jsx';
import LoadingScreen from '../components/ui/LoadingScreen.jsx';
import {
  countArticleLikes,
  countArticleComments,
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

function stripHtml(value = '') {
  const element = document.createElement('div');
  element.innerHTML = value;
  return element.textContent || element.innerText || '';
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const pdfLanguages = [
  ['en', 'English'],
  ['hi', 'Hindi'],
  ['or', 'Odia'],
  ['bn', 'Bengali'],
  ['ta', 'Tamil'],
  ['te', 'Telugu'],
  ['mr', 'Marathi'],
  ['gu', 'Gujarati'],
  ['pa', 'Punjabi'],
  ['ur', 'Urdu'],
];

export default function ArticlePage() {
  const { slug } = useParams();
  const { currentUser, profile, isBanned, loading } = useAuth();
  const [article, setArticle] = useState(null);
  const [related, setRelated] = useState([]);
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState('');
  const [liking, setLiking] = useState(false);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [translatedContent, setTranslatedContent] = useState('');
  const [translatedTitle, setTranslatedTitle] = useState('');
  const [translatedExcerpt, setTranslatedExcerpt] = useState('');
  const [pdfLanguage, setPdfLanguage] = useState('en');
  const [pdfBusy, setPdfBusy] = useState(false);
  const canInteractWithArticle = Boolean(article?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(article.id));

  async function getRealArticleForAction() {
    if (canInteractWithArticle) return article;
    if (!article) throw new Error('Article not found.');
    const existing = await getArticleBySlugDb(article.slug);
    if (existing) {
      setArticle(existing);
      return existing;
    }
    throw new Error('This article is being prepared. Please try again later.');
  }

  useEffect(() => {
    getArticleBySlugDb(slug)
      .then((row) => {
        setArticle(row);
        if (!row) return;
        listArticles({ publishedOnly: true, categorySlug: row.categorySlug || row.categoryId, limit: 4 })
          .then((items) => setRelated(items.filter((item) => item.id !== row.id).slice(0, 3)))
          .catch(() => {});
      })
      .catch(() => setArticle(null));
  }, [slug]);

  useEffect(() => {
    setTranslatedContent('');
    setTranslatedTitle('');
    setTranslatedExcerpt('');
  }, [article?.id, article?.content]);

  useEffect(() => {
    if (!article?.id) return;
    listComments({ approvedOnly: true })
      .then((items) => {
        const articleComments = items.filter((item) => item.articleId === article.id);
        setComments(articleComments);
        setCommentCount(articleComments.length);
      })
      .catch(() => {
        setComments([]);
        setCommentCount(0);
      });
    if (canInteractWithArticle) {
      countArticleLikes(article.id).then(setLikeCount).catch(() => setLikeCount(0));
      countArticleComments(article.id).then(setCommentCount).catch(() => {});
    }
    if (currentUser && canInteractWithArticle) {
      hasUserLiked(article.id, currentUser.id).then(setLiked).catch(() => setLiked(false));
      hasUserBookmarked(article.id, currentUser.id).then(setBookmarked).catch(() => setBookmarked(false));
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
      if (saved.status === 'approved') {
        setComments((items) => [saved, ...items]);
        setCommentCount((count) => count + 1);
      }
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

  function shareTo(platform) {
    const target = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(article.title);
    const urls = {
      whatsapp: `https://wa.me/?text=${text}%20${target}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${target}`,
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${target}`,
    };
    window.open(urls[platform], '_blank', 'noopener,noreferrer');
  }

  async function getPdfContent(target) {
    if (target === 'en') {
      return {
        title: article.title,
        excerpt: article.excerpt,
        body: article.content,
        languageLabel: 'English',
      };
    }

    const languageLabel = pdfLanguages.find(([code]) => code === target)?.[1] || 'Selected language';

    if (target === 'or' && (article.odiaTitle || article.odiaExcerpt || article.odiaContent)) {
      return {
        title: article.odiaTitle || article.title,
        excerpt: article.odiaExcerpt || article.excerpt,
        body: article.odiaContent || article.content,
        languageLabel: 'Odia',
      };
    }

    const [title, excerpt, body] = await Promise.all([
      article.title ? translateLongText(article.title, target) : Promise.resolve(''),
      article.excerpt ? translateLongText(article.excerpt, target) : Promise.resolve(''),
      translateHtmlPreservingFormat(article.content, target),
    ]);

    return {
      title: title || article.title,
      excerpt: excerpt || article.excerpt,
      body: body || article.content,
      languageLabel,
    };
  }

  async function downloadArticlePdf(target = 'en') {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Popup blocked. Please allow popups to download PDF.');
      return;
    }

    setPdfBusy(true);
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Preparing FTP PDF...</title>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #111827; }
            .box { border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; max-width: 680px; }
            .brand { color: #dc1f2a; font-weight: 900; letter-spacing: .14em; text-transform: uppercase; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="box">
            <p class="brand">FTP - Fresh Take Politics</p>
            <h1>Preparing PDF...</h1>
            <p>Please wait. Translation and article layout are loading.</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();

    try {
      const { title, excerpt, body, languageLabel } = await getPdfContent(target);
      const author = cleanAuthorName(article.authorName, 'FTP Desk');
      const image = article.featuredImageURL || '';
      const source = article.sourceURL
        ? `<p><strong>Source:</strong> <a href="${escapeHtml(article.sourceURL)}">${escapeHtml(article.sourceName || article.sourceURL)}</a></p>`
        : article.sourceName
          ? `<p><strong>Source:</strong> ${escapeHtml(article.sourceName)}</p>`
          : '';

      printWindow.document.open();
      printWindow.document.write(`
        <!doctype html>
        <html>
          <head>
            <title>${escapeHtml(title)} - FTP</title>
            <meta charset="utf-8" />
            <style>
              * { box-sizing: border-box; }
              body { font-family: Georgia, 'Times New Roman', serif; color: #111827; margin: 0; padding: 72px 36px 64px; line-height: 1.65; }
              .pdf-header, .pdf-footer {
                position: fixed;
                left: 0;
                right: 0;
                background: #fff;
                font-family: Arial, sans-serif;
                color: #111827;
              }
              .pdf-header {
                top: 0;
                border-bottom: 1px solid #e5e7eb;
                padding: 12px 36px 10px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 18px;
              }
              .pdf-footer {
                bottom: 0;
                border-top: 1px solid #e5e7eb;
                padding: 10px 36px;
                font-size: 11px;
                color: #6b7280;
              }
              .logo { font-size: 24px; font-weight: 900; letter-spacing: -0.04em; }
              .tagline { font-size: 10px; font-weight: 900; letter-spacing: .18em; color: #dc1f2a; text-transform: uppercase; }
              .header-author { text-align: right; font-size: 11px; color: #4b5563; }
              .brand { font-family: Arial, sans-serif; font-size: 13px; font-weight: 800; letter-spacing: .14em; color: #dc1f2a; text-transform: uppercase; }
              h1 { font-size: 34px; line-height: 1.12; margin: 12px 0; page-break-after: avoid; }
              .excerpt { font-size: 18px; color: #4b5563; }
              .meta, .source, .language { font-family: Arial, sans-serif; color: #4b5563; font-size: 13px; }
              img { width: 100%; max-height: 420px; object-fit: cover; margin: 24px 0; border-radius: 8px; page-break-inside: avoid; }
              article { font-size: 17px; }
              article p, article blockquote, article li { page-break-inside: avoid; }
              .end-note { margin-top: 36px; border-top: 1px solid #e5e7eb; padding-top: 16px; font-family: Arial, sans-serif; font-size: 12px; color: #6b7280; }
              @page { margin: 14mm; }
            </style>
          </head>
          <body>
            <header class="pdf-header">
              <div>
                <div class="logo">FTP</div>
                <div class="tagline">Fresh Take Politics</div>
              </div>
              <div class="header-author">
                <strong>${escapeHtml(author)}</strong><br />
                ${escapeHtml(article.categoryName || 'News')} | ${escapeHtml(formatDate(article.publishedAt))}
              </div>
            </header>
            <footer class="pdf-footer">
              FTP - Fresh Take Politics | Author: ${escapeHtml(author)} | ${escapeHtml(window.location.href)}
            </footer>
            <div class="brand">FTP - Fresh Take Politics</div>
            <h1>${escapeHtml(title)}</h1>
            <p class="excerpt">${escapeHtml(excerpt)}</p>
            <p class="meta">By ${escapeHtml(author)} | ${escapeHtml(formatDate(article.publishedAt))} | ${escapeHtml(article.categoryName || 'News')}</p>
            <p class="language">PDF language: ${escapeHtml(languageLabel)}</p>
            ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" />` : ''}
            <article>${body}</article>
            <div class="source">${source}</div>
            <div class="end-note">Downloaded from FTP - Fresh Take Politics.</div>
            <script>
              window.onload = function () {
                setTimeout(function () {
                  window.print();
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      toast.success('PDF ready. Choose Save as PDF.');
    } catch (error) {
      printWindow.close();
      toast.error(error.message || 'PDF download failed.');
    } finally {
      setPdfBusy(false);
    }
  }

  async function reportComment(item) {
    if (!currentUser) return toast.error('Please log in to report.');
    toast.success('Report received.');
  }

  if (!article) {
    return <div className="container-page py-16 text-center text-gray-600">Article not found or not available.</div>;
  }

  if (loading) return <LoadingScreen />;

  return (
    <>
      <Seo
        title={`${article.metaTitle || article.title} | FTP - Fresh Take Politics`}
        description={article.metaDescription || article.excerpt}
        image={article.featuredImageURL}
        type="article"
        jsonLd={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'NewsArticle',
              headline: article.title,
              description: article.excerpt,
              image: article.featuredImageURL ? [article.featuredImageURL] : undefined,
              datePublished: article.publishedAt,
              dateModified: article.updatedAt || article.publishedAt,
              author: { '@type': 'Person', name: cleanAuthorName(article.authorName, 'FTP Desk') },
              publisher: { '@type': 'Organization', name: 'FTP - Fresh Take Politics' },
              mainEntityOfPage: typeof window !== 'undefined' ? window.location.href : undefined,
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: typeof window !== 'undefined' ? window.location.origin : undefined },
                { '@type': 'ListItem', position: 2, name: article.categoryName || 'News', item: typeof window !== 'undefined' ? `${window.location.origin}/category/${article.categorySlug || article.categoryId}` : undefined },
                { '@type': 'ListItem', position: 3, name: article.title, item: typeof window !== 'undefined' ? window.location.href : undefined },
              ],
            },
          ],
        }}
      />
      <article className="bg-white">
        <div className="container-page grid gap-10 py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <nav className="mb-5 flex flex-wrap gap-2 text-sm font-semibold text-gray-500" aria-label="Breadcrumb">
              <Link to="/" className="hover:text-brand-red">Home</Link>
              <span>/</span>
              <Link to={`/category/${article.categorySlug || article.categoryId}`} className="hover:text-brand-red">{article.categoryName || 'News'}</Link>
              <span>/</span>
              <span className="text-gray-900">Article</span>
            </nav>
            <div className="mb-4 flex flex-wrap gap-3 text-sm font-bold uppercase tracking-wide text-brand-red">
              <Link to={`/category/${article.categorySlug || article.categoryId}`}>{article.categoryName}</Link>
              <span className="text-gray-400">{formatDate(article.publishedAt)}</span>
              <span className="text-gray-400">Updated {formatDate(article.updatedAt || article.publishedAt)}</span>
              <span className="text-gray-400">{readTime(article.content)}</span>
              <span className="text-gray-400">{article.categorySlug === 'opinion' ? 'Opinion' : article.categorySlug === 'fact-check' ? 'Fact Check' : 'News'}</span>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-5 sm:p-7">
              <h1 className="max-w-4xl text-3xl font-extrabold leading-tight text-gray-950 md:text-5xl">{translatedTitle || article.title}</h1>
              <p className="mt-4 text-lg leading-8 text-gray-600">{translatedExcerpt || article.excerpt}</p>
            </div>
            <div className="mt-5 grid gap-4 border-y border-gray-200 py-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <span className="text-sm font-semibold text-gray-700">By {cleanAuthorName(article.authorName, 'News Desk')}</span>
                <div className="mt-2 flex flex-wrap gap-3 text-xs font-bold uppercase tracking-wide text-gray-500">
                  <span>{likeCount} likes</span>
                  <span>{commentCount} comments</span>
                  <span>{article.shares || 0} shares</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <button className={bookmarked ? 'btn-primary' : 'btn-secondary'} onClick={bookmarkArticle}>
                  <Bookmark size={16} /> {bookmarked ? 'Bookmarked' : 'Bookmark'}
                </button>
                <button className={liked ? 'btn-primary bg-red-600 hover:bg-red-700' : 'btn-secondary'} onClick={likeArticle} disabled={liking}>
                  <Heart size={16} fill={liked ? 'currentColor' : 'none'} /> {liked ? 'Unlike' : 'Like'} ({likeCount})
                </button>
                <span className="btn-secondary cursor-default">
                  <MessageCircle size={16} /> {commentCount}
                </span>
                <button className="btn-secondary" onClick={shareArticle}>
                  <Share2 size={16} /> Share
                </button>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-2">
                  <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wide text-gray-500">Download article</label>
                  <div className="flex flex-wrap gap-2">
                    <select
                      className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm font-bold text-gray-700 outline-none"
                      value={pdfLanguage}
                      onChange={(event) => setPdfLanguage(event.target.value)}
                      aria-label="PDF language"
                    >
                      {pdfLanguages.map(([code, label]) => (
                        <option key={code} value={code}>{label}</option>
                      ))}
                    </select>
                    <button className="inline-flex h-10 items-center gap-2 rounded-md bg-gray-950 px-4 text-sm font-extrabold text-white hover:bg-brand-red disabled:cursor-not-allowed disabled:opacity-70" onClick={() => downloadArticlePdf(pdfLanguage)} disabled={pdfBusy}>
                      <Download size={16} /> {pdfBusy ? 'Preparing...' : 'Download PDF'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex flex-wrap items-center gap-3">
              <InlineTranslate
                html={article.content}
                title={article.title}
                excerpt={article.excerpt}
                officialOdiaTitle={article.odiaTitle}
                officialOdiaExcerpt={article.odiaExcerpt}
                officialOdiaHtml={article.odiaContent}
                onTranslated={setTranslatedContent}
                onTitleTranslated={setTranslatedTitle}
                onExcerptTranslated={setTranslatedExcerpt}
                onReset={() => {
                  setTranslatedContent('');
                  setTranslatedTitle('');
                  setTranslatedExcerpt('');
                }}
              />
              <ArticleListenControls
                title={article.title}
                excerpt={article.excerpt}
                html={article.content}
                translatedTitle={translatedTitle}
                translatedExcerpt={translatedExcerpt}
                translatedHtml={translatedContent}
                officialOdiaTitle={article.odiaTitle}
                officialOdiaExcerpt={article.odiaExcerpt}
                officialOdiaHtml={article.odiaContent}
                onTranslated={setTranslatedContent}
                onTitleTranslated={setTranslatedTitle}
                onExcerptTranslated={setTranslatedExcerpt}
                onReset={() => {
                  setTranslatedContent('');
                  setTranslatedTitle('');
                  setTranslatedExcerpt('');
                }}
              />
              <ArticleSummaryControls
                title={article.title}
                excerpt={article.excerpt}
                html={article.content}
                translatedTitle={translatedTitle}
                translatedExcerpt={translatedExcerpt}
                translatedHtml={translatedContent}
              />
              </div>
            </div>
            <img src={article.featuredImageURL} alt={article.title} className="mt-6 aspect-video max-h-[560px] w-full rounded-lg object-cover" loading="eager" />
            <AdSlot label="Article Middle Ad Slot" position="article-middle" className="my-8" />
            <div className="prose-news mx-auto max-w-[760px]" dangerouslySetInnerHTML={{ __html: translatedContent || article.content }} />
            {(article.sourceName || article.sourceURL) && (
              <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-extrabold uppercase tracking-wide text-gray-500">Source / Credit</p>
                {article.sourceURL ? (
                  <a href={article.sourceURL} target="_blank" rel="noreferrer" className="mt-2 inline-flex break-all text-sm font-bold text-brand-blue hover:text-brand-red">
                    {article.sourceName || article.sourceURL}
                  </a>
                ) : (
                  <p className="mt-2 text-sm font-semibold text-gray-700">{article.sourceName}</p>
                )}
              </div>
            )}
            {article.tags?.length ? (
              <div className="mt-6 flex flex-wrap gap-2">
                {article.tags.map((tag) => <span key={tag} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">#{tag}</span>)}
              </div>
            ) : null}
            <div className="mt-8 rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs font-extrabold uppercase tracking-wide text-gray-500">Share this story</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn-secondary" onClick={() => shareTo('whatsapp')}>WhatsApp</button>
                <button className="btn-secondary" onClick={() => shareTo('facebook')}>Facebook</button>
                <button className="btn-secondary" onClick={() => shareTo('twitter')}>X/Twitter</button>
                <button className="btn-secondary" onClick={shareArticle}><Copy size={16} /> Copy Link</button>
                <Link to="/contact" className="btn-secondary"><Flag size={16} /> Report Correction</Link>
              </div>
            </div>
            <AdSlot label="Article Bottom Ad Slot" position="article-bottom" className="my-8" />

            <section className="mt-10 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:p-6">
              <h2 className="mb-4 flex items-center gap-2 text-2xl font-extrabold">
                Comments <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">{commentCount}</span>
              </h2>
              <form onSubmit={submitComment} className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
                {currentUser ? (
                  <>
                    <textarea className="input min-h-28" value={comment} onChange={(event) => setComment(event.target.value)} placeholder={isBanned ? 'Banned users cannot comment.' : 'Join the discussion'} disabled={isBanned} />
                    <button className="btn-primary mt-3" disabled={isBanned}>
                      Post Comment
                    </button>
                  </>
                ) : (
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-sm font-semibold text-gray-700">You can read the full article without joining. Join only if you want to comment, like, bookmark, or report.</p>
                    <Link to="/login" className="btn-primary mt-3">Join to Comment</Link>
                  </div>
                )}
              </form>
              <div className="space-y-4">
                {comments.map((item) => (
                  <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-4">
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
