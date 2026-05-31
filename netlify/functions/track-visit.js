function getClientIp(event) {
  const headers = event.headers || {};
  const forwarded = headers['x-forwarded-for'] || headers['X-Forwarded-For'] || '';
  return (
    headers['x-nf-client-connection-ip'] ||
    headers['X-Nf-Client-Connection-Ip'] ||
    forwarded.split(',')[0]?.trim() ||
    headers['client-ip'] ||
    ''
  );
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed.' };
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return { statusCode: 500, body: 'Supabase env missing.' };
    }

    const body = JSON.parse(event.body || '{}');
    const payload = {
      visitor_id: body.visitorId || '',
      path: body.path || '/',
      title: body.title || '',
      referrer: body.referrer || '',
      user_agent: body.userAgent || event.headers?.['user-agent'] || '',
      language: body.language || '',
      screen: body.screen || '',
      user_id: body.userId || null,
      ip_address: getClientIp(event),
    };

    if (!payload.visitor_id || !payload.path) {
      return { statusCode: 400, body: 'Missing visit fields.' };
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/page_visits`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { statusCode: response.status, body: await response.text() };
    }

    return {
      statusCode: 204,
      headers: { 'Access-Control-Allow-Origin': '*' },
    };
  } catch (error) {
    return { statusCode: 500, body: error.message || 'Visit tracking failed.' };
  }
}
