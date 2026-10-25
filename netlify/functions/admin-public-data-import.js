function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(body),
  };
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

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
  const response = await fetch(`${supabaseUrl}${path}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${token || serviceKey}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new HttpError(response.status === 401 ? 401 : 502, 'Could not validate the signed-in account.');
  return response.json();
}

async function authorize(event) {
  const token = String(event.headers?.authorization || event.headers?.Authorization || '').match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new HttpError(401, 'Sign in with an administrator account first.');
  const user = await supabase('/auth/v1/user', token);
  if (!user?.id) throw new HttpError(401, 'Your session is invalid or expired. Sign in again.');
  const profiles = await supabase(`/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=email,role,status`);
  const profile = Array.isArray(profiles) ? profiles[0] : null;
  const email = String(user.email || profile?.email || '').toLowerCase();
  const allowed = profile?.status === 'active'
    && (config().bootstrapAdmins.includes(email) || ['admin', 'superadmin'].includes(profile?.role));
  if (!allowed) throw new HttpError(403, 'Only an active admin or superadmin can import official data.');
}

function safeText(value, label, max = 120) {
  const result = String(value || '').trim();
  if (!result || result.length > max) throw new HttpError(400, `${label} is required and must be at most ${max} characters.`);
  return result;
}

async function fetchJson(url, label) {
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'THE-FTP-NEWS-Public-Data/1.0' },
    signal: AbortSignal.timeout(18000),
  });
  if (!response.ok) throw new HttpError(502, `${label} returned HTTP ${response.status}. Check the API identifier, access and publisher availability.`);
  try { return await response.json(); } catch { throw new HttpError(502, `${label} did not return valid JSON.`); }
}

async function worldBank(payload) {
  const indicator = safeText(payload.indicatorCode, 'World Bank indicator code', 80);
  if (!/^[A-Za-z0-9._-]+$/.test(indicator)) throw new HttpError(400, 'World Bank indicator code contains unsupported characters.');
  const year = safeText(payload.year, 'Data year', 4);
  if (!/^\d{4}$/.test(year) || Number(year) < 1960 || Number(year) > new Date().getFullYear() + 1) {
    throw new HttpError(400, 'Enter a valid four-digit World Bank reference year.');
  }
  const url = new URL(`https://api.worldbank.org/v2/country/all/indicator/${encodeURIComponent(indicator)}`);
  url.searchParams.set('format', 'json');
  url.searchParams.set('date', year);
  url.searchParams.set('per_page', '5000');
  const result = await fetchJson(url, 'World Bank Indicators API');
  const observations = Array.isArray(result?.[1]) ? result[1] : [];
  const rows = observations
    .filter((item) => item?.country?.id && item?.country?.value && item?.countryiso3code && item?.region?.id !== 'NA')
    .map((item) => ({
      geography_code: item.countryiso3code,
      geography_name: item.country.value,
      geography_type: 'country',
      value: item.value == null ? null : Number(item.value),
      value_text: null,
      unit: '',
      published_rank: null,
      rank_scope: '',
      is_missing: item.value == null,
      notes: item.value == null ? 'No observation published for this country and year.' : '',
      source_page: url.toString(),
    }));
  if (!rows.length) throw new HttpError(404, 'The API returned no country observations for this indicator and year.');
  return { provider: 'World Bank Indicators API', sourceUrl: url.toString(), count: rows.length, rows };
}

async function dataGovIn(payload) {
  const { dataGovKey } = config();
  if (!dataGovKey) throw new HttpError(503, 'Set DATA_GOV_IN_API_KEY in Netlify Function environment variables before using data.gov.in.');
  const resourceId = safeText(payload.resourceId, 'data.gov.in resource ID', 128);
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(resourceId)) throw new HttpError(400, 'The data.gov.in resource ID contains unsupported characters.');
  const fieldNames = ['codeField', 'nameField', 'valueField'];
  const fields = Object.fromEntries(fieldNames.map((key) => [key, safeText(payload.mapping?.[key], key.replace('Field', ' field'), 128)]));
  const type = safeText(payload.geographyType, 'Geography type', 12).toLowerCase();
  if (!['country', 'state', 'ut', 'district'].includes(type)) throw new HttpError(400, 'Choose country, state, UT or district geography.');
  const url = new URL(`https://api.data.gov.in/resource/${encodeURIComponent(resourceId)}`);
  url.searchParams.set('api-key', dataGovKey);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1000');
  const apiResult = await fetchJson(url, 'data.gov.in API');
  const records = Array.isArray(apiResult?.records) ? apiResult.records : [];
  if (!records.length) throw new HttpError(404, 'data.gov.in returned no records. Confirm the resource ID and API access.');
  const optional = ['unitField', 'rankField'];
  for (const key of optional) {
    if (payload.mapping?.[key]) fields[key] = safeText(payload.mapping[key], key.replace('Field', ' field'), 128);
  }
  const rows = records.map((item, index) => {
    const code = String(item?.[fields.codeField] ?? '').trim();
    const name = String(item?.[fields.nameField] ?? '').trim();
    const rawValue = String(item?.[fields.valueField] ?? '').trim();
    const numeric = rawValue === '' ? null : Number(rawValue.replace(/,/g, ''));
    const rankRaw = fields.rankField ? String(item?.[fields.rankField] ?? '').trim() : '';
    const rank = rankRaw ? Number(rankRaw) : null;
    if (!code || !name) throw new HttpError(400, `data.gov.in row ${index + 1} is missing its mapped code or name field.`);
    if (numeric !== null && !Number.isFinite(numeric)) throw new HttpError(400, `data.gov.in row ${index + 1} has a non-numeric value. Use CSV for this dataset or map a numeric field.`);
    if (rank !== null && (!Number.isInteger(rank) || rank < 1)) throw new HttpError(400, `data.gov.in row ${index + 1} has an invalid rank.`);
    return {
      geography_code: code,
      geography_name: name,
      geography_type: type,
      value: numeric,
      value_text: null,
      unit: fields.unitField ? String(item?.[fields.unitField] ?? '').trim() : '',
      published_rank: rank,
      rank_scope: rank === null ? '' : 'Publisher-provided rank; scope requires editorial confirmation.',
      is_missing: numeric === null,
      notes: numeric === null ? 'Source row did not provide a numeric value.' : '',
      source_page: `https://data.gov.in/resource/${encodeURIComponent(resourceId)}`,
    };
  });
  const unique = new Set();
  if (rows.some((row) => unique.has(row.geography_code) || !unique.add(row.geography_code))) {
    throw new HttpError(400, 'The selected resource contains repeated geography codes. Filter it to one observation per geography before import.');
  }
  const safeEndpoint = new URL(url);
  safeEndpoint.searchParams.delete('api-key');
  return { provider: 'Open Government Data Platform India (data.gov.in)', sourceUrl: safeEndpoint.toString(), count: rows.length, rows };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'Method not allowed.' });
  try {
    await authorize(event);
    let payload;
    try { payload = JSON.parse(event.body || '{}'); } catch { throw new HttpError(400, 'Request body must be valid JSON.'); }
    const result = payload.provider === 'world-bank'
      ? await worldBank(payload)
      : payload.provider === 'data-gov-in'
        ? await dataGovIn(payload)
        : (() => { throw new HttpError(400, 'Choose a supported official data provider.'); })();
    return json(200, { ok: true, ...result });
  } catch (error) {
    return json(error.status || 500, { ok: false, error: error.message || 'Official data import preview failed.' });
  }
};
