const yaml = require('js-yaml');
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
    const names = proxies.map((p) => p.name);

    const config = {
      'mixed-port': Number(process.env.MIHOMO_PORT || 7890),
      'allow-lan': false,
      mode: 'rule',
      'log-level': 'info',
      proxies,
      'proxy-groups': [
        {
          name: 'PROXY',
          type: 'select',
          proxies: ['AUTO', ...names],
        },
        {
          name: 'AUTO',
          type: 'url-test',
          url: process.env.TEST_URL || 'http://www.gstatic.com/generate_204',
          interval: Number(process.env.TEST_INTERVAL || 300),
          tolerance: Number(process.env.TEST_TOLERANCE || 50),
          proxies: names,
        },
      ],
      rules: ['MATCH,PROXY'],
    };

    const doc = yaml.dump(config, {
      noRefs: true,
      lineWidth: -1,
      sortKeys: false,
    });

    res.setHeader('Content-Type', 'text/yaml; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.setHeader('X-Source-Url', sourceUrl);
    res.status(200).send(doc);
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: String(err.message || err),
    });
  }
};
