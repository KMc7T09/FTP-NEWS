const { isIP } = require('node:net');

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(body),
  };
}

function config() {
  const rawUrl = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
  return {
    url: rawUrl ? (rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`) : '',
    serviceKey: String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
    owners: String(process.env.BOOTSTRAP_ADMIN_EMAILS || process.env.VITE_BOOTSTRAP_ADMIN_EMAILS || 'kubulukhotei@gmail.com')
      .split(',').map((email) => email.trim().toLowerCase()).filter(Boolean),
  };
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function supabaseRequest(path, { method = 'GET', token = '', body } = {}) {
  const { url, serviceKey } = config();
  if (!url || !serviceKey) throw new HttpError(503, 'Server configuration is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  let response;
  try {
    response = await fetch(`${url}${path}`, {
      method,
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${token || serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(12000),
    });
  } catch (error) {
    throw new HttpError(502, `Supabase connection failed: ${error.message || 'request failed'}`);
  }
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = null; }
  if (!response.ok) {
    throw new HttpError(response.status >= 500 ? 502 : response.status, payload?.message || payload?.error || text || `Supabase request failed (${response.status}).`);
  }
  return payload;
}

async function authorize(event) {
  const token = String(event.headers?.authorization || event.headers?.Authorization || '').match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new HttpError(401, 'Sign in with an admin account first.');
  let user;
  try {
    user = await supabaseRequest('/auth/v1/user', { token });
  } catch (error) {
    if ([502, 503].includes(error.status)) throw error;
    throw new HttpError(401, 'Your session is invalid or expired. Sign in again.');
  }
  if (!user?.id) throw new HttpError(401, 'Your session is invalid or expired. Sign in again.');
  const profiles = await supabaseRequest(`/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=email,role,status`);
  const profile = Array.isArray(profiles) ? profiles[0] : null;
  const email = String(user.email || profile?.email || '').toLowerCase();
  const { owners } = config();
  if (profile?.status !== 'active' || (!owners.includes(email) && !['admin', 'superadmin'].includes(profile?.role))) {
    throw new HttpError(403, 'Only an active admin or superadmin can manage public reports.');
  }
  return { user, email };
}

function text(value, max = 20000) {
  return String(value ?? '').trim().slice(0, max);
}

function slugify(value = '') {
  return String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 160);
}

function validateUrl(value, label, required = false) {
  if (!value) {
    if (required) throw new HttpError(400, `${label} is required.`);
    return '';
  }
  let parsed;
  try { parsed = new URL(value); } catch { throw new HttpError(400, `${label} must be a valid HTTPS URL.`); }
  if (parsed.protocol !== 'https:') throw new HttpError(400, `${label} must use HTTPS.`);
  const authority = String(value).trim().match(/^https:\/\/([^/?#]*)/i)?.[1] || '';
  if (parsed.username || parsed.password || authority.includes('@')) {
    throw new HttpError(400, `${label} must not contain a username or password.`);
  }
  if (!authority) throw new HttpError(400, `${label} must be a valid HTTPS URL.`);
  const rawPort = authority.startsWith('[')
    ? authority.slice(authority.indexOf(']') + 1)
    : (authority.includes(':') ? authority.slice(authority.lastIndexOf(':')) : '');
  if (rawPort === ':') throw new HttpError(400, `${label} must use a valid numeric port when a port separator is present.`);

  const hostname = parsed.hostname;
  const ipHost = hostname.startsWith('[') && hostname.endsWith(']')
    ? hostname.slice(1, -1)
    : hostname;
  const ipVersion = isIP(ipHost);
  const rawHost = authority.startsWith('[')
    ? authority.slice(0, authority.indexOf(']') + 1)
    : authority.split(':', 1)[0];
  if (ipVersion === 4 && rawHost !== hostname) {
    throw new HttpError(400, `${label} must use canonical dotted-decimal IPv4.`);
  }
  if (!ipVersion) {
    const dnsHost = hostname.endsWith('.') ? hostname.slice(0, -1) : hostname;
    const labels = dnsHost.split('.');
    const finalLabel = labels.at(-1) || '';
    const ipv4Candidate = /^[0-9.]+$/.test(dnsHost)
      || /^(?:0x[0-9a-f]*|0[0-7]*|[0-9]+)$/i.test(finalLabel);
    if (labels.some((part) => /^xn--/i.test(part))) {
      throw new HttpError(400, `${label} must use an ASCII hostname; internationalized domains are not supported.`);
    }
    const validDns = dnsHost.length > 0 && dnsHost.length <= 253
      && labels.every((part) => part.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(part));
    if (ipv4Candidate || !validDns) throw new HttpError(400, `${label} must be a valid HTTPS URL.`);
  }
  return parsed.toString();
}

function reportRow(data, userId, current = {}) {
  const contentFields = new Set([
    'title', 'slug', 'summary', 'body', 'categoryId', 'sourceId', 'sourceURL',
    'documentURL', 'publicationDate', 'referenceYear', 'methodology', 'scopeNotes', 'limitations',
  ]);
  const contentChanged = Boolean(current.id) && Object.keys(data).some((key) => contentFields.has(key));
  const title = text(data.title ?? current.title, 240);
  if (!title) throw new HttpError(400, 'Report title is required.');
  const slug = slugify(data.slug ?? current.slug ?? title);
  if (!slug) throw new HttpError(400, 'Enter a title that can be used to make a URL slug.');
  const row = {
    title,
    slug,
    summary: text(data.summary ?? current.summary, 2000),
    body: text(data.body ?? current.body, 50000),
    category_id: data.categoryId ?? current.category_id ?? null,
    source_id: data.sourceId ?? current.source_id ?? null,
    source_url: validateUrl(text(data.sourceURL ?? current.source_url, 2000), 'Original source URL'),
    document_url: validateUrl(text(data.documentURL ?? current.document_url, 2000), 'Document URL'),
    publication_date: text(data.publicationDate ?? current.publication_date, 10) || null,
    reference_year: data.referenceYear === undefined
      ? (current.reference_year ?? null)
      : (data.referenceYear === '' || data.referenceYear === null ? null : Number(data.referenceYear)),
    methodology: text(data.methodology ?? current.methodology, 12000),
    scope_notes: text(data.scopeNotes ?? current.scope_notes, 12000),
    limitations: text(data.limitations ?? current.limitations, 12000),
    verification_status: contentChanged ? 'unverified' : (data.verificationStatus ?? current.verification_status ?? 'unverified'),
    status: contentChanged ? 'draft' : (data.status ?? current.status ?? 'draft'),
    updated_by: userId,
  };
  if (row.publication_date && !/^\d{4}-\d{2}-\d{2}$/.test(row.publication_date)) throw new HttpError(400, 'Publication date must use YYYY-MM-DD.');
  if (row.reference_year !== null && (!Number.isInteger(row.reference_year) || row.reference_year < 1000 || row.reference_year > 9999)) {
    throw new HttpError(400, 'Reference year must be a four-digit year.');
  }
  if (!['unverified', 'awaiting_verification', 'verified', 'rejected'].includes(row.verification_status)) throw new HttpError(400, 'Invalid verification state.');
  if (!['draft', 'published', 'archived'].includes(row.status)) throw new HttpError(400, 'Invalid publication status.');

  if (row.verification_status === 'verified') {
    if (!row.summary || !row.body || !row.category_id || !row.source_id || !row.source_url || !row.publication_date || !row.methodology) {
      throw new HttpError(400, 'To mark verified, add the report summary and overview, category, publisher, HTTPS source URL, publication date and methodology.');
    }
    row.verified_by = data.verificationStatus === 'verified' ? userId : (current.verified_by || userId);
    row.verified_at = data.verificationStatus === 'verified' ? new Date().toISOString() : (current.verified_at || new Date().toISOString());
  } else {
    row.verified_by = null;
    row.verified_at = null;
  }
  if (row.status === 'published') {
    if (row.verification_status !== 'verified' || !row.category_id || !row.source_id || !row.source_url || !row.publication_date) {
      throw new HttpError(400, 'Publish only after marking the complete report verified.');
    }
    row.published_at = current.published_at || new Date().toISOString();
    row.archived_at = null;
  } else {
    row.published_at = null;
    row.archived_at = row.status === 'archived' ? (current.archived_at || new Date().toISOString()) : null;
  }
  return row;
}

function categoryRow(data, userId, current = {}) {
  const name = text(data.name ?? current.name, 120);
  if (!name) throw new HttpError(400, 'Category name is required.');
  const slug = slugify(data.slug ?? current.slug ?? name);
  if (!slug) throw new HttpError(400, 'Category slug is required.');
  return {
    name,
    slug,
    description: text(data.description ?? current.description, 1000),
    is_active: data.isActive === undefined ? (current.is_active ?? true) : Boolean(data.isActive),
    updated_by: userId,
  };
}

function sourceRow(data, userId, current = {}) {
  const name = text(data.name ?? current.name, 160);
  if (!name) throw new HttpError(400, 'Publisher/source name is required.');
  return {
    name,
    website_url: validateUrl(text(data.websiteURL ?? current.website_url, 2000), 'Publisher website URL'),
    organization_type: text(data.organizationType ?? current.organization_type, 120),
    jurisdiction: text(data.jurisdiction ?? current.jurisdiction, 120),
    notes: text(data.notes ?? current.notes, 3000),
    is_active: data.isActive === undefined ? (current.is_active ?? true) : Boolean(data.isActive),
    updated_by: userId,
  };
}

async function currentRecord(table, id) {
  const rows = await supabaseRequest(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}&select=*`);
  if (!Array.isArray(rows) || !rows[0]) throw new HttpError(404, 'Record not found.');
  return rows[0];
}

async function saveRecord(resource, id, data, userId) {
  const configByResource = {
    report: { table: 'public_reports', row: reportRow },
    category: { table: 'public_report_categories', row: categoryRow },
    source: { table: 'public_report_sources', row: sourceRow },
  };
  const configForResource = configByResource[resource];
  if (!configForResource) throw new HttpError(400, 'Unknown report management resource.');
  const current = id ? await currentRecord(configForResource.table, id) : {};
  const row = configForResource.row(data || {}, userId, current);
  if (!id) row.created_by = userId;
  const path = id
    ? `/rest/v1/${configForResource.table}?id=eq.${encodeURIComponent(id)}&select=*`
    : `/rest/v1/${configForResource.table}?select=*`;
  const rows = await supabaseRequest(path, { method: id ? 'PATCH' : 'POST', body: row });
  if (!Array.isArray(rows) || !rows[0]) throw new HttpError(500, 'Database did not return the saved record.');
  return rows[0];
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});
  if (!['GET', 'POST', 'PATCH'].includes(event.httpMethod)) return json(405, { ok: false, error: 'Method not allowed.' });
  try {
    const { user } = await authorize(event);
    if (event.httpMethod === 'GET') {
      const resource = event.queryStringParameters?.resource || 'reports';
      const tables = {
        reports: 'public_reports?select=*,category:public_report_categories(id,name,slug,description,is_active),source:public_report_sources(id,name,website_url,organization_type,jurisdiction,notes,is_active)&order=updated_at.desc',
        categories: 'public_report_categories?select=*&order=name',
        sources: 'public_report_sources?select=*&order=name',
      };
      if (!tables[resource]) throw new HttpError(400, 'Unknown list resource.');
      const records = await supabaseRequest(`/rest/v1/${tables[resource]}`);
      return json(200, { ok: true, records });
    }

    let payload;
    try { payload = JSON.parse(event.body || '{}'); } catch { throw new HttpError(400, 'Request body must be valid JSON.'); }
    const resource = payload.resource;
    const id = event.httpMethod === 'PATCH' ? text(payload.id, 80) : '';
    if (event.httpMethod === 'PATCH' && !id) throw new HttpError(400, 'Record id is required.');
    const record = await saveRecord(resource, id, payload.data || {}, user.id);
    return json(200, { ok: true, record });
  } catch (error) {
    return json(error.status || 500, { ok: false, error: error.message || 'Public report manager failed.' });
  }
};
