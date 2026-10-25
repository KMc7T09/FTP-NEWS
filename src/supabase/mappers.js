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

export function mapPublicReportCategory(row = {}) {
  return {
    id: row.id,
    name: row.name || '',
    slug: row.slug || '',
    description: row.description || '',
    isActive: Boolean(row.is_active),
  };
}

export function mapPublicReportSource(row = {}) {
  return {
    id: row.id,
    name: row.name || '',
    websiteURL: row.website_url || '',
    organizationType: row.organization_type || '',
    jurisdiction: row.jurisdiction || '',
    notes: row.notes || '',
    isActive: Boolean(row.is_active),
  };
}

export function mapPublicReport(row = {}) {
  return {
    id: row.id,
    title: row.title || '',
    slug: row.slug || '',
    summary: row.summary || '',
    body: row.body || '',
    categoryId: row.category_id || '',
    category: row.category ? mapPublicReportCategory(row.category) : null,
    sourceId: row.source_id || '',
    source: row.source ? mapPublicReportSource(row.source) : null,
    sourceURL: row.source_url || '',
    documentURL: row.document_url || '',
    publicationDate: row.publication_date || '',
    publicationYear: row.publication_year || null,
    referenceYear: row.reference_year || null,
    referencePeriod: row.reference_period || '',
    methodology: row.methodology || '',
    scopeNotes: row.scope_notes || '',
    limitations: row.limitations || '',
    verificationStatus: row.verification_status || 'unverified',
    status: row.status || 'draft',
    verifiedAt: row.verified_at || null,
    publishedAt: row.published_at || null,
    archivedAt: row.archived_at || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
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

export function mapWeatherReport(row = {}) {
  return {
    id: row.id,
    reportDate: row.report_date,
    city: row.city || '',
    state: row.state || '',
    country: row.country || 'India',
    latitude: row.latitude,
    longitude: row.longitude,
    temperatureMax: row.temperature_max,
    temperatureMin: row.temperature_min,
    temperatureCurrent: row.temperature_current,
    precipitationProbability: row.precipitation_probability,
    rainfall: row.rainfall,
    windSpeed: row.wind_speed,
    weatherCode: row.weather_code,
    summary: row.summary || '',
    source: row.source || 'Open-Meteo',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
