// ===== Game Config Loader =====
// Lê o slug da URL (/game/<slug>), busca /api/game/<slug>,
// seta título, hero image, iframe vemnabet.

(async function () {
  var parts = location.pathname.split('/').filter(Boolean);
  var slug = parts[parts.length - 1];

  try {
    var res = await fetch('/api/game/' + slug);
    var cfg = await res.json();

    document.title = 'StraPlay - ' + cfg.title;

    var titleEl = document.getElementById('gameTitle');
    if (titleEl) titleEl.textContent = cfg.title;

    var logo = document.getElementById('gameLogo');
    if (logo && cfg.img) logo.src = cfg.img;

    var frame = document.getElementById('iframe');
    if (frame) frame.src = 'https://vemnabet.bet/game/' + cfg.vemna;

    window.__GAME__ = cfg;
    window.dispatchEvent(new CustomEvent('game-ready', { detail: cfg }));
  } catch (e) {
    console.error('[game] falha ao carregar config', e);
  }
})();

// Utilidades compartilhadas
window.StraPlay = {
  pad: function (n) { return String(n).padStart(2, '0'); },
  rand: function (min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; },
  randFloat: function (min, max, dec) {
    var n = Math.random() * (max - min) + min;
    return n.toFixed(dec || 2);
  },
  pick: function (arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  horarioMais: function (minutos) {
    var d = new Date();
    d.setMinutes(d.getMinutes() + minutos);
    return this.pad(d.getHours()) + ':' + this.pad(d.getMinutes());
  }
};
