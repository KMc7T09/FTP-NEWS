import { supabase, supabaseReady } from './config.js';
import { articleToRow, mapArticle, mapCategory, mapComment, mapProfile, mapPublicReport, mapPublicReportCategory, mapPublicReportSource, mapWeatherReport } from './mappers.js';

function requireSupabase() {
  if (!supabaseReady || !supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

function isUuid(value = '') {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isMissingOptionalProfileColumn(error) {
  const message = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ');
  return /phone_number|whatsapp_opt_in/i.test(message);
}

export async function getProfile(userId) {
  const client = requireSupabase();
  const { data, error } = await client.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data ? mapProfile(data) : null;
}

export async function upsertProfile(profile) {
  const client = requireSupabase();
  const id = profile.id || profile.uid;
  const baseRow = {
    id,
    name: profile.name || '',
    email: profile.email || '',
    phone_number: profile.phone || profile.phoneNumber || '',
    whatsapp_opt_in: Boolean(profile.whatsappOptIn),
    photo_url: profile.photoURL || '',
    updated_at: new Date().toISOString(),
  };
  const insertRow = {
    ...baseRow,
    role: 'user',
    status: 'active',
    banned_reason: '',
  };

  let result = await client.from('profiles').update(baseRow).eq('id', id).select('*').maybeSingle();
  if (result.error && isMissingOptionalProfileColumn(result.error)) {
    const { phone_number, whatsapp_opt_in, ...fallbackBaseRow } = baseRow;
    result = await client.from('profiles').update(fallbackBaseRow).eq('id', id).select('*').maybeSingle();
  }
  if (result.error) throw result.error;

  if (!result.error && result.data) return mapProfile(result.data);

  let createResult = await client.from('profiles').insert(insertRow).select('*').single();
  if (createResult.error && isMissingOptionalProfileColumn(createResult.error)) {
    const { phone_number, whatsapp_opt_in, ...fallbackInsertRow } = insertRow;
    createResult = await client.from('profiles').insert(fallbackInsertRow).select('*').single();
  }
  if (createResult.error) throw createResult.error;
  return mapProfile(createResult.data);
}

export async function listProfiles() {
  const client = requireSupabase();
  const functionRows = await callAdminProfilesFunction().catch(() => null);
  if (Array.isArray(functionRows)) return functionRows.map(mapProfile);

  const { data, error } = await client.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapProfile);
}

export async function updateProfileAdmin(id, updates) {
  const client = requireSupabase();
  const functionRow = await callAdminProfilesFunction({
    method: 'PATCH',
    body: { id, updates },
  }).catch(() => null);
  if (functionRow) return mapProfile(functionRow);

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

async function callAdminProfilesFunction({ method = 'GET', body = null } = {}) {
  if (typeof fetch !== 'function') return null;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;

  const response = await fetch('/.netlify/functions/admin-profiles', {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 404) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) throw new Error(payload.error || 'Admin profile request failed.');
  return payload.profiles || payload.profile || null;
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

  let { data, error } = await request;
  if (error && String(error.message).includes('odia_')) {
    const { odia_title, odia_excerpt, odia_content, ...fallbackRow } = row;
    const fallbackRequest = article.id && isUuid(article.id)
      ? client.from('articles').update(fallbackRow).eq('id', article.id).select('*').single()
      : client.from('articles').upsert(fallbackRow, { onConflict: 'slug' }).select('*').single();
    const fallback = await fallbackRequest;
    data = fallback.data;
    error = fallback.error;
  }
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

const publicReportJoin = 'id,title,slug,summary,body,category_id,source_id,source_url,document_url,publication_date,publication_year,reference_year,reference_period,methodology,scope_notes,limitations,verification_status,verified_at,published_at,updated_at,category:public_report_categories(id,name,slug,description,is_active),source:public_report_sources(id,name,website_url,organization_type,jurisdiction,notes,is_active)';

export async function listPublishedReports({ limit = 300 } = {}) {
  const client = requireSupabase();
  const { data, error } = await client.from('public_reports')
    .select(publicReportJoin)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map(mapPublicReport);
}

export async function getPublishedReportBySlug(slug) {
  const client = requireSupabase();
  const { data, error } = await client.from('public_reports')
    .select(publicReportJoin)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (error) throw error;
  return data ? mapPublicReport(data) : null;
}

export async function listPublicReportCategories({ includeInactive = false } = {}) {
  const client = requireSupabase();
  let query = client.from('public_report_categories').select('id,name,slug,description,is_active').order('name');
  if (!includeInactive) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapPublicReportCategory);
}

async function callAdminReportsFunction({ method = 'GET', resource = 'reports', id = '', data = null } = {}) {
  const client = requireSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Sign in with an admin account to manage public reports.');
  const query = new URLSearchParams({ resource });
  const response = await fetch(`/.netlify/functions/admin-reports?${query}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: data ? JSON.stringify({ resource, id, data }) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) throw new Error(payload.error || `Report manager request failed (${response.status}).`);
  return payload;
}

export async function listAdminPublicReports() {
  const result = await callAdminReportsFunction({ resource: 'reports' });
  return (result.records || []).map(mapPublicReport);
}

export async function listAdminPublicReportCategories() {
  const result = await callAdminReportsFunction({ resource: 'categories' });
  return (result.records || []).map(mapPublicReportCategory);
}

export async function listAdminPublicReportSources() {
  const result = await callAdminReportsFunction({ resource: 'sources' });
  return (result.records || []).map(mapPublicReportSource);
}

export async function saveAdminPublicReport(data, id = '') {
  const result = await callAdminReportsFunction({ method: id ? 'PATCH' : 'POST', resource: 'report', id, data });
  return mapPublicReport(result.record);
}

export async function saveAdminPublicReportCategory(data, id = '') {
  const result = await callAdminReportsFunction({ method: id ? 'PATCH' : 'POST', resource: 'category', id, data });
  return mapPublicReportCategory(result.record);
}

export async function saveAdminPublicReportSource(data, id = '') {
  const result = await callAdminReportsFunction({ method: id ? 'PATCH' : 'POST', resource: 'source', id, data });
  return mapPublicReportSource(result.record);
}

const publicDataEditionSelect = [
  'id,indicator_id,source_id,report_id,edition_label,publication_date,reference_period_start,reference_period_end',
  'source_url,document_url,methodology,scope_notes,limitations,verification_status,status,verified_at,published_at,updated_at',
  'indicator:public_data_indicators(id,slug,name,definition,unit,geography_level,direction,category:public_report_categories(id,name,slug))',
  'source:public_report_sources(id,name,website_url,jurisdiction)',
  'report:public_reports(id,title,slug)',
  'observations:public_data_observations(id,geography_code,geography_name,geography_type,value,value_text,unit,published_rank,rank_scope,is_missing,notes,source_page)',
].join(',');

export async function listPublishedPublicDataEditions() {
  const client = requireSupabase();
  const { data, error } = await client.from('public_data_editions')
    .select(publicDataEditionSelect)
    .eq('status', 'published')
    .eq('verification_status', 'verified')
    .order('publication_date', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function listAdminPublicDataEditions() {
  const client = requireSupabase();
  const { data, error } = await client.from('public_data_editions')
    .select(publicDataEditionSelect)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function listAdminPublicDataIndicators() {
  const client = requireSupabase();
  const { data, error } = await client.from('public_data_indicators')
    .select('*,category:public_report_categories(id,name,slug)')
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function createAdminPublicDataIndicator(values) {
  const client = requireSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  const userId = sessionData.session?.user?.id;
  const row = {
    name: String(values.name || '').trim(),
    slug: String(values.slug || '').trim(),
    definition: String(values.definition || '').trim(),
    unit: String(values.unit || '').trim(),
    category_id: values.categoryId || null,
    geography_level: values.geographyLevel || 'state',
    direction: values.direction || 'neutral',
    notes: String(values.notes || '').trim(),
    created_by: userId,
    updated_by: userId,
  };
  const { data, error } = await client.from('public_data_indicators').insert(row).select('*,category:public_report_categories(id,name,slug)').single();
  if (error) throw error;
  return data;
}

export async function createAdminPublicDataEdition(values) {
  const client = requireSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  const userId = sessionData.session?.user?.id;
  const row = {
    indicator_id: values.indicatorId,
    source_id: values.sourceId,
    report_id: values.reportId || null,
    edition_label: String(values.editionLabel || '').trim(),
    publication_date: values.publicationDate || null,
    reference_period_start: values.referencePeriodStart || null,
    reference_period_end: values.referencePeriodEnd || null,
    source_url: String(values.sourceURL || '').trim(),
    document_url: String(values.documentURL || '').trim(),
    methodology: String(values.methodology || '').trim(),
    scope_notes: String(values.scopeNotes || '').trim(),
    limitations: String(values.limitations || '').trim(),
    created_by: userId,
    updated_by: userId,
  };
  const { data, error } = await client.from('public_data_editions').insert(row).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateAdminPublicDataEdition(id, updates) {
  const client = requireSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  const userId = sessionData.session?.user?.id;
  const allowed = ['verification_status', 'status'];
  const row = Object.fromEntries(allowed.filter((key) => updates[key] !== undefined).map((key) => [key, updates[key]]));
  row.updated_by = userId;
  if (row.verification_status === 'verified') {
    row.verified_by = userId;
    row.verified_at = new Date().toISOString();
  }
  const { data, error } = await client.from('public_data_editions').update(row).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function importAdminPublicDataObservations(editionId, rows) {
  const client = requireSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session?.user?.id) throw new Error('Sign in as an administrator before importing observations.');
  const { data: edition, error: editionError } = await client.from('public_data_editions')
    .select('indicator:public_data_indicators(geography_level)')
    .eq('id', editionId)
    .single();
  if (editionError) throw editionError;
  const geographyLevel = edition.indicator?.geography_level;
  const payload = rows.map((row) => ({
    edition_id: editionId,
    geography_code: String(row.geography_code || '').trim(),
    geography_name: String(row.geography_name || '').trim(),
    geography_type: String(row.geography_type || '').trim().toLowerCase(),
    value: row.value === '' || row.value == null ? null : Number(row.value),
    value_text: String(row.value_text || '').trim() || null,
    unit: String(row.unit || '').trim(),
    published_rank: row.published_rank === '' || row.published_rank == null ? null : Number(row.published_rank),
    rank_scope: String(row.rank_scope || '').trim(),
    is_missing: row.is_missing === true || String(row.is_missing).toLowerCase() === 'true',
    notes: String(row.notes || '').trim(),
    source_page: String(row.source_page || '').trim(),
  }));
  if (!payload.length) throw new Error('The import file contains no data rows.');
  if (payload.some((row) => !row.geography_code || !row.geography_name || !['country', 'state', 'ut', 'district'].includes(row.geography_type))) {
    throw new Error('Every row needs geography_code, geography_name, and geography_type (country/state/ut/district).');
  }
  const validGeography = (type) => geographyLevel === 'mixed'
    || (geographyLevel === 'state' && ['state', 'ut'].includes(type))
    || geographyLevel === type;
  if (payload.some((row) => !validGeography(row.geography_type))) {
    throw new Error(`This indicator is configured for ${geographyLevel} data; the CSV contains a different geography type.`);
  }
  if (payload.some((row) => row.value !== null && !Number.isFinite(row.value))) throw new Error('Numeric values must be valid numbers; leave missing values blank and mark is_missing=true.');
  if (payload.some((row) => row.published_rank !== null && (!Number.isInteger(row.published_rank) || row.published_rank < 1))) throw new Error('Published rank must be a positive whole number.');
  const seen = new Set();
  if (payload.some((row) => seen.has(row.geography_code) || !seen.add(row.geography_code))) throw new Error('Duplicate geography_code found in this import.');
  const { data, error } = await client.from('public_data_observations')
    .upsert(payload, { onConflict: 'edition_id,geography_code' })
    .select('id');
  if (error) throw error;
  return data?.length || payload.length;
}

export async function previewOfficialPublicDataImport(payload) {
  const client = requireSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error('Sign in with an administrator account before fetching official data.');
  const response = await fetch('/.netlify/functions/admin-public-data-import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
  let result;
  try { result = await response.json(); } catch { throw new Error(`Official data API returned an unreadable response (${response.status}).`); }
  if (!response.ok || !result?.ok) throw new Error(result?.error || `Official data preview failed (${response.status}).`);
  return result;
}

const representativeSelect = '*,source:public_report_sources(id,name,website_url)';

export async function listPublishedPublicRepresentatives() {
  const client = requireSupabase();
  const { data, error } = await client.from('public_representatives').select(representativeSelect)
    .eq('status', 'published').eq('verification_status', 'verified').order('full_name');
  if (error) throw error;
  return data || [];
}

export async function listAdminPublicRepresentatives() {
  const client = requireSupabase();
  const { data, error } = await client.from('public_representatives').select(representativeSelect)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveAdminPublicRepresentative(values, id = '') {
  const client = requireSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  const userId = sessionData.session?.user?.id;
  if (!userId) throw new Error('Sign in with an authorized admin account.');
  const row = {
    slug: String(values.slug || '').trim(),
    full_name: String(values.full_name || '').trim(),
    office_title: String(values.office_title || '').trim(),
    constituency: String(values.constituency || '').trim(),
    state_or_ut: String(values.state_or_ut || '').trim(),
    party: String(values.party || '').trim(),
    party_as_of: values.party_as_of || null,
    term_start: values.term_start || null,
    term_end: values.term_end || null,
    summary: String(values.summary || '').trim(),
    election_results: String(values.election_results || '').trim(),
    asset_disclosure: String(values.asset_disclosure || '').trim(),
    attendance_participation: String(values.attendance_participation || '').trim(),
    documented_public_work: String(values.documented_public_work || '').trim(),
    source_id: values.source_id,
    source_url: String(values.source_url || '').trim(),
    updated_by: userId,
  };
  if (!row.full_name || !row.slug || !row.source_id || !row.source_url) throw new Error('Name, slug, publisher and official source URL are required.');
  const query = id
    ? client.from('public_representatives').update(row).eq('id', id)
    : client.from('public_representatives').insert({ ...row, created_by: userId });
  const { data, error } = await query.select(representativeSelect).single();
  if (error) throw error;
  return data;
}

export async function updateAdminPublicRepresentativeStatus(id, updates) {
  const client = requireSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  const userId = sessionData.session?.user?.id;
  if (!userId) throw new Error('Sign in with an authorized admin account.');
  const row = { updated_by: userId };
  if (updates.status) row.status = updates.status;
  if (updates.verification_status) {
    row.verification_status = updates.verification_status;
    row.verified_by = updates.verification_status === 'verified' ? userId : null;
    row.verified_at = updates.verification_status === 'verified' ? new Date().toISOString() : null;
  }
  const { data, error } = await client.from('public_representatives').update(row).eq('id', id).select(representativeSelect).single();
  if (error) throw error;
  return data;
}

export async function listComments({ approvedOnly = false, articleId = '', limit = 200 } = {}) {
  const client = requireSupabase();
  let query = client.from('comments').select('*').order('created_at', { ascending: false });
  if (approvedOnly) query = query.eq('status', 'approved');
  if (articleId) query = query.eq('article_id', articleId);
  if (limit) query = query.limit(limit);
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
  const functionSettings = await callAdminSettingsFunction({ method: 'GET' }).catch(() => null);
  if (functionSettings) return functionSettings;

  const { data, error } = await client.from('settings').select('*').eq('id', 'site').maybeSingle();
  if (error) throw error;
  return data?.data || null;
}

export async function saveSettings(settings) {
  const client = requireSupabase();
  const functionSettings = await callAdminSettingsFunction({
    method: 'PUT',
    body: { settings },
  }).catch(() => null);
  if (functionSettings) return functionSettings;

  const row = { id: 'site', data: settings, updated_at: new Date().toISOString() };
  let result = await client.from('settings').update(row).eq('id', 'site').select('*').maybeSingle();
  if (!result.error && !result.data) {
    result = await client.from('settings').insert(row).select('*').maybeSingle();
  }
  if (result.error) throw result.error;
  if (!result.data) throw new Error('Settings save blocked. Check Supabase admin policy and your profile role.');
  return result.data.data;
}

async function callAdminSettingsFunction({ method = 'GET', body = null } = {}) {
  if (typeof fetch !== 'function') return null;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch('/.netlify/functions/admin-settings', {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 404) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) throw new Error(payload.error || 'Settings request failed.');
  return payload.settings || null;
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

export async function listArticleStats(articleIds = []) {
  const client = requireSupabase();
  const ids = [...new Set(articleIds.filter(Boolean))];
  if (!ids.length) return {};

  const [likesResult, commentsResult] = await Promise.all([
    client.from('likes').select('article_id').in('article_id', ids),
    client.from('comments').select('article_id').in('article_id', ids).eq('status', 'approved'),
  ]);
  if (likesResult.error) throw likesResult.error;
  if (commentsResult.error) throw commentsResult.error;

  const stats = Object.fromEntries(ids.map((id) => [id, { likes: 0, comments: 0 }]));
  (likesResult.data || []).forEach((row) => {
    if (stats[row.article_id]) stats[row.article_id].likes += 1;
  });
  (commentsResult.data || []).forEach((row) => {
    if (stats[row.article_id]) stats[row.article_id].comments += 1;
  });
  return stats;
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

export async function listWeatherReports({ reportDate = '', sinceDate = '', limit = 100 } = {}) {
  const client = requireSupabase();
  const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 10000));
  const pageSize = 1000;
  const rows = [];

  for (let offset = 0; offset < safeLimit; offset += pageSize) {
    let query = client
      .from('daily_weather_reports')
      .select('*')
      .order('report_date', { ascending: false })
      .order('city', { ascending: true })
      .range(offset, Math.min(offset + pageSize, safeLimit) - 1);
    if (reportDate) query = query.eq('report_date', reportDate);
    else if (sinceDate) query = query.gte('report_date', sinceDate);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }

  return rows.map(mapWeatherReport);
}
