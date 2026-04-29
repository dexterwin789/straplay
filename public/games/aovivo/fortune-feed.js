// Fortune Roulette real feed (Pragmatic PP_270).
// Same contract used by french-feed.js so the existing aovivo page works.
(function () {
  'use strict';

  var GAME_CODE = 'oficial-pragmatic-live-pp-270';
  var ENDPOINT = '/api/roulette/pragmatic/signals?game_code=' + encodeURIComponent(GAME_CODE);
  var listeners = {};
  var refreshMs = 10000;
  var refreshTimer = null;

  window.io = function () {
    return {
      on: function (evt, cb) { (listeners[evt] = listeners[evt] || []).push(cb); },
      emit: function () {},
      connect: function () { refresh(); },
      disconnect: function () { stopRefresh(); }
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
    var computed = moneyStats(history);
    var money = {
      gains_cents: Number.isFinite(Number(stats.gains_cents)) ? Number(stats.gains_cents) : computed.gains_cents,
      losses_cents: Number.isFinite(Number(stats.losses_cents)) ? Number(stats.losses_cents) : computed.losses_cents,
      net_cents: Number.isFinite(Number(stats.net_cents)) ? Number(stats.net_cents) : computed.net_cents
    };
    if (payload.refresh_ms) refreshMs = Math.max(8000, Math.min(30000, parseInt(payload.refresh_ms, 10) || refreshMs));
    var numbers = numberList(history).slice(0, 10);
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
      fire('sinalStatus', payload.msg || 'Aguardando jogadas reais da Fortune Roulette');
      return;
    }
    fire('sinalGerado', {
      sinalgerado: 'ENTRADA POR NUMEROS',
      tipo: 'Numeros:',
      msg: signal.join(' - '),
      protecao: payload.msg || 'Sinal ativo da Fortune Roulette',
      gales: String(stats.hit_rate || 0) + '%'
    });
  }

  function refresh() {
    stopRefresh();
    fetch(ENDPOINT, { cache: 'no-store' })
      .then(function (res) { return res.json(); })
      .then(applyPayload)
      .catch(function (err) {
        fire('resultsUpdateAovivo', []);
        fire('statsUpdateFrench', { greens: 0, reds: 0, gains_cents: 0, losses_cents: 0, net_cents: 0, hit_rate: 0 });
        fire('resetSinal');
        fire('sinalStatus', err.message || 'Sem dados reais da Fortune Roulette agora');
      })
      .finally(scheduleRefresh);
  }

  function stopRefresh() {
    if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = null; }
  }
  function scheduleRefresh() {
    stopRefresh();
    if (document.hidden) return;
    refreshTimer = setTimeout(refresh, refreshMs);
  }

  document.addEventListener('DOMContentLoaded', refresh);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stopRefresh(); else refresh();
  });
})();
