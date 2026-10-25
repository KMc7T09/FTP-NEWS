const SITE_URL = 'https://the-ftp-news.netlify.app';
const STATIC_PATHS = [
  '/', '/about', '/founder', '/team', '/contact', '/weather',
  '/reports', '/rankings', '/representatives',
  '/category/politics', '/category/india', '/category/odisha', '/category/world',
  '/category/opinion', '/category/fact-check', '/category/youth',
  '/privacy-policy', '/terms', '/editorial-policy', '/disclaimer',
];

function xmlEscape(value = '') {
  return String(value).replace(/[<>&"']/g, (character) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
  })[character]);
}

function response(statusCode, body, contentType = 'application/json; charset=utf-8') {
  return { statusCode, headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=300' }, body };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return response(405, JSON.stringify({ error: 'Method not allowed.' }));

  const supabaseUrl = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const anonKey = String(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
  if (!supabaseUrl || !anonKey) return response(503, JSON.stringify({ error: 'Public article index is temporarily unavailable.' }));

  try {
    const articles = [];
    const pageSize = 1000;
    for (let offset = 0; offset < 50000; offset += pageSize) {
      const endpoint = `${supabaseUrl}/rest/v1/articles?status=eq.published&select=slug,updated_at,published_at&order=published_at.desc`;
      const result = await fetch(endpoint, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          Range: `${offset}-${offset + pageSize - 1}`,
          Prefer: 'count=exact',
        },
        signal: AbortSignal.timeout(12000),
      });
      if (!result.ok) throw new Error(`Published stories query failed (${result.status}).`);
      const rows = await result.json();
      articles.push(...rows);
      if (rows.length < pageSize) break;
    }

    const reportResponse = await fetch(`${supabaseUrl}/rest/v1/public_reports?status=eq.published&select=slug,updated_at,published_at&order=published_at.desc`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      signal: AbortSignal.timeout(12000),
    });
    let reports = [];
    if (reportResponse.ok) {
      reports = await reportResponse.json();
    } else {
      const reportError = await reportResponse.text();
      if (!(reportResponse.status === 404 || /public_reports|schema cache|PGRST205/i.test(reportError))) {
        throw new Error(`Published reports query failed (${reportResponse.status}): ${reportError.slice(0, 240)}`);
      }
      console.warn('Public reports table is not available yet; omitting report URLs from sitemap.');
    }

    const staticUrls = STATIC_PATHS.map((path) => `<url><loc>${SITE_URL}${xmlEscape(path)}</loc></url>`);
    const articleUrls = articles
      .filter((article) => article.slug)
      .map((article) => {
        const lastmod = article.updated_at || article.published_at;
        return `<url><loc>${SITE_URL}/article/${xmlEscape(encodeURIComponent(article.slug))}</loc>${lastmod ? `<lastmod>${xmlEscape(new Date(lastmod).toISOString())}</lastmod>` : ''}</url>`;
      });
    const reportUrls = reports
      .filter((report) => report.slug)
      .map((report) => {
        const lastmod = report.updated_at || report.published_at;
        return `<url><loc>${SITE_URL}/reports/${xmlEscape(encodeURIComponent(report.slug))}</loc>${lastmod ? `<lastmod>${xmlEscape(new Date(lastmod).toISOString())}</lastmod>` : ''}</url>`;
      });
    const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${staticUrls.join('')}${articleUrls.join('')}${reportUrls.join('')}</urlset>`;
    return response(200, xml, 'application/xml; charset=utf-8');
  } catch (error) {
    console.error('Sitemap generation failed:', error.message || error);
    return response(503, JSON.stringify({ error: 'Published article index is temporarily unavailable.' }));
  }
};
