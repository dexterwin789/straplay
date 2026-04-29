const express = require('express');
const path = require('path');
const http = require('http');
const https = require('https');
const { signRef, verifyRef } = require('./refToken');

const app = express();
const PORT = process.env.PORT || 3000;

const CASSINO_BASE = process.env.CASSINO_BASE || 'https://vemnabet.bet';
const KNOWN_APP_HOSTS = new Set([
  'app.vemnabet.bet', 'www.app.vemnabet.bet',
  'straplay-production.up.railway.app',
  'localhost', '127.0.0.1'
]);
const IS_PROD = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_ENVIRONMENT || !!process.env.RAILWAY_PROJECT_ID;

// Host → ref cache (5min)
const _hostCache = new Map();
function _getCached(host) {
  const v = _hostCache.get(host);
  if (!v) return undefined;
  if (v.expires < Date.now()) { _hostCache.delete(host); return undefined; }
  return v;
}
function _setCached(host, ref) {
  if (_hostCache.size > 500) _hostCache.clear();
  _hostCache.set(host, { ref: ref || null, expires: Date.now() + 5 * 60 * 1000 });
}
function _fetchRefForHost(host) {
  return new Promise((resolve) => {
    const url = CASSINO_BASE + '/api/public/resolve-domain?host=' + encodeURIComponent(host);
    const req = https.get(url, { timeout: 3000 }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; if (body.length > 8192) req.destroy(); });
      res.on('end', () => {
        try {
          const j = JSON.parse(body);
          resolve(j && j.ok && j.ref ? j.ref : null);
        } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}
async function resolveHostRef(host) {
  if (!host) return null;
  host = host.toLowerCase().split(':')[0];
  if (KNOWN_APP_HOSTS.has(host) || /\.up\.railway\.app$/.test(host) || /vemnabet\.bet$/.test(host)) return null;
  const cached = _getCached(host);
  if (cached !== undefined) return cached.ref;
  const ref = await _fetchRefForHost(host);
  _setCached(host, ref);
  return ref;
}

// ── Custom domain middleware ──
// If request comes on an affiliate's custom domain (CNAME → app.vemnabet.bet),
// redirect once to https://app.vemnabet.bet/r/<signedToken> so the cookie
// lands on .vemnabet.bet. Subsequent visits hit app.vemnabet.bet directly
// and the cookie already exists. URL stays clean (no ?ref=).
app.use(async (req, res, next) => {
  const host = (req.headers.host || '').toLowerCase().split(':')[0];
  if (!host || req.path === '/healthz' || req.path === '/health') return next();
  // Only redirect for top-level HTML navigations, not APIs/assets.
  const accept = String(req.headers.accept || '');
  const isHtmlNav = req.method === 'GET' && (
    accept.includes('text/html') || req.path === '/' || req.path.startsWith('/game/')
  );
  if (!isHtmlNav) return next();
  const ref = await resolveHostRef(host);
  if (!ref) return next();
  const token = signRef(ref);
  if (!token) return next();
  return res.redirect(302, 'https://app.vemnabet.bet/r/' + encodeURIComponent(token));
});

// /r/:token — HMAC-signed camouflaged ref. Sets .vemnabet.bet cookie, 302 to "/"
app.get('/r/:token', (req, res) => {
  const ref = verifyRef(req.params.token);
  const parts = [];
  if (ref) {
    parts.push(
      `vnb_ref=${encodeURIComponent(ref)}`,
      'Path=/',
      `Max-Age=${30 * 24 * 60 * 60}`,
      'SameSite=Lax'
    );
    if (IS_PROD) { parts.push('Domain=.vemnabet.bet'); parts.push('Secure'); }
    res.append('Set-Cookie', parts.join('; '));
  }
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  return res.redirect(302, '/');
});

function proxyCassinoJson(pathname, res) {
  const target = new URL(pathname, CASSINO_BASE);
  const client = target.protocol === 'http:' ? http : https;
  let done = false;
  function finish(status, payload) {
    if (done) return;
    done = true;
    if (typeof payload === 'string') return res.status(status).type('application/json').send(payload || '{}');
    return res.status(status).json(payload);
  }
  const req = client.get(target, { timeout: 5000, headers: { 'Accept': 'application/json' } }, (upstream) => {
    let body = '';
    upstream.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) req.destroy();
    });
    upstream.on('end', () => {
      finish(upstream.statusCode || 502, body || '{}');
    });
  });
  req.on('error', () => finish(502, { ok: false, msg: 'Nao foi possivel consultar o VemNaBet agora.' }));
  req.on('timeout', () => {
    req.destroy();
    finish(504, { ok: false, msg: 'Tempo esgotado ao consultar o VemNaBet.' });
  });
}

