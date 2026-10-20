exports.config = { schedule: '30 0 * * *' };

exports.handler = async () => {
  const siteUrl = String(process.env.URL || process.env.DEPLOY_PRIME_URL || '').trim().replace(/\/+$/, '');
  const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!siteUrl || !serviceKey) {
    console.error('Scheduled weather enqueue failed: Netlify URL or Supabase service key is missing.');
    return { statusCode: 500, body: 'Scheduled weather configuration is incomplete.' };
  }

  try {
    const response = await fetch(`${siteUrl}/.netlify/functions/generate-weather-background`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${serviceKey}` },
      signal: AbortSignal.timeout(15000),
    });
    if (response.status !== 202) {
      const detail = (await response.text().catch(() => '')).slice(0, 400);
      throw new Error(`Background weather job returned ${response.status}${detail ? `: ${detail}` : ''}`);
    }
    console.info('Daily weather background job queued.');
    return { statusCode: 202, body: 'Daily weather generation queued.' };
  } catch (error) {
    console.error('Scheduled weather enqueue failed:', error.message || error);
    return { statusCode: 500, body: 'Could not queue the daily weather job.' };
  }
};
