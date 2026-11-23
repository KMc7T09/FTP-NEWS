const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite';

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(body),
  };
}

function config() {
  const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
  return {
    url: url ? (url.startsWith('http') ? url : `https://${url}`) : '',
    serviceKey: String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
    geminiKey: String(process.env.GEMINI_API_KEY || '').trim(),
    ownerEmails: String(process.env.BOOTSTRAP_ADMIN_EMAILS || process.env.VITE_BOOTSTRAP_ADMIN_EMAILS || 'kubulukhotei@gmail.com')
      .split(',').map((email) => email.trim().toLowerCase()).filter(Boolean),
  };
}

async function supabaseGet(path, token, serviceKey, url) {
  const response = await fetch(`${url}${path}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10000),
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!response.ok) throw new Error(response.status >= 500 ? 'Could not check your account right now.' : 'Your login session is invalid or expired.');
  return data;
}

async function authorize(event, settings) {
  const token = String(event.headers?.authorization || event.headers?.Authorization || '').match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return false;
  const user = await supabaseGet('/auth/v1/user', token, settings.serviceKey, settings.url);
  if (!user?.id) return false;
  const rows = await supabaseGet(`/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=email,role,status`, settings.serviceKey, settings.serviceKey, settings.url);
  const profile = Array.isArray(rows) ? rows[0] : null;
  const email = String(user.email || profile?.email || '').toLowerCase();
  return profile?.status === 'active'
    && (settings.ownerEmails.includes(email) || ['editor', 'admin', 'superadmin'].includes(profile?.role));
}

function compact(value, max) {
  return String(value || '').trim().slice(0, max);
}

function parseDraft(text) {
  const cleaned = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const result = JSON.parse(cleaned);
  const title = compact(result.title, 240);
  const excerpt = compact(result.excerpt, 1200);
  const body = compact(result.body, 18000);
  if (!title || !excerpt || !body) throw new Error('Gemini returned an incomplete draft. Please try again.');
  return { title, excerpt, body };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' });

  try {
    const settings = config();
    if (!settings.url || !settings.serviceKey) return json(503, { error: 'Server is missing Supabase function configuration.' });
    if (!settings.geminiKey) return json(503, { error: 'Gemini is not configured. Add GEMINI_API_KEY in Netlify environment variables.' });
    if (!(await authorize(event, settings))) return json(403, { error: 'Sign in with an active editor or admin account to use article AI.' });

    const input = JSON.parse(event.body || '{}');
    const brief = compact(input.brief, 3500);
    const language = ['English', 'Hindi', 'Odia', 'Bengali', 'Telugu', 'Tamil'].includes(input.language) ? input.language : 'English';
    if (brief.length < 20) return json(400, { error: 'Add at least a few sentences of topic and reporting notes.' });

    const prompt = `Create an editable news article draft in ${language} for THE FTP NEWS. Return only valid JSON with string keys title, excerpt, body.\n\nEditorial rules:\n- Use only facts explicitly present in the supplied reporting notes. Never invent names, dates, quotes, numbers, events, sources, or claims.\n- If a key fact is missing, insert a clear [VERIFY: what is missing] note in the body instead of guessing.\n- Keep the writing neutral, attributed, readable, and original. Do not copy source wording.\n- The excerpt should be concise. The body should use plain text paragraphs separated by blank lines, with no HTML or markdown.\n- A source name or URL is a research lead, not proof; do not claim you independently verified it.\n\nCurrent title suggestion: ${compact(input.title, 240) || 'Create a suitable headline'}\nProvided source name: ${compact(input.sourceName, 200) || 'Not supplied'}\nProvided source URL: ${compact(input.sourceURL, 500) || 'Not supplied'}\nReporting notes (the only factual basis):\n${brief}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent?key=${encodeURIComponent(settings.geminiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.35, maxOutputTokens: 5000, responseMimeType: 'application/json' },
      }),
      signal: AbortSignal.timeout(45000),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = String(payload?.error?.message || 'Gemini request failed.');
      return json(response.status === 429 ? 429 : 502, {
        error: response.status === 429
          ? 'Gemini quota is exhausted for this API project. Check AI Studio API quota/billing, then retry.'
          : message.slice(0, 500),
      });
    }
    const text = (payload?.candidates?.[0]?.content?.parts || []).map((part) => part.text || '').join('\n');
    return json(200, { ...parseDraft(text), model: MODEL });
  } catch (error) {
    const status = /session|login/i.test(error.message) ? 401 : 500;
    return json(status, { error: error.message || 'Article draft generation failed.' });
  }
};
