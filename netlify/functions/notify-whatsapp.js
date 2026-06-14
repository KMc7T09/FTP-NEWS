async function supabaseRequest(path, options = {}) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error('Supabase service env missing.');

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

function createMessage(article) {
  return [
    `FTP published a new article:`,
    article.title || 'New FTP article',
    article.excerpt ? article.excerpt.slice(0, 140) : '',
    article.url || '',
  ].filter(Boolean).join('\n\n');
}

async function sendWhatsappText(to, message) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME;
  const templateLanguage = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en_US';
  if (!token || !phoneNumberId) throw new Error('WhatsApp env missing.');

  const body = templateName
    ? {
        messaging_product: 'whatsapp',
        to: to.replace(/[^\d]/g, ''),
        type: 'template',
        template: {
          name: templateName,
          language: { code: templateLanguage },
          components: [
            {
              type: 'body',
              parameters: [{ type: 'text', text: message.slice(0, 900) }],
            },
          ],
        },
      }
    : {
        messaging_product: 'whatsapp',
        to: to.replace(/[^\d]/g, ''),
        type: 'text',
        text: { preview_url: true, body: message },
      };

  const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed.' };
  }

  try {
    const article = JSON.parse(event.body || '{}');
    if (!article.title || !article.url) return { statusCode: 400, body: 'Missing article data.' };

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
      return { statusCode: 202, body: 'WhatsApp notification skipped. Configure Netlify env variables.' };
    }

    const profiles = await supabaseRequest('profiles?select=id,phone_number,whatsapp_opt_in&whatsapp_opt_in=eq.true&phone_number=not.is.null');
    const message = createMessage(article);
    const targets = (profiles || []).filter((profile) => profile.phone_number);

    const results = await Promise.allSettled(targets.map((profile) => sendWhatsappText(profile.phone_number, message)));
    const sent = results.filter((item) => item.status === 'fulfilled').length;

    return {
      statusCode: 200,
      body: JSON.stringify({ sent, attempted: targets.length }),
    };
  } catch (error) {
    return { statusCode: 500, body: error.message || 'WhatsApp notification failed.' };
  }
}
