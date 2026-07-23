function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET,PATCH,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

function normalizeSupabaseUrl(value = '') {
  const trimmed = String(value).trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
}

function getConfig() {
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
  const { url, serviceKey } = getConfig();
  if (!url || !serviceKey) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  const response = await fetch(`${url}${path}`, {
    method,
    headers: {
      apikey: serviceKey,
      Authorization: token ? `Bearer ${token}` : `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.message || data?.error || text || `Supabase request failed: ${response.status}`);
  return data;
}

async function getRequestUser(event) {
  const token = event.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('Login token missing.');
  const user = await supabaseFetch('/auth/v1/user', { token });
  if (!user?.id) throw new Error('Invalid login token.');
  return { token, user };
}

async function getProfile(id) {
  const rows = await supabaseFetch(`/rest/v1/profiles?id=eq.${encodeURIComponent(id)}&select=*`);
  return Array.isArray(rows) ? rows[0] : null;
}

function canUseAdmin(profile, user, ownerEmails) {
  const email = String(user.email || profile?.email || '').toLowerCase();
  return ownerEmails.includes(email) || ['admin', 'superadmin'].includes(profile?.role);
}

function canChangeRoles(profile, user, ownerEmails) {
  const email = String(user.email || profile?.email || '').toLowerCase();
  return ownerEmails.includes(email) || profile?.role === 'superadmin';
}

function rowFromUpdates(updates = {}) {
  return {
    ...(updates.name !== undefined ? { name: updates.name } : {}),
    ...(updates.photoURL !== undefined ? { photo_url: updates.photoURL } : {}),
    ...(updates.phone !== undefined ? { phone_number: updates.phone } : {}),
    ...(updates.whatsappOptIn !== undefined ? { whatsapp_opt_in: Boolean(updates.whatsappOptIn) } : {}),
    ...(updates.role !== undefined ? { role: updates.role } : {}),
    ...(updates.status !== undefined ? { status: updates.status } : {}),
    ...(updates.bannedReason !== undefined ? { banned_reason: updates.bannedReason } : {}),
    updated_at: new Date().toISOString(),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});

  try {
    const { ownerEmails } = getConfig();
    const { user } = await getRequestUser(event);
    const requesterProfile = await getProfile(user.id);
    if (!canUseAdmin(requesterProfile, user, ownerEmails)) {
      return json(403, { ok: false, error: 'Only admin or superadmin can manage users.' });
    }

    if (event.httpMethod === 'GET') {
      const rows = await supabaseFetch('/rest/v1/profiles?select=*&order=created_at.desc');
      const profiles = rows.map((row) => (
        ownerEmails.includes(String(row.email || '').toLowerCase())
          ? { ...row, role: 'superadmin', status: 'active' }
          : row
      ));
      return json(200, { ok: true, profiles });
    }

    if (event.httpMethod === 'PATCH') {
      const payload = JSON.parse(event.body || '{}');
      if (!payload.id) return json(400, { ok: false, error: 'User id is required.' });
      const target = await getProfile(payload.id);
      if (!target) return json(404, { ok: false, error: 'Profile not found.' });

      const updates = payload.updates || {};
      const targetEmail = String(target.email || '').toLowerCase();
      if (updates.role !== undefined && !canChangeRoles(requesterProfile, user, ownerEmails)) {
        return json(403, { ok: false, error: 'Only superadmin can change user roles.' });
      }
      if (updates.role === 'superadmin' && !ownerEmails.includes(targetEmail)) {
        return json(403, { ok: false, error: 'Superadmin is locked to the owner email only.' });
      }
      if (ownerEmails.includes(targetEmail)) {
        updates.role = 'superadmin';
        updates.status = 'active';
      }

      const rows = await supabaseFetch(`/rest/v1/profiles?id=eq.${encodeURIComponent(payload.id)}&select=*`, {
        method: 'PATCH',
        body: rowFromUpdates(updates),
      });
      return json(200, { ok: true, profile: Array.isArray(rows) ? rows[0] : rows });
    }

    return json(405, { ok: false, error: 'Method not allowed.' });
  } catch (error) {
    return json(500, { ok: false, error: error.message || 'Admin profiles failed.' });
  }
};
