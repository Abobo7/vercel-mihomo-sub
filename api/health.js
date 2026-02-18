module.exports = function handler(req, res) {
  res.status(200).json({
    ok: true,
    service: 'vercel-mihomo-sub',
    endpoints: ['/api/mihomo', '/api/json'],
  });
};
