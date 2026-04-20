const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// /game/:slug -> sinais + iframe vemnabet
app.get('/game/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'game.html'));
});

app.get('/healthz', (_, res) => res.send('ok'));

app.listen(PORT, () => console.log(`StraPlay clone rodando na porta ${PORT}`));
