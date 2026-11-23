const MODEL = process.env.ARTICLE_WRITER_MODEL || 'gemini-3.5-flash-lite';

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

async function fetchGeminiWithRetry(url, options) {
  let response;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    response = await fetch(url, options);
    if (response.status !== 503 || attempt === 1) return response;
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
  return response;
}

function parseDraft(text, categories) {
  const cleaned = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const result = JSON.parse(cleaned);
  const title = compact(result.title, 240);
  const excerpt = compact(result.excerpt, 1200);
  const body = compact(result.body, 18000);
  const odiaTitle = compact(result.odiaTitle, 300);
  const odiaExcerpt = compact(result.odiaExcerpt, 1200);
  const odiaBody = compact(result.odiaBody, 18000);
  const tags = Array.isArray(result.tags) ? [...new Set(result.tags.map((tag) => compact(tag, 40)).filter(Boolean))].slice(0, 12) : [];
  const category = categories.find((item) => String(item.name).toLowerCase() === compact(result.category, 120).toLowerCase());
  if (!title || !excerpt || !body || !odiaTitle || !odiaExcerpt || !odiaBody) {
    throw new Error('Gemini returned an incomplete draft. Please try again.');
  }
  return {
    title, excerpt, body, odiaTitle, odiaExcerpt, odiaBody, tags,
    categoryName: category?.name || '',
    categorySlug: category?.slug || '',
    metaTitle: compact(result.metaTitle, 240) || title,
    metaDescription: compact(result.metaDescription, 320) || excerpt,
  };
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
    const categories = Array.isArray(input.categories)
      ? input.categories.slice(0, 60).map((item) => ({ name: compact(item?.name, 120), slug: compact(item?.slug, 140) })).filter((item) => item.name && item.slug)
      : [];
    if (brief.length < 20) return json(400, { error: 'Add at least a few sentences of topic and reporting notes.' });

    const prompt = `Create a complete editable news article draft for THE FTP NEWS. Write title, excerpt and body in ${language}; also provide a faithful Odia version in odiaTitle, odiaExcerpt and odiaBody. Return only valid JSON with string keys title, excerpt, body, odiaTitle, odiaExcerpt, odiaBody, category, metaTitle, metaDescription, and a string-array tags.\n\nEditorial rules:\n- Use only facts explicitly present in the supplied reporting notes. Never invent names, dates, quotes, numbers, events, sources, URLs, author names, or claims.\n- If a key fact is missing, insert a clear [VERIFY: what is missing] note in the body and Odia body instead of guessing.\n- Keep the writing neutral, attributed, readable, and original. Do not copy source wording.\n- The excerpt and SEO description should be concise. Body fields must be plain text paragraphs separated by blank lines, with no HTML or markdown.\n- Choose category exactly from this available list, or return an empty string if none fits: ${JSON.stringify(categories.map((item) => item.name))}\n- Generate up to 8 concise relevant tags from the supplied facts.\n- A source name or URL is a research lead, not proof; do not claim you independently verified it.\n- Return only valid JSON matching the requested fields.\n\nCurrent title suggestion: ${compact(input.title, 240) || 'Create a suitable headline'}\nProvided source name: ${compact(input.sourceName, 200) || 'Not supplied'}\nProvided source URL: ${compact(input.sourceURL, 500) || 'Not supplied'}\nReporting notes (the only factual basis):\n${brief}`;

    const response = await fetchGeminiWithRetry('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': settings.geminiKey },
      body: JSON.stringify({
        model: MODEL,
        input: prompt,
        store: false,
        generation_config: { temperature: 0.35, max_output_tokens: 6500 },
        response_format: {
          type: 'text',
          mime_type: 'application/json',
          schema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              excerpt: { type: 'string' },
              body: { type: 'string' },
              odiaTitle: { type: 'string' },
              odiaExcerpt: { type: 'string' },
              odiaBody: { type: 'string' },
              category: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
              metaTitle: { type: 'string' },
              metaDescription: { type: 'string' },
            },
            required: ['title', 'excerpt', 'body', 'odiaTitle', 'odiaExcerpt', 'odiaBody', 'category', 'tags', 'metaTitle', 'metaDescription'],
          },
        },
      }),
      signal: AbortSignal.timeout(45000),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = String(payload?.error?.message || payload?.message || 'Gemini request failed.');
      if (response.status === 503) {
        return json(503, { error: 'Gemini is temporarily overloaded. I retried once; please try again in a few minutes.' });
      }
      return json(response.status === 429 ? 429 : 502, {
        error: response.status === 429
          ? 'Gemini quota is exhausted for this API project. Check AI Studio API quota/billing, then retry.'
          : message.slice(0, 500),
      });
    }
    const text = payload?.output_text
      || (payload?.steps || [])
        .filter((step) => step.type === 'model_output')
        .flatMap((step) => step.content || [])
        .map((part) => part.text || '')
        .join('\n');
    return json(200, { ...parseDraft(text, categories), model: MODEL });
  } catch (error) {
    const status = /session|login/i.test(error.message) ? 401 : 500;
    return json(status, { error: error.message || 'Article draft generation failed.' });
  }
};
