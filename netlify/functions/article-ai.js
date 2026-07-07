const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'tencent/hy3:free';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function json(statusCode, body) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(body),
  };
}

function compact(value = '', max = 12000) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function stripError(value = '') {
  try {
    const parsed = JSON.parse(value);
    return parsed?.error?.message || value;
  } catch {
    return value;
  }
}

function isQuotaError(error) {
  const message = String(error?.message || '');
  return message.includes('429') || message.includes('RESOURCE_EXHAUSTED') || message.includes('Quota exceeded');
}

function fallbackAnswer({ question, title, excerpt, sourceName, sourceURL }) {
  const sourceLine = sourceURL
    ? `Source is provided: ${sourceName || sourceURL}. Open it and compare the headline, date, numbers, names, and quoted claims.`
    : 'No source link is attached, so this article cannot be fully verified from the page alone.';

  return [
    'Gemini API quota is currently exhausted for this project, so I cannot use live AI verification right now.',
    '',
    `Based on the article context, your question is: "${question}"`,
    `Article: "${title || 'Untitled article'}"`,
    excerpt ? `Summary context: ${excerpt}` : '',
    '',
    'Manual verification checklist:',
    `1. ${sourceLine}`,
    '2. Search the exact headline and the main claim on Google News or official government/organization websites.',
    '3. Check whether at least two reliable sources report the same claim.',
    '4. If this article was translated from another website, compare the original source with your version before publishing.',
    '5. Treat opinion, viral posts, and screenshots as unverified until a primary source confirms them.',
    '',
    'To enable live AI answers again, increase Gemini API quota/billing or wait until the quota resets.',
  ].filter(Boolean).join('\n');
}

function getText(data) {
  return (data?.candidates?.[0]?.content?.parts || [])
    .map((part) => part.text || '')
    .join('\n')
    .trim();
}

async function callGemini(payload, useSearch = true) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: payload }],
      },
    ],
    generationConfig: {
      temperature: 0.25,
      topP: 0.9,
      maxOutputTokens: 900,
    },
  };

  if (useSearch) {
    body.tools = [{ google_search: {} }];
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(stripError(detail) || `Gemini request failed with ${response.status}`);
  }

  return response.json();
}

async function callOpenRouter(payload) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://the-ftp-news.netlify.app',
      'X-OpenRouter-Title': 'FTP News Article AI',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        {
          role: 'user',
          content: payload,
        },
      ],
      temperature: 0.25,
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(stripError(detail) || `OpenRouter request failed with ${response.status}`);
  }

  const data = await response.json();
  const answer = data?.choices?.[0]?.message?.content?.trim();
  if (!answer) throw new Error('OpenRouter did not return an answer.');
  return answer;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' });
  if (!GEMINI_API_KEY && !OPENROUTER_API_KEY) {
    return json(500, { error: 'No AI API key configured. Add OPENROUTER_API_KEY or GEMINI_API_KEY in Netlify.' });
  }

  try {
    const input = JSON.parse(event.body || '{}');
    const question = compact(input.question, 500);
    const title = compact(input.title, 300);
    const excerpt = compact(input.excerpt, 600);
    const content = compact(input.content, 3500);
    const sourceName = compact(input.sourceName, 200);
    const sourceURL = compact(input.sourceURL, 500);

    if (!question) return json(400, { error: 'Question is required.' });
    if (!title && !content) return json(400, { error: 'Article context is missing.' });

    const prompt = `
You are the FTP News article verification assistant.

Answer the reader's question using:
1. The article context below.
2. Reliable public knowledge/search results if available.

Rules:
- Be concise, clear, and neutral.
- Do not pretend something is verified if the article/source does not prove it.
- If the user asks whether the article is copied, true, fake, or trustworthy, explain what can be checked and what cannot be confirmed from the provided article.
- Mention if the answer is based on the article text, external knowledge/search, or needs manual source verification.
- If sourceURL exists, tell the reader to compare with that source.
- Never provide legal, medical, or financial certainty.

Article title:
${title}

Article excerpt:
${excerpt}

Article source:
${sourceName || 'Not provided'} ${sourceURL || ''}

Article content:
${content}

Reader question:
${question}
`;

    if (OPENROUTER_API_KEY) {
      try {
        const answer = await callOpenRouter(prompt);
        return json(200, {
          answer,
          grounded: false,
          model: OPENROUTER_MODEL,
          provider: 'openrouter',
        });
      } catch (error) {
        if (!GEMINI_API_KEY) {
          return json(200, {
            answer: fallbackAnswer({ question, title, excerpt, sourceName, sourceURL }),
            grounded: false,
            model: 'fallback-openrouter-error',
            quotaLimited: true,
            providerError: error.message,
          });
        }
      }
    }

    let data;
    let grounded = false;
    try {
      data = await callGemini(prompt, false);
    } catch (error) {
      if (!isQuotaError(error)) throw error;
      return json(200, {
        answer: fallbackAnswer({ question, title, excerpt, sourceName, sourceURL }),
        grounded: false,
        model: 'fallback-no-quota',
        quotaLimited: true,
      });
    }

    const answer = getText(data);
    if (!answer) return json(502, { error: 'AI did not return an answer.' });

    return json(200, {
      answer,
      grounded,
      model: MODEL,
    });
  } catch (error) {
    return json(500, { error: error.message || 'AI verification failed.' });
  }
};