app.get('/api/roulette/french/signals', (_, res) => {
  proxyCassinoJson('/api/roulette/french/signals', res);
});

app.get('/api/roulette/pragmatic/signals', (req, res) => {
  const game = String(req.query.game_code || '');
  if (!game) return res.status(400).json({ ok: false, msg: 'game_code obrigatório.' });
  proxyCassinoJson('/api/roulette/pragmatic/signals?game_code=' + encodeURIComponent(game), res);
});

// Headers applied to every HTML/static response so Cloudflare never caches HTML
function setNoStore(res, filePath) {
  if (!filePath || /\.(html)$/i.test(filePath)) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('CDN-Cache-Control', 'no-store');
    res.set('Cloudflare-CDN-Cache-Control', 'no-store');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
}

app.use(express.static(path.join(__dirname, 'public'), {
  extensions: ['html'],
  setHeaders: setNoStore,
  etag: false,
  lastModified: false
}));

// Slug -> VemnaBet game code
const GAMES = {
  'hack-tiger':          { title: 'Hack Fortune Tiger',    vemna: 'fortune-tiger' },
  'hack-rabbit':         { title: 'Hack Fortune Rabbit',   vemna: 'fortune-rabbit' },
  'hack-mouse':          { title: 'Hack Fortune Mouse',    vemna: 'fortune-mouse' },
  'hack-ox':             { title: 'Hack Fortune Ox',       vemna: 'fortune-ox' },
  'hack-dragon':         { title: 'Hack Fortune Dragon',   vemna: 'fortune-dragon' },
  'hack-double-fortune': { title: 'Hack Double Fortune',   vemna: 'double-fortune' },
  'hack-mines':          { title: 'Hack Mines',            vemna: 'mines-pro' },
  'aviator':             { title: 'Aviator',               vemna: 'aviator' },
  'bacbo':               { title: 'Bac Bo',                vemna: 'golden-wealth-baccarat' },
  'aovivo':              { title: 'French Roulette',       vemna: 'oficial-pragmatic-live-pp-28401' },
  'roleta':              { title: 'Fortune Roulette',      vemna: 'oficial-pragmatic-live-pp-270' }
};

// Back-compat: old /game/xxxtreme URL → /game/roleta
app.get('/game/xxxtreme', (req, res) => {
  const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  res.redirect(301, '/game/roleta' + qs);
});

// Prevent Cloudflare from caching HTML responses (game pages + SPA entry)
app.use((req, res, next) => {
  const accept = String(req.headers.accept || '');
  if (accept.includes('text/html') || req.path === '/' || req.path.startsWith('/game/') || req.path.endsWith('.html')) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('CDN-Cache-Control', 'no-store');
    res.set('Cloudflare-CDN-Cache-Control', 'no-store');
  }
  next();
});

app.get('/game/:slug', (req, res) => {
  const cfg = GAMES[req.params.slug];
  if (!cfg) return res.redirect('/');
  setNoStore(res, 'x.html');
  res.sendFile(path.join(__dirname, 'public', 'games', req.params.slug, 'index.html'), {
    cacheControl: false,
    etag: false,
    lastModified: false,
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' }
  });
});

app.get('/api/game/:slug', (req, res) => {
  const cfg = GAMES[req.params.slug];
  if (!cfg) return res.status(404).json({ error: 'not found' });
  res.json({ slug: req.params.slug, ...cfg });
});

app.get('/healthz', (_, res) => res.send('ok'));

app.listen(PORT, () => console.log(`StraPlay rodando na porta ${PORT}`));
