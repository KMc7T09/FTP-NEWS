const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

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
    throw new Error(detail || `Gemini request failed with ${response.status}`);
  }

  return response.json();
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' });
  if (!GEMINI_API_KEY) return json(500, { error: 'GEMINI_API_KEY is not configured in Netlify.' });

  try {
    const input = JSON.parse(event.body || '{}');
    const question = compact(input.question, 500);
    const title = compact(input.title, 300);
    const excerpt = compact(input.excerpt, 600);
    const content = compact(input.content, 9000);
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

    let data;
    let grounded = true;
    try {
      data = await callGemini(prompt, true);
    } catch (error) {
      grounded = false;
      data = await callGemini(prompt, false);
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
