import { supabase, supabaseReady } from './config.js';
import { articleToRow, mapArticle, mapCategory, mapComment, mapProfile } from './mappers.js';

function requireSupabase() {
  if (!supabaseReady || !supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

function isUuid(value = '') {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function getProfile(userId) {
  const client = requireSupabase();
  const { data, error } = await client.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data ? mapProfile(data) : null;
}

export async function upsertProfile(profile) {
  const client = requireSupabase();
  const row = {
    id: profile.id || profile.uid,
    name: profile.name || '',
    email: profile.email || '',
    phone_number: profile.phone || profile.phoneNumber || '',
    whatsapp_opt_in: Boolean(profile.whatsappOptIn),
    photo_url: profile.photoURL || '',
    role: profile.role || 'user',
    status: profile.status || 'active',
    banned_reason: profile.bannedReason || '',
    updated_at: new Date().toISOString(),
  };
  let result = await client.from('profiles').upsert(row).select('*').single();
  if (result.error && String(result.error.message).includes('phone_number')) {
    const { phone_number, whatsapp_opt_in, ...fallbackRow } = row;
    result = await client.from('profiles').upsert(fallbackRow).select('*').single();
  }
  if (result.error) throw result.error;
  return mapProfile(result.data);
}

export async function listProfiles() {
  const client = requireSupabase();
  const { data, error } = await client.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapProfile);
}

export async function updateProfileAdmin(id, updates) {
  const client = requireSupabase();
  const row = {
    ...(updates.name !== undefined ? { name: updates.name } : {}),
    ...(updates.photoURL !== undefined ? { photo_url: updates.photoURL } : {}),
    ...(updates.phone !== undefined ? { phone_number: updates.phone } : {}),
    ...(updates.whatsappOptIn !== undefined ? { whatsapp_opt_in: Boolean(updates.whatsappOptIn) } : {}),
    ...(updates.role !== undefined ? { role: updates.role } : {}),
    ...(updates.status !== undefined ? { status: updates.status } : {}),
    ...(updates.bannedReason !== undefined ? { banned_reason: updates.bannedReason } : {}),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await client.from('profiles').update(row).eq('id', id).select('*').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Role update blocked. Run the Supabase admin policy SQL and try again.');
  return mapProfile(data);
}

export async function listArticles({ publishedOnly = false, categorySlug = '', limit = 50 } = {}) {
  const client = requireSupabase();
  let query = client.from('articles').select('*').order('published_at', { ascending: false }).limit(limit);
  if (publishedOnly) query = query.eq('status', 'published');
  if (categorySlug) query = query.eq('category_slug', categorySlug);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapArticle);
}

export async function getArticleBySlugDb(slug) {
  const client = requireSupabase();
  const { data, error } = await client.from('articles').select('*').eq('slug', slug).eq('status', 'published').maybeSingle();
  if (error) throw error;
  return data ? mapArticle(data) : null;
}

export async function getArticle(id) {
  const client = requireSupabase();
  const { data, error } = await client.from('articles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? mapArticle(data) : null;
}

export async function saveArticle(article) {
  const client = requireSupabase();
  const row = articleToRow(article);

  let request;
  if (article.id && isUuid(article.id)) {
    request = client.from('articles').update(row).eq('id', article.id).select('*').single();
  } else {
    request = client.from('articles').upsert(row, { onConflict: 'slug' }).select('*').single();
  }

  const { data, error } = await request;
  if (error) throw error;
  const mapped = mapArticle(data);
  if (mapped.status === 'published') notifyArticlePublished(mapped).catch(() => {});
  return mapped;
}

async function notifyArticlePublished(article) {
  if (typeof fetch !== 'function') return;
  await fetch('/.netlify/functions/notify-whatsapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      url: `${window.location.origin}/article/${article.slug}`,
    }),
  });
}

export async function ensureArticleInSupabase(article) {
  const existing = await getArticleBySlugDb(article.slug);
  if (existing) return existing;
  return saveArticle({
    ...article,
    id: undefined,
    status: 'published',
    publishedAt: article.publishedAt || new Date().toISOString(),
  });
}

export async function deleteArticle(id) {
  const client = requireSupabase();
  const { error } = await client.from('articles').delete().eq('id', id);
  if (error) throw error;
}

