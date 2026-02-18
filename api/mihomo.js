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
      'external-controller': process.env.EXTERNAL_CONTROLLER || '127.0.0.1:9090',
      'allow-lan': false,
      mode: 'rule',
      'log-level': process.env.LOG_LEVEL || 'debug',
      ipv6: true,
      tun: {
        enable: true,
      },
      dns: {
        enable: true,
        listen: '0.0.0.0:53',
        'enhanced-mode': 'fake-ip',
        nameserver: ['8.8.8.8', '1.1.1.1', '114.114.114.114'],
      },
      proxies,
      'proxy-groups': [
        {
          name: 'Proxy',
          type: 'select',
          proxies: ['AUTO', 'DIRECT', ...names],
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
      rules: ['GEOIP,CN,DIRECT', 'MATCH,Proxy'],
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
