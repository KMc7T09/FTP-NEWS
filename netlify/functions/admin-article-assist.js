const MODEL = process.env.ARTICLE_WRITER_MODEL || 'gemini-3.5-flash-lite';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const CONFIGURED_FALLBACK_MODEL = process.env.ARTICLE_WRITER_FALLBACK_MODEL || '';
const OPENROUTER_MODEL = !CONFIGURED_FALLBACK_MODEL || CONFIGURED_FALLBACK_MODEL === 'openrouter/free'
  ? 'google/gemma-4-31b-it:free'
  : CONFIGURED_FALLBACK_MODEL;
const REQUEST_BUDGET_MS = 18000;

function requestSignal(deadline, maxMs) {
  const remaining = deadline - Date.now() - 500;
  if (remaining <= 0) throw new Error('Article AI timed out before a provider could respond. Please retry.');
  return AbortSignal.timeout(Math.min(maxMs, remaining));
}

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

async function supabaseGet(path, token, serviceKey, url, deadline) {
  const response = await fetch(`${url}${path}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${token}` },
    signal: requestSignal(deadline, 2500),
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!response.ok) throw new Error(response.status >= 500 ? 'Could not check your account right now.' : 'Your login session is invalid or expired.');
  return data;
}

async function authorize(event, settings, deadline) {
  const token = String(event.headers?.authorization || event.headers?.Authorization || '').match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return false;
  const user = await supabaseGet('/auth/v1/user', token, settings.serviceKey, settings.url, deadline);
  if (!user?.id) return false;
  const rows = await supabaseGet(`/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=email,role,status`, settings.serviceKey, settings.serviceKey, settings.url, deadline);
  const profile = Array.isArray(rows) ? rows[0] : null;
  const email = String(user.email || profile?.email || '').toLowerCase();
  return profile?.status === 'active'
    && (settings.ownerEmails.includes(email) || ['editor', 'admin', 'superadmin'].includes(profile?.role));
}

function compact(value, max) {
  return String(value || '').trim().slice(0, max);
}

function errorMessage(value, fallback = 'Provider returned an unspecified error.') {
  if (typeof value === 'string') return compact(value, 260) || fallback;
  if (value && typeof value === 'object') {
    return compact(value.message || value.error?.message || value.code || value.type, 260) || fallback;
  }
  return fallback;
}

async function fetchGeminiWithRetry(url, options, deadline) {
  let response;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    response = await fetch(url, { ...options, signal: requestSignal(deadline, 11500) });
    if (response.status !== 503 || attempt === 1 || deadline - Date.now() < 5500) return response;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return response;
}

async function generateWithOpenRouter(prompt, categories, deadline) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://the-ftp-news.netlify.app',
        'X-OpenRouter-Title': 'FTP News Article Writing Assistant',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.35,
        max_tokens: 6500,
        stream: false,
      }),
      signal: requestSignal(deadline, 9000),
    });
    const payload = await response.json().catch(() => ({}));
    if (payload?.error) {
      const error = new Error(errorMessage(payload.error, 'OpenRouter returned an API error.'));
      error.status = Number(payload.error.status) || response.status;
      throw error;
    }
    if (!response.ok) {
      const error = new Error(errorMessage(payload?.message || payload?.error, `OpenRouter rejected the request (HTTP ${response.status}).`));
      error.status = response.status;
      throw error;
    }
    const choice = payload?.choices?.[0];
    if (choice?.error || choice?.finish_reason === 'error') {
      const error = new Error(errorMessage(choice.error, 'OpenRouter provider failed while generating the response.'));
      error.status = Number(choice.error?.code) || 502;
      throw error;
    }
    const content = choice?.message?.content;
    const text = typeof content === 'string'
      ? content
      : Array.isArray(content)
        ? content.map((part) => typeof part === 'string' ? part : part?.text || '').join('\n')
        : '';
    try {
      if (!text.trim()) {
        const reason = choice?.finish_reason ? ` (finish reason: ${compact(choice.finish_reason, 60)})` : '';
        const returnedModel = payload?.model ? ` Model: ${compact(payload.model, 100)}.` : '';
        throw new Error(`OpenRouter returned no text${reason}.${returnedModel}`);
      }
      return { ...parseDraft(text, categories), model: payload?.model || OPENROUTER_MODEL, provider: 'openrouter-fallback' };
    } catch (error) {
      lastError = error;
      if (attempt === 0 && deadline - Date.now() > 6000) continue;
      throw new Error(`${errorMessage(error.message, 'OpenRouter returned an unusable response.')} Try again or choose another fallback model.`);
    }
  }
  throw lastError || new Error('OpenRouter did not return a usable completion.');
}

