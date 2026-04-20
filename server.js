const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

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
  'aovivo':              { title: 'Roleta Ao Vivo',        vemna: 'crazy-time' },
  'xxxtreme':            { title: 'XXXTreme Lightning Roulette', vemna: 'lightning-roulette' }
};

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
