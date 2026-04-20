// ===== StraPlay signal engine =====
// Gera sinais aleatórios por tipo de jogo e aponta iframe para VemnaBet

(function () {
  var VEMNA_BASE = 'https://vemnabet.bet/game/';
  var DEFAULT_SLUG = 'fortune-tiger';

  // Catálogo de jogos (slug => { name, type, vemna })
  var CATALOG = {
    'roleta-brasileira':   { name: 'Roleta Brasileira', type: 'roulette',  vemna: 'crazy-time' },
    'lightning-roulette':  { name: 'Lightning Roulette', type: 'roulette', vemna: 'lightning-roulette' },
    'xxxtreme-roulette':   { name: 'XXXTreme Roulette', type: 'roulette',  vemna: 'lightning-roulette' },
    'aviator':             { name: 'Aviator',           type: 'crash',     vemna: 'aviator' },
    'spaceman':            { name: 'Spaceman',          type: 'crash',     vemna: 'spaceman' },
    'bac-bo':              { name: 'Bac Bo',            type: 'bacbo',     vemna: 'crazy-time' },
    'fortune-tiger':       { name: 'Fortune Tiger',     type: 'slot',      vemna: 'fortune-tiger' },
    'fortune-rabbit':      { name: 'Fortune Rabbit',    type: 'slot',      vemna: 'fortune-rabbit' },
    'fortune-mouse':       { name: 'Fortune Mouse',     type: 'slot',      vemna: 'fortune-mouse' },
    'fortune-ox':          { name: 'Fortune Ox',        type: 'slot',      vemna: 'fortune-ox' },
    'fortune-dragon':      { name: 'Fortune Dragon',    type: 'slot',      vemna: 'fortune-dragon' },
    'double-fortune':      { name: 'Double Fortune',    type: 'slot',      vemna: 'double-fortune' },
    'mines-pro':           { name: 'Mines',             type: 'mines',     vemna: 'mines-pro' }
  };

  function getSlug() {
    var parts = location.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || DEFAULT_SLUG;
  }

  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  var slug = getSlug();
  var game = CATALOG[slug] || { name: slug.replace(/-/g, ' ').toUpperCase(), type: 'slot', vemna: slug };

  // Título
  document.getElementById('gameTitle').textContent = game.name.toUpperCase();
  document.title = 'StraPlay - ' + game.name;

  // Iframe VemnaBet
  var frame = document.getElementById('betFrame');
  var loader = document.getElementById('iframeLoader');
  frame.src = VEMNA_BASE + game.vemna;
  frame.addEventListener('load', function () {
    loader.classList.add('hidden');
  });
  // fallback: esconde loader após 8s mesmo sem evento
  setTimeout(function () { loader.classList.add('hidden'); }, 8000);

  // ===== Sinais =====
  var els = {
    numbers:    document.getElementById('lastNumbers'),
    status:     document.getElementById('signalStatus'),
    statusText: document.getElementById('signalStatusText'),
    entry:      document.getElementById('signalEntry'),
    value:      document.getElementById('signalValue'),
    protection: document.getElementById('signalProtection'),
    countdown:  document.getElementById('signalCountdown')
  };

  // Números roleta com cor
  var RED_NUMBERS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
  function rouletteColor(n) {
    if (n === 0) return 'green';
    return RED_NUMBERS.indexOf(n) !== -1 ? 'red' : 'black';
  }
  function renderRouletteNumbers() {
    els.numbers.innerHTML = '';
    for (var i = 0; i < 5; i++) {
      var n = rand(0, 36);
      var span = document.createElement('span');
      span.className = 'num ' + rouletteColor(n);
      span.textContent = n;
      els.numbers.appendChild(span);
    }
  }
  function renderGenericNumbers() {
    els.numbers.innerHTML = '';
    for (var i = 0; i < 5; i++) {
      var n = rand(1, 99);
      var span = document.createElement('span');
      span.className = 'num';
      span.textContent = n;
      els.numbers.appendChild(span);
    }
  }

  function buildSignal() {
    switch (game.type) {
      case 'roulette': {
        var strategy = pick(['COLUNA', 'DÚZIA', 'COR', 'PAR/ÍMPAR', 'METADE']);
        if (strategy === 'COLUNA') {
          var cols = pick(['1ª e 2ª', '2ª e 3ª', '1ª e 3ª']);
          return { title: 'ENTRADA CONFIRMADA - COLUNA', value: 'Colunas: ' + cols, protection: 'Proteja no ZERO' };
        }
        if (strategy === 'DÚZIA') {
          var dz = pick(['1ª e 2ª', '2ª e 3ª', '1ª e 3ª']);
          return { title: 'ENTRADA CONFIRMADA - DÚZIA', value: 'Dúzias: ' + dz, protection: 'Proteja no ZERO' };
        }
        if (strategy === 'COR') {
          var cor = pick(['VERMELHO', 'PRETO']);
          return { title: 'ENTRADA CONFIRMADA - COR', value: 'Apostar no ' + cor, protection: 'Até 3 proteções' };
        }
        if (strategy === 'PAR/ÍMPAR') {
          return { title: 'ENTRADA CONFIRMADA', value: 'Apostar em ' + pick(['PAR', 'ÍMPAR']), protection: 'Até 3 proteções' };
        }
        return { title: 'ENTRADA CONFIRMADA', value: pick(['1 a 18', '19 a 36']), protection: 'Até 2 proteções' };
      }
      case 'crash': {
        var mult = (Math.random() * 2.5 + 1.3).toFixed(1);
        return { title: 'ENTRADA CONFIRMADA', value: 'Saia em ' + mult + 'x', protection: String(rand(2, 3)) };
      }
      case 'bacbo': {
        return {
          title: 'ENTRADA CONFIRMADA',
          value: 'APOSTAR NO ' + pick(['VERMELHO', 'AZUL']) + '\nNÃO ESQUEÇA\nPROTEJA O EMPATE',
          protection: 'ATÉ 3 PROTEÇÕES'
        };
      }
      case 'mines': {
        var mines = rand(3, 5);
        var safe = rand(3, 6);
        return { title: 'ENTRADA CONFIRMADA - MINES', value: mines + ' minas / ' + safe + ' seguras', protection: 'Saia após ' + safe + ' cliques' };
      }
      case 'slot':
      default: {
        var spins = rand(8, 15);
        var turbo = rand(4, 8);
        return {
          title: 'ENTRADA CONFIRMADA - SLOT',
          value: spins + ' giros normais\n' + turbo + ' giros turbo',
          protection: 'Até 2 proteções'
        };
      }
    }
  }

  function validUntil(minutesFromNow) {
    var d = new Date(Date.now() + minutesFromNow * 60000);
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }

  function renderNumbers() {
    if (game.type === 'roulette') renderRouletteNumbers();
    else renderGenericNumbers();
  }

  // Ciclo de sinal
  var timer = null;
  function startSearching() {
    // estado "buscando"
    els.status.className = 'signal-status searching';
    els.statusText.textContent = 'BUSCANDO SINAIS...';
    els.entry.classList.remove('confirmed');
    els.entry.textContent = '- - -';
    els.value.textContent = '- - -';
    els.protection.textContent = '- - -';
    renderNumbers();

    var searchSec = rand(6, 12);
    els.countdown.textContent = 'AGUARDE ' + searchSec + 's';
    var remain = searchSec;
    var searchTimer = setInterval(function () {
      remain--;
      if (remain <= 0) { clearInterval(searchTimer); confirmSignal(); return; }
      els.countdown.textContent = 'AGUARDE ' + remain + 's';
    }, 1000);
  }

  function confirmSignal() {
    var s = buildSignal();
    els.status.className = 'signal-status found';
    els.statusText.textContent = 'SINAL ENCONTRADO';
    els.entry.classList.add('confirmed');
    els.entry.textContent = s.title;
    els.value.innerHTML = s.value.replace(/\n/g, '<br>');
    els.protection.innerHTML = s.protection.replace(/\n/g, '<br>');
    renderNumbers();

    var validMin = rand(2, 5);
    var validSec = validMin * 60;
    els.countdown.innerHTML = 'VÁLIDO ATÉ ' + validUntil(validMin);
    var remain = validSec;
    timer = setInterval(function () {
      remain--;
      if (remain <= 0) { clearInterval(timer); startSearching(); return; }
      if (remain % 10 === 0) { /* refresh UI */ }
    }, 1000);
  }

  // Início
  startSearching();
})();
