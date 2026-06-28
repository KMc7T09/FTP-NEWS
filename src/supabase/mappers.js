import { cleanAuthorName } from '../utils/format.js';

export function mapArticle(row = {}) {
  return {
    id: row.id,
    title: row.title || '',
    slug: row.slug || '',
    excerpt: row.excerpt || '',
    content: row.content || '',
    odiaTitle: row.odia_title || '',
    odiaExcerpt: row.odia_excerpt || '',
    odiaContent: row.odia_content || '',
    featuredImageURL: row.featured_image_url || '',
    categoryId: row.category_id || '',
    categoryName: row.category_name || '',
    categorySlug: row.category_slug || '',
    tags: row.tags || [],
    authorId: row.author_id || '',
    authorName: cleanAuthorName(row.author_name, 'FTP Desk'),
    status: row.status || 'draft',
    isFeatured: Boolean(row.is_featured),
    isTrending: Boolean(row.is_trending),
    views: row.views || 0,
    shares: row.shares || 0,
    sourceName: row.source_name || '',
    sourceURL: row.source_url || '',
    metaTitle: row.meta_title || '',
    metaDescription: row.meta_description || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}

export function articleToRow(article = {}) {
  return {
    title: article.title || '',
    slug: article.slug || '',
    excerpt: article.excerpt || '',
    content: article.content || '',
    odia_title: article.odiaTitle || '',
    odia_excerpt: article.odiaExcerpt || '',
    odia_content: article.odiaContent || '',
    featured_image_url: article.featuredImageURL || '',
    category_id: article.categoryId || '',
    category_name: article.categoryName || '',
    category_slug: article.categorySlug || '',
    tags: Array.isArray(article.tags) ? article.tags : [],
    author_id: article.authorId || null,
    author_name: cleanAuthorName(article.authorName, 'FTP Desk'),
    status: article.status || 'draft',
    is_featured: Boolean(article.isFeatured),
    is_trending: Boolean(article.isTrending),
    views: Number(article.views || 0),
    shares: Number(article.shares || 0),
    source_name: article.sourceName || '',
    source_url: article.sourceURL || '',
    meta_title: article.metaTitle || '',
    meta_description: article.metaDescription || '',
    published_at: article.status === 'published' ? article.publishedAt || new Date().toISOString() : null,
  };
}

export function mapCategory(row = {}) {
  return {
    id: row.id,
    name: row.name || '',
    slug: row.slug || '',
    description: row.description || '',
    createdAt: row.created_at,
  };
}

export function mapComment(row = {}) {
  return {
    id: row.id,
    articleId: row.article_id,
    userId: row.user_id,
    userName: row.user_name,
    userEmail: row.user_email,
    text: row.text,
    status: row.status,
    reportsCount: row.reports_count || 0,
    moderationReason: row.moderation_reason || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapProfile(row = {}) {
  return {
    id: row.id,
    uid: row.id,
    name: row.name || '',
    email: row.email || '',
    phone: row.phone_number || '',
    whatsappOptIn: Boolean(row.whatsapp_opt_in),
    photoURL: row.photo_url || '',
    role: row.role || 'user',
    status: row.status || 'active',
    bannedReason: row.banned_reason || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
