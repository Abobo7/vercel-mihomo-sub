const {
  parseUrlsFromEnv,
  DEFAULT_USER_AGENT,
  fetchAndConvert,
} = require('../lib/subscription');

module.exports = async function handler(req, res) {
  try {
    const queryUrls = (req.query.urls || '').trim();
    const urls = queryUrls
      ? queryUrls.split(',').map((v) => v.trim()).filter(Boolean)
      : parseUrlsFromEnv();

    const userAgent = (req.query.ua || process.env.SUB_USER_AGENT || DEFAULT_USER_AGENT).trim();

    const { proxies, sourceUrl } = await fetchAndConvert({ urls, userAgent });
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.status(200).json({
      ok: true,
      sourceUrl,
      count: proxies.length,
      proxies,
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: String(err.message || err),
    });
  }
};