export async function listCategories() {
  const client = requireSupabase();
  const { data, error } = await client.from('categories').select('*').order('name');
  if (error) throw error;
  return (data || []).map(mapCategory);
}

export async function saveCategory(category) {
  const client = requireSupabase();
  const row = { name: category.name, slug: category.slug, description: category.description || '' };
  const request = category.id
    ? client.from('categories').update(row).eq('id', category.id).select('*').single()
    : client.from('categories').insert(row).select('*').single();
  const { data, error } = await request;
  if (error) throw error;
  return mapCategory(data);
}

export async function deleteCategory(id) {
  const client = requireSupabase();
  const { error } = await client.from('categories').delete().eq('id', id);
  if (error) throw error;
}

export async function listComments({ approvedOnly = false } = {}) {
  const client = requireSupabase();
  let query = client.from('comments').select('*').order('created_at', { ascending: false });
  if (approvedOnly) query = query.eq('status', 'approved');
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapComment);
}

export async function saveComment(comment) {
  const client = requireSupabase();
  const payload = {
    article_id: comment.articleId,
    user_id: comment.userId,
    user_name: comment.userName,
    user_email: comment.userEmail,
    text: comment.text,
    status: comment.status || 'pending',
    moderation_reason: comment.moderationReason || '',
  };
  let result = await client
    .from('comments')
    .insert(payload)
    .select('*')
    .single();
  if (result.error && String(result.error.message).includes('moderation_reason')) {
    const { moderation_reason, ...fallbackPayload } = payload;
    result = await client.from('comments').insert(fallbackPayload).select('*').single();
  }
  if (result.error) throw result.error;
  return mapComment(result.data);
}

export async function updateComment(id, updates) {
  const client = requireSupabase();
  const row = {
    ...(updates.text !== undefined ? { text: updates.text } : {}),
    ...(updates.status !== undefined ? { status: updates.status } : {}),
    ...(updates.reportsCount !== undefined ? { reports_count: updates.reportsCount } : {}),
    ...(updates.moderationReason !== undefined ? { moderation_reason: updates.moderationReason } : {}),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await client.from('comments').update(row).eq('id', id).select('*').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Comment update blocked. Check Supabase admin policy and your profile role.');
  return mapComment(data);
}

export async function deleteComment(id) {
  const client = requireSupabase();
  const { error } = await client.from('comments').delete().eq('id', id);
  if (error) throw error;
}

export async function getSettings() {
  const client = requireSupabase();
  const { data, error } = await client.from('settings').select('*').eq('id', 'site').maybeSingle();
  if (error) throw error;
  return data?.data || null;
}

export async function saveSettings(settings) {
  const client = requireSupabase();
  const row = { id: 'site', data: settings, updated_at: new Date().toISOString() };
  let result = await client.from('settings').update(row).eq('id', 'site').select('*').maybeSingle();
  if (!result.error && !result.data) {
    result = await client.from('settings').insert(row).select('*').maybeSingle();
  }
  if (result.error) throw result.error;
  if (!result.data) throw new Error('Settings save blocked. Check Supabase admin policy and your profile role.');
  return result.data.data;
}

export async function listAds() {
  const client = requireSupabase();
  const { data, error } = await client.from('ads').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    position: row.position,
    type: row.type,
    content: row.content,
    isActive: row.is_active,
    createdAt: row.created_at,
  }));
}

export async function listActiveAds() {
  const client = requireSupabase();
  const { data, error } = await client.from('ads').select('*').eq('is_active', true);
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    position: row.position,
    type: row.type,
    content: row.content,
    isActive: row.is_active,
    createdAt: row.created_at,
  }));
}

export async function saveAd(ad) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('ads')
    .insert({ position: ad.position, type: ad.type, content: ad.content, is_active: ad.isActive })
    .select('*')
    .single();
  if (error) throw error;
  return { id: data.id, position: data.position, type: data.type, content: data.content, isActive: data.is_active, createdAt: data.created_at };
}

export async function updateAd(id, updates) {
  const client = requireSupabase();
  const row = {
    ...(updates.isActive !== undefined ? { is_active: updates.isActive } : {}),
    ...(updates.content !== undefined ? { content: updates.content } : {}),
    ...(updates.position !== undefined ? { position: updates.position } : {}),
    ...(updates.type !== undefined ? { type: updates.type } : {}),
  };
  const { data, error } = await client.from('ads').update(row).eq('id', id).select('*').single();
  if (error) throw error;
  return { id: data.id, position: data.position, type: data.type, content: data.content, isActive: data.is_active, createdAt: data.created_at };
}

