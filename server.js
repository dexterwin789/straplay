const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// Mapeamento slug -> template + meta
const GAMES = {
  'hack-tiger':          { tpl: 'slot',    title: 'Fortune Tiger',    img: '/img/tiger01.png',         vemna: 'fortune-tiger' },
  'hack-rabbit':         { tpl: 'slot',    title: 'Fortune Rabbit',   img: '/img/rabbit01.png',        vemna: 'fortune-rabbit' },
  'hack-mouse':          { tpl: 'slot',    title: 'Fortune Mouse',    img: '/img/mouse01.png',         vemna: 'fortune-mouse' },
  'hack-ox':             { tpl: 'slot',    title: 'Fortune Ox',       img: '/img/touro01.png',         vemna: 'fortune-ox' },
  'hack-dragon':         { tpl: 'slot',    title: 'Fortune Dragon',   img: '/img/dragon.png',          vemna: 'fortune-dragon' },
  'hack-double-fortune': { tpl: 'slot',    title: 'Double Fortune',   img: '/img/fortune-double.png',  vemna: 'double-fortune' },
  'hack-mines':          { tpl: 'mines',   title: 'Mines',            img: '/img/mines2.png',          vemna: 'mines-pro' },
  'aviator':             { tpl: 'aviator', title: 'Aviator',          img: '/img/aviator.png',         vemna: 'aviator' },
  'bacbo':               { tpl: 'bacbo',   title: 'Bac Bo',           img: '/img/bacbo.png',           vemna: 'bac-bo' },
  'aovivo':              { tpl: 'aovivo',  title: 'Roleta Ao Vivo',   img: '/img/roleta_ao_vivo.png',  vemna: 'crazy-time' }
};

app.get('/game/:slug', (req, res) => {
  const cfg = GAMES[req.params.slug];
  if (!cfg) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'games', cfg.tpl + '.html'));
});

app.get('/api/game/:slug', (req, res) => {
  const cfg = GAMES[req.params.slug];
  if (!cfg) return res.status(404).json({ error: 'not found' });
  res.json({ slug: req.params.slug, ...cfg });
});

app.get('/healthz', (_, res) => res.send('ok'));

app.listen(PORT, () => console.log(`StraPlay rodando na porta ${PORT}`));
