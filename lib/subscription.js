const crypto = require('crypto');

const DEFAULT_URLS = [
  'https://bannedbook.github.io/fanqiang/vsp-en.py',
  'https://raw.githubusercontent.com/bannedbook/fanqiang/master/docs/vsp-en.py',
  'https://gitlab.com/bobmolen/cloud/raw/master/vsp-en.py',
  'https://storage.googleapis.com/jwnews/vsp-en.py',
];

const DEFAULT_USER_AGENT = 'NekoBox/Android/6.5.0 (Prefer ClashMeta Format)';
const KEY = Buffer.from('36KeAARKZuKF39N9LFyycLUyKMhZDq0B', 'utf8');
const IV = Buffer.from('36KeAARKZuKF39N9', 'utf8');

function parseUrlsFromEnv() {
  const raw = (process.env.SUB_URLS || '').trim();
  if (!raw) return DEFAULT_URLS;
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeBase64(input) {
  let x = input.trim().replace(/\s+/g, '');
  x = x.replace(/-/g, '+').replace(/_/g, '/');
  const mod = x.length % 4;
  if (mod) x += '='.repeat(4 - mod);
  return x;
}

function decodeBase64Text(input) {
  return Buffer.from(normalizeBase64(input), 'base64');
}

function aesDecryptVsp(cipherText) {
  const encrypted = decodeBase64Text(cipherText);
  if (encrypted.length % 16 !== 0) {
    throw new Error(`cipher length not multiple of 16: ${encrypted.length}`);
  }
  const decipher = crypto.createDecipheriv('aes-256-cbc', KEY, IV);
  const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return plain.toString('utf8');
}

function extractBase64Candidates(text) {
  const candidates = new Set();
  const trimmed = text.trim();
  if (trimmed) candidates.add(trimmed);

  const re = /[A-Za-z0-9+/_=-]{200,}/g;
  const found = text.match(re) || [];
  for (const f of found) candidates.add(f);

  return [...candidates];
}

function parseVmessJsonFromLink(vmessLink) {
  const payload = vmessLink.slice('vmess://'.length).trim();
  const raw = decodeBase64Text(payload).toString('utf8');
  return JSON.parse(raw);
}

function toBoolTls(v) {
  if (!v) return false;
  const s = String(v).toLowerCase();
  return s === 'tls' || s === 'true' || s === '1';
}

function mapNetwork(net) {
  const n = (net || '').toLowerCase();
  if (!n || n === 'tcp') return 'tcp';
  if (['ws', 'grpc', 'h2', 'http', 'httpupgrade'].includes(n)) return n;
  return 'tcp';
}

function vmessToMihomo(vmess) {
  const name = vmess.ps || `${vmess.add}:${vmess.port}`;
  const network = mapNetwork(vmess.net);

  const proxy = {
    name,
    type: 'vmess',
    server: vmess.add,
    port: Number(vmess.port),
    uuid: vmess.id,
    alterId: Number(vmess.aid || 0),
    cipher: vmess.scy || 'auto',
    udp: true,
    network,
  };

  if (toBoolTls(vmess.tls)) {
    proxy.tls = true;
    if (vmess.sni) proxy.servername = vmess.sni;
  }

  if ((network === 'ws' || network === 'httpupgrade') && (vmess.path || vmess.host)) {
    proxy['ws-opts'] = {
      path: vmess.path || '/',
      headers: vmess.host ? { Host: vmess.host } : {},
    };
  }

  if (network === 'grpc') {
    proxy['grpc-opts'] = {
      'grpc-service-name': vmess.path || '',
    };
  }

  return proxy;
}

async function fetchText(url, userAgent = DEFAULT_USER_AGENT) {
  const resp = await fetch(url, {
    headers: {
      'user-agent': userAgent,
      accept: '*/*',
    },
  });
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
  }
  return await resp.text();
}

function parseNodesFromText(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('vmess://'));
}

function parsePlainOrEncrypted(text) {
  // direct plain node list
  const direct = parseNodesFromText(text);
  if (direct.length) return direct;

  // try extracting encrypted/base64 candidate then decrypt
  const candidates = extractBase64Candidates(text);
  for (const c of candidates) {
    try {
      const decrypted = aesDecryptVsp(c);
      const nodes = parseNodesFromText(decrypted);
      if (nodes.length) return nodes;
    } catch (_) {
      // continue
    }

    // fallback: maybe candidate itself is plain/base64 node text
    try {
      const maybe = decodeBase64Text(c).toString('utf8');
      const nodes = parseNodesFromText(maybe);
      if (nodes.length) return nodes;
    } catch (_) {
      // continue
    }
  }

  return [];
}

function dedupeByName(proxies) {
  const nameCount = new Map();
  return proxies.map((p) => {
    const count = (nameCount.get(p.name) || 0) + 1;
    nameCount.set(p.name, count);
    if (count === 1) return p;
    return { ...p, name: `${p.name}-${count}` };
  });
}

async function fetchAndConvert({ urls, userAgent }) {
  const errors = [];

  for (const url of urls) {
    try {
      const raw = await fetchText(url, userAgent);
      const nodes = parsePlainOrEncrypted(raw);
      if (!nodes.length) {
        throw new Error('no vmess nodes parsed');
      }

      const proxies = dedupeByName(nodes.map((n) => vmessToMihomo(parseVmessJsonFromLink(n))));
      return { proxies, sourceUrl: url };
    } catch (err) {
      errors.push({ url, error: String(err.message || err) });
    }
  }

  const detail = errors.map((e) => `${e.url}: ${e.error}`).join('; ');
  throw new Error(`all sources failed: ${detail}`);
}

module.exports = {
  DEFAULT_URLS,
  DEFAULT_USER_AGENT,
  parseUrlsFromEnv,
  fetchAndConvert,
  parsePlainOrEncrypted,
  vmessToMihomo,
  parseVmessJsonFromLink,
};
