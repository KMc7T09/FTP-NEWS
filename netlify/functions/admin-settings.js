function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

function normalizeSupabaseUrl(value = '') {
  const trimmed = String(value).trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
}

function config() {
  return {
    url: normalizeSupabaseUrl(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
    serviceKey: String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
    ownerEmails: String(process.env.BOOTSTRAP_ADMIN_EMAILS || process.env.VITE_BOOTSTRAP_ADMIN_EMAILS || 'kubulukhotei@gmail.com')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  };
}

async function supabaseFetch(path, { method = 'GET', body, token } = {}) {
  const { url, serviceKey } = config();
  if (!url || !serviceKey) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  const response = await fetch(`${url}${path}`, {
    method,
    headers: {
      apikey: serviceKey,
      Authorization: token ? `Bearer ${token}` : `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.message || data?.error || text || `Supabase request failed: ${response.status}`);
  return data;
}

async function requestUser(event) {
  const token = event.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('Login token missing.');
  const user = await supabaseFetch('/auth/v1/user', { token });
  return { token, user };
}

async function profileForUser(id) {
  const rows = await supabaseFetch(`/rest/v1/profiles?id=eq.${encodeURIComponent(id)}&select=*`);
  return Array.isArray(rows) ? rows[0] : null;
}

async function assertAdmin(event) {
  const { ownerEmails } = config();
  const { user } = await requestUser(event);
  const profile = await profileForUser(user.id);
  const email = String(user.email || profile?.email || '').toLowerCase();
  if (!ownerEmails.includes(email) && !['admin', 'superadmin'].includes(profile?.role)) {
    throw new Error('Only admin or superadmin can update settings.');
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});

  try {
    if (event.httpMethod === 'GET') {
      const rows = await supabaseFetch('/rest/v1/settings?id=eq.site&select=data');
      return json(200, { ok: true, settings: rows?.[0]?.data || null });
    }

    if (event.httpMethod === 'PUT') {
      await assertAdmin(event);
      const payload = JSON.parse(event.body || '{}');
      const rows = await supabaseFetch('/rest/v1/settings?on_conflict=id', {
        method: 'POST',
        body: [{ id: 'site', data: payload.settings || {}, updated_at: new Date().toISOString() }],
      });
      return json(200, { ok: true, settings: rows?.[0]?.data || payload.settings || {} });
    }

    return json(405, { ok: false, error: 'Method not allowed.' });
  } catch (error) {
    return json(500, { ok: false, error: error.message || 'Settings function failed.' });
  }
};
