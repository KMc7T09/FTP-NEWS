const { generateAllActiveWeather } = require('./generate-weather');

exports.config = { background: true };

exports.handler = async (event) => {
  const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const authorization = event.headers?.authorization || event.headers?.Authorization || '';

  if (!serviceKey || authorization !== `Bearer ${serviceKey}`) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  try {
    const result = await generateAllActiveWeather();
    console.log('Daily weather generation finished', {
      saved: result.saved,
      failed: result.failed.length,
      totalLocations: result.totalLocations,
    });
    if (result.failed.length) console.error('Weather locations failed:', result.failed);
    return { statusCode: 200, body: 'Weather generation finished' };
  } catch (error) {
    console.error('Daily weather background job failed:', error);
    return { statusCode: 500, body: error.message || 'Weather generation failed' };
  }
};
