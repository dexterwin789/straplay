const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

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
  'aovivo':              { title: 'Roleta Ao Vivo',        vemna: 'crazy-time' }
};

app.get('/game/:slug', (req, res) => {
  const cfg = GAMES[req.params.slug];
  if (!cfg) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'games', req.params.slug, 'index.html'));
});

app.get('/api/game/:slug', (req, res) => {
  const cfg = GAMES[req.params.slug];
  if (!cfg) return res.status(404).json({ error: 'not found' });
  res.json({ slug: req.params.slug, ...cfg });
});

app.get('/healthz', (_, res) => res.send('ok'));

app.listen(PORT, () => console.log(`StraPlay rodando na porta ${PORT}`));