async function fallbackOrFailure(prompt, categories, primaryFailure, deadline) {
  if (OPENROUTER_API_KEY) {
    try {
      return json(200, await generateWithOpenRouter(prompt, categories, deadline));
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        return json(502, { error: 'Gemini failed, and OpenRouter rejected its key. Check the OPENROUTER_API_KEY secret in Netlify.' });
      }
      if (error.status === 429) {
        return json(503, { error: 'Gemini failed and OpenRouter free-model capacity is limited (429). Wait a little, then retry.' });
      }
      if (error.status === 402) {
        return json(502, { error: 'Gemini failed and OpenRouter requires account credits for this request. Check the selected fallback model before enabling paid use.' });
      }
      const detail = errorMessage(error.message, 'provider error');
      const primaryDetail = errorMessage(primaryFailure.message, 'No response from Gemini.');
      return json(502, { error: `Gemini failed (HTTP ${primaryFailure.status || 'network'}: ${primaryDetail}); OpenRouter fallback also failed: ${detail}` });
    }
  }
  return json(primaryFailure.status === 429 ? 429 : 502, {
    error: `Gemini request failed (HTTP ${primaryFailure.status || 'network'}): ${errorMessage(primaryFailure.message, 'No response from Gemini.')}. Configure OPENROUTER_API_KEY for fallback or retry later.`,
  });
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

  const deadline = Date.now() + REQUEST_BUDGET_MS;
  try {
    const settings = config();
    if (!settings.url || !settings.serviceKey) return json(503, { error: 'Server is missing Supabase function configuration.' });
    if (!settings.geminiKey) return json(503, { error: 'Gemini is not configured. Add GEMINI_API_KEY in Netlify environment variables.' });
    if (!(await authorize(event, settings, deadline))) return json(403, { error: 'Sign in with an active editor or admin account to use article AI.' });

    const input = JSON.parse(event.body || '{}');
    const brief = compact(input.brief, 3500);
    const language = ['English', 'Hindi', 'Odia', 'Bengali', 'Telugu', 'Tamil'].includes(input.language) ? input.language : 'English';
    const categories = Array.isArray(input.categories)
      ? input.categories.slice(0, 60).map((item) => ({ name: compact(item?.name, 120), slug: compact(item?.slug, 140) })).filter((item) => item.name && item.slug)
      : [];
    if (brief.length < 20) return json(400, { error: 'Add at least a few sentences of topic and reporting notes.' });

    const prompt = `Create a complete editable news article draft for THE FTP NEWS. Write title, excerpt and body in ${language}; also provide a faithful Odia version in odiaTitle, odiaExcerpt and odiaBody. Return only valid JSON with string keys title, excerpt, body, odiaTitle, odiaExcerpt, odiaBody, category, metaTitle, metaDescription, and a string-array tags.\n\nEditorial rules:\n- Use only facts explicitly present in the supplied reporting notes. Never invent names, dates, quotes, numbers, events, sources, URLs, author names, or claims.\n- If a key fact is missing, insert a clear [VERIFY: what is missing] note in the body and Odia body instead of guessing.\n- Keep the writing neutral, attributed, readable, and original. Do not copy source wording.\n- The excerpt and SEO description should be concise. Body fields must be plain text paragraphs separated by blank lines, with no HTML or markdown.\n- Choose category exactly from this available list, or return an empty string if none fits: ${JSON.stringify(categories.map((item) => item.name))}\n- Generate up to 8 concise relevant tags from the supplied facts.\n- A source name or URL is a research lead, not proof; do not claim you independently verified it.\n- Return only valid JSON matching the requested fields.\n\nCurrent title suggestion: ${compact(input.title, 240) || 'Create a suitable headline'}\nProvided source name: ${compact(input.sourceName, 200) || 'Not supplied'}\nProvided source URL: ${compact(input.sourceURL, 500) || 'Not supplied'}\nReporting notes (the only factual basis):\n${brief}`;

    let response;
    try {
      response = await fetchGeminiWithRetry('https://generativelanguage.googleapis.com/v1beta/interactions', {
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
      }, deadline);
    } catch (error) {
      return fallbackOrFailure(prompt, categories, { status: 0, message: error.message || 'network connection failed' }, deadline);
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = errorMessage(payload?.error || payload?.message, 'Gemini request failed.');
      return fallbackOrFailure(prompt, categories, { status: response.status, message }, deadline);
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
