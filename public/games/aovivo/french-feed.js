// French Roulette real feed for the first app roulette page.
// Keeps the old page contract: io().on('resultsUpdateAovivo' | 'sinalGerado' | 'resetSinal').
(function () {
  'use strict';

  var listeners = {};
  var refreshMs = 10000;

  window.io = function () {
    return {
      on: function (evt, cb) { (listeners[evt] = listeners[evt] || []).push(cb); },
      emit: function () {},
      connect: function () { refresh(); },
      disconnect: function () {}
    };
  };

  function fire(evt, data) {
    (listeners[evt] || []).forEach(function (cb) {
      try { cb(data); } catch (err) { console.error(err); }
    });
  }

  function numberList(rows) {
    return (rows || [])
      .map(function (row) { return row && row.number; })
      .filter(function (n) { return n !== null && n !== undefined && n !== ''; })
      .map(String);
  }

  function moneyStats(history) {
    return (history || []).reduce(function (acc, row) {
      var bet = parseInt(row && row.bet_cents || 0, 10) || 0;
      var win = parseInt(row && row.win_cents || 0, 10) || 0;
      if (win >= bet) acc.gains_cents += win - bet;
      if (bet > win) acc.losses_cents += bet - win;
      acc.net_cents += win - bet;
      return acc;
    }, { gains_cents: 0, losses_cents: 0, net_cents: 0 });
  }

  function applyPayload(payload) {
    if (!payload || !payload.ok) throw new Error(payload && payload.msg ? payload.msg : 'Nao foi possivel carregar sinais.');

    var history = payload.history || [];
    var stats = payload.stats || {};
    var computedMoney = moneyStats(history);
    var money = {
      gains_cents: Number.isFinite(Number(stats.gains_cents)) ? Number(stats.gains_cents) : computedMoney.gains_cents,
      losses_cents: Number.isFinite(Number(stats.losses_cents)) ? Number(stats.losses_cents) : computedMoney.losses_cents,
      net_cents: Number.isFinite(Number(stats.net_cents)) ? Number(stats.net_cents) : computedMoney.net_cents
    };
    var numbers = numberList(history).slice(0, 5);
    var signal = (payload.current_signal || []).map(String);

    fire('resultsUpdateAovivo', numbers);
    fire('statsUpdateFrench', {
      greens: stats.greens || 0,
      reds: stats.reds || 0,
      hit_rate: stats.hit_rate || 0,
      gains_cents: money.gains_cents,
      losses_cents: money.losses_cents,
      net_cents: money.net_cents
    });

    if (!signal.length) {
      fire('resetSinal');
      fire('sinalStatus', payload.msg || 'Aguardando jogadas reais da French Roulette');
      return;
    }

    fire('sinalGerado', {
      sinalgerado: 'ENTRADA POR NUMEROS',
      tipo: 'Numeros:',
      msg: signal.join(' - '),
      protecao: payload.msg || 'Sinal ativo da French Roulette',
      gales: String(stats.hit_rate || 0) + '%'
    });
  }

  function refresh() {
    fetch('/api/roulette/french/signals', { cache: 'no-store' })
      .then(function (res) { return res.json(); })
      .then(applyPayload)
      .catch(function (err) {
        fire('resultsUpdateAovivo', []);
        fire('statsUpdateFrench', { greens: 0, reds: 0, gains_cents: 0, losses_cents: 0, net_cents: 0, hit_rate: 0 });
        fire('resetSinal');
        fire('sinalStatus', err.message || 'Sem dados reais da French Roulette agora');
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    refresh();
    setInterval(refresh, refreshMs);
  });
})();
