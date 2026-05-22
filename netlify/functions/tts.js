const allowedLanguages = new Set(['hi', 'or', 'bn', 'ta', 'te', 'mr', 'gu', 'pa', 'ur']);

export async function handler(event) {
  try {
    const language = event.queryStringParameters?.tl || 'or';
    const text = (event.queryStringParameters?.q || '').trim();

    if (!allowedLanguages.has(language)) {
      return {
        statusCode: 400,
        body: 'Unsupported language.',
      };
    }

    if (!text) {
      return {
        statusCode: 400,
        body: 'Missing text.',
      };
    }

    const safeText = text.slice(0, 180);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${language}&q=${encodeURIComponent(safeText)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 FTP News Audio Reader',
        Accept: 'audio/mpeg,audio/*,*/*',
      },
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: 'TTS provider failed.',
      };
    }

    const audio = Buffer.from(await response.arrayBuffer()).toString('base64');
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
        'Content-Type': 'audio/mpeg',
      },
      body: audio,
      isBase64Encoded: true,
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: error.message || 'TTS failed.',
    };
  }
}
