function json(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) };
}

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }

function config() {
  const rawUrl = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
  return {
    supabaseUrl: rawUrl ? (rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`) : '',
    serviceKey: String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
    dataGovKey: String(process.env.DATA_GOV_IN_API_KEY || '').trim(),
    bootstrapAdmins: String(process.env.BOOTSTRAP_ADMIN_EMAILS || process.env.VITE_BOOTSTRAP_ADMIN_EMAILS || 'kubulukhotei@gmail.com')
      .split(',').map((email) => email.trim().toLowerCase()).filter(Boolean),
  };
}

async function supabase(path, token) {
  const { supabaseUrl, serviceKey } = config();
  if (!supabaseUrl || !serviceKey) throw new HttpError(503, 'Server admin authorization is not configured.');
  const response = await fetch(`${supabaseUrl}${path}`, { headers: { apikey: serviceKey, Authorization: `Bearer ${token || serviceKey}` }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new HttpError(response.status === 401 ? 401 : 502, 'Could not validate the signed-in account.');
  return response.json();
}

async function authorize(event) {
  const token = String(event.headers?.authorization || event.headers?.Authorization || '').match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new HttpError(401, 'Sign in with an administrator account first.');
  const user = await supabase('/auth/v1/user', token);
  if (!user?.id) throw new HttpError(401, 'Your session is invalid or expired.');
  const profiles = await supabase(`/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=email,role,status`);
  const profile = Array.isArray(profiles) ? profiles[0] : null;
  const email = String(user.email || profile?.email || '').toLowerCase();
  if (profile?.status !== 'active' || (!config().bootstrapAdmins.includes(email) && !['admin', 'superadmin'].includes(profile?.role))) {
    throw new HttpError(403, 'Only an active admin can import official representative records.');
  }
}

function fieldName(value, label, required = false) {
  const name = String(value || '').trim();
  if (!name && !required) return '';
  if (!name || name.length > 128 || /[\u0000-\u001f]/.test(name)) throw new HttpError(400, `${label} must be a valid source field name.`);
  return name;
}

function sourceDate(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  let match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    const local = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (local) match = [raw, local[3], local[2].padStart(2, '0'), local[1].padStart(2, '0')];
  }
  if (!match) return null;
  const date = `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date ? null : date;
}

function slugify(text) {
  return String(text).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 150);
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'Method not allowed.' });
  try {
    await authorize(event);
    const { dataGovKey } = config();
    if (!dataGovKey) throw new HttpError(503, 'Set DATA_GOV_IN_API_KEY in Netlify Function environment variables first.');
    let payload;
    try { payload = JSON.parse(event.body || '{}'); } catch { throw new HttpError(400, 'Request body must be valid JSON.'); }
    const resourceId = String(payload.resourceId || '').trim();
    const sourceId = String(payload.sourceId || '').trim();
    const officeTitle = String(payload.officeTitle || '').trim().slice(0, 120);
    const inspectOnly = payload.inspectOnly === true;
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(resourceId)) throw new HttpError(400, 'Enter the resource ID from the official data.gov.in page.');
    if (!inspectOnly && !/^[0-9a-f-]{36}$/i.test(sourceId)) throw new HttpError(400, 'Choose a registered official publisher.');
    if (!inspectOnly && !officeTitle) throw new HttpError(400, 'Enter the elected office represented by this dataset.');
    const url = new URL(`https://api.data.gov.in/resource/${encodeURIComponent(resourceId)}`);
    url.searchParams.set('api-key', dataGovKey);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1000');
    const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'THE-FTP-NEWS-Representatives/1.0' }, signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new HttpError(502, `data.gov.in returned HTTP ${response.status}. Check the resource ID and API access.`);
    let data;
    try { data = await response.json(); } catch { throw new HttpError(502, 'data.gov.in returned invalid JSON.'); }
    const records = Array.isArray(data?.records) ? data.records : [];
    if (!records.length) throw new HttpError(404, 'This resource returned no records. It may not expose an API or may require access.');
    if (records.length > 1000) throw new HttpError(413, 'This resource is too large for one import. Use a filtered official resource or split it into editions.');
    const sourceUrl = `https://data.gov.in/resource/${encodeURIComponent(resourceId)}`;
    const availableFields = Object.keys(records[0] || {});
    if (inspectOnly) return json(200, { ok: true, sourceUrl, count: records.length, availableFields });
    const mapping = payload.mapping || {};
    const fields = {
      name: fieldName(mapping.name, 'Name field', true),
      area: fieldName(mapping.area, 'Area field', true),
      state: fieldName(mapping.state, 'State field'),
      party: fieldName(mapping.party, 'Party field'),
      partyAsOf: fieldName(mapping.partyAsOf, 'Party date field'),
      termStart: fieldName(mapping.termStart, 'Term-start field'),
      termEnd: fieldName(mapping.termEnd, 'Term-end field'),
      summary: fieldName(mapping.summary, 'Summary field'),
      election: fieldName(mapping.election, 'Election record field'),
      work: fieldName(mapping.work, 'Public-work field'),
      elected: fieldName(mapping.elected, 'Elected/winner field'),
    };
    const electedValue = String(mapping.electedValue || '').trim().slice(0, 120);
    const rowsAreElected = payload.rowsAreElected === true;
    if (Boolean(fields.elected) !== Boolean(electedValue)) throw new HttpError(400, 'Choose both the winner field and its exact elected value, or confirm that every row already represents an elected office-holder.');
    if (!fields.elected && !rowsAreElected) throw new HttpError(400, 'For candidate-result data, map a winner/elected field and exact value. Only confirm all rows are elected if the source explicitly lists office-holders, not all candidates.');
    const selectedRecords = fields.elected
      ? records.filter((record) => String(record?.[fields.elected] ?? '').trim().toLocaleLowerCase() === electedValue.toLocaleLowerCase())
      : records;
    if (!selectedRecords.length) throw new HttpError(404, 'No rows matched the elected/winner field and value. Check the field and exact value in the preview.');
    const rows = selectedRecords.map((record, index) => {
      const name = String(record?.[fields.name] ?? '').trim().slice(0, 180);
      const area = String(record?.[fields.area] ?? '').trim().slice(0, 180);
      if (!name || !area) throw new HttpError(400, `Record ${index + 1} is missing the mapped name or area; fix the mapping before importing.`);
      const optional = (field, max = 5000) => field ? String(record?.[field] ?? '').trim().slice(0, max) : '';
      const state = optional(fields.state);
      const uniqueLabel = [name, officeTitle, area, state].filter(Boolean).join(' ');
      const slug = slugify(uniqueLabel);
      if (!slug) throw new HttpError(400, `Record ${index + 1} cannot be converted to a safe profile slug.`);
      const row = {
        slug, full_name: name, office_title: officeTitle, constituency: area,
        source_id: sourceId, source_url: sourceUrl,
      };
      const optionalTextFields = {
        state_or_ut: [fields.state, state], party: [fields.party, optional(fields.party, 180)],
        summary: [fields.summary, optional(fields.summary)], election_results: [fields.election, optional(fields.election)],
        documented_public_work: [fields.work, optional(fields.work)],
      };
      for (const [key, [mappedField, value]] of Object.entries(optionalTextFields)) if (mappedField && value) row[key] = value;
      for (const [key, mappedField] of [['party_as_of', fields.partyAsOf], ['term_start', fields.termStart], ['term_end', fields.termEnd]]) {
        const date = mappedField ? sourceDate(record?.[mappedField]) : null;
        if (date) row[key] = date;
      }
      return row;
    });
    const slugs = new Set();
    if (rows.some((row) => slugs.has(row.slug) || !slugs.add(row.slug))) throw new HttpError(400, 'The source has duplicate name/area combinations. Resolve duplicates before importing.');
    return json(200, { ok: true, provider: 'Open Government Data Platform India', sourceUrl, sourceCount: records.length, count: rows.length, electedOnly: Boolean(fields.elected) || rowsAreElected, rows });
  } catch (error) {
    return json(error.status || 500, { ok: false, error: error.message || 'Representative import preview failed.' });
  }
};