export async function listLikes() {
  const client = requireSupabase();
  const { data, error } = await client.from('likes').select('*');
  if (error) throw error;
  return data || [];
}

export async function toggleLike(articleId, userId) {
  const client = requireSupabase();
  const existing = await client.from('likes').select('id').eq('article_id', articleId).eq('user_id', userId).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data?.id) {
    const { error } = await client.from('likes').delete().eq('id', existing.data.id);
    if (error) throw error;
    return false;
  }
  const { error } = await client.from('likes').insert({ article_id: articleId, user_id: userId });
  if (error) throw error;
  return true;
}

export async function hasUserLiked(articleId, userId) {
  const client = requireSupabase();
  const { data, error } = await client.from('likes').select('id').eq('article_id', articleId).eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return Boolean(data?.id);
}

export async function countArticleLikes(articleId) {
  const client = requireSupabase();
  const { count, error } = await client.from('likes').select('id', { count: 'exact', head: true }).eq('article_id', articleId);
  if (error) throw error;
  return count || 0;
}

export async function countArticleComments(articleId) {
  const client = requireSupabase();
  const { count, error } = await client
    .from('comments')
    .select('id', { count: 'exact', head: true })
    .eq('article_id', articleId)
    .eq('status', 'approved');
  if (error) throw error;
  return count || 0;
}

export async function toggleBookmark(articleId, userId) {
  const client = requireSupabase();
  const existing = await client.from('bookmarks').select('id').eq('article_id', articleId).eq('user_id', userId).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data?.id) {
    const { error } = await client.from('bookmarks').delete().eq('id', existing.data.id);
    if (error) throw error;
    return false;
  }
  const { error } = await client.from('bookmarks').insert({ article_id: articleId, user_id: userId });
  if (error) throw error;
  return true;
}

export async function hasUserBookmarked(articleId, userId) {
  const client = requireSupabase();
  const { data, error } = await client.from('bookmarks').select('id').eq('article_id', articleId).eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return Boolean(data?.id);
}

export async function recordShare(articleId, currentShares = 0) {
  const client = requireSupabase();
  const { error } = await client.from('articles').update({ shares: currentShares + 1 }).eq('id', articleId);
  if (error) throw error;
}

export async function saveContactMessage(message) {
  const client = requireSupabase();
  const payload = {
    user_id: message.userId || null,
    name: message.name || '',
    email: message.email || '',
    subject: message.subject || '',
    message: message.message || '',
    type: message.type || 'general',
    status: 'new',
  };
  const { data, error } = await client.from('contact_messages').insert(payload).select('*').single();
  if (error) throw error;
  return data;
}

export async function listContactMessages() {
  const client = requireSupabase();
  const { data, error } = await client.from('contact_messages').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function updateContactMessage(id, updates) {
  const client = requireSupabase();
  const row = {
    ...(updates.status !== undefined ? { status: updates.status } : {}),
    ...(updates.adminNote !== undefined ? { admin_note: updates.adminNote } : {}),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await client.from('contact_messages').update(row).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function deleteContactMessage(id) {
  const client = requireSupabase();
  const { error } = await client.from('contact_messages').delete().eq('id', id);
  if (error) throw error;
}

export async function recordPageVisit(visit) {
  if (typeof fetch === 'function') {
    const response = await fetch('/.netlify/functions/track-visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(visit),
    }).catch(() => null);
    if (response?.ok || response?.status === 204) return;
  }

  const client = requireSupabase();
  const payload = {
    visitor_id: visit.visitorId,
    path: visit.path,
    title: visit.title || '',
    referrer: visit.referrer || '',
    user_agent: visit.userAgent || '',
    language: visit.language || '',
    screen: visit.screen || '',
    user_id: visit.userId || null,
    ip_address: visit.ipAddress || '',
  };
  const { error } = await client.from('page_visits').insert(payload);
  if (error) throw error;
}

export async function listPageVisits({ limit = 200 } = {}) {
  const client = requireSupabase();
  const { data, error } = await client.from('page_visits').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}
