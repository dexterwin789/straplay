// Roleta Brasileira feed for the first app roulette page.
// Keeps the old page contract: io().on('resultsUpdateAovivo' | 'sinalGerado' | 'resetSinal').
(function () {
  'use strict';

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

  function fallbackDisplaySignal(payload, signal, history) {
    var display = payload.signal_display;
    if (display && typeof display === 'object') {
      return {
        sinalgerado: display.sinalgerado || display.headline || 'ENTRADA CONFIRMADA',
        tipo: display.tipo || 'Sinal:',
        msg: display.msg || display.signal || signal.join(' - '),
        protecao: display.protecao || display.protection || payload.msg || 'Sinal ativo da Roleta Brasileira',
        gales: display.gales || display.gale || String((payload.stats && payload.stats.hit_rate) || 0) + '%'
      };
    }
    var last = parseInt((history[0] && history[0].number) || signal[0] || 0, 10) || 0;
    var mode = Math.abs(last + signal.length) % 4;
    if (mode === 1) {
      return { sinalgerado: 'COBERTURA DE VIZINHOS', tipo: 'Vizinhos:', msg: signal.slice(0, 5).join(' - '), protecao: payload.msg || 'Base no último resultado', gales: 'Até 3 proteções' };
    }
    if (mode === 2) {
      var dozen = last === 0 ? 1 : Math.ceil(last / 12);
      return { sinalgerado: 'ENTRADA POR DÚZIA', tipo: 'Dúzia:', msg: dozen + 'ª dúzia + ' + signal.slice(0, 4).join(' - '), protecao: 'Cobrir zero', gales: 'Até 2 proteções' };
    }
    if (mode === 3) {
      var column = last === 0 ? 1 : ((last - 1) % 3) + 1;
      return { sinalgerado: 'ENTRADA POR COLUNA', tipo: 'Coluna:', msg: column + 'ª coluna + ' + signal.slice(0, 4).join(' - '), protecao: payload.msg || 'Sinal ativo da Roleta Brasileira', gales: 'Até 3 proteções' };
    }
    return { sinalgerado: 'ENTRADA POR NÚMEROS', tipo: 'Números:', msg: signal.join(' - '), protecao: payload.msg || 'Sinal ativo da Roleta Brasileira', gales: String((payload.stats && payload.stats.hit_rate) || 0) + '%' };
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
    if (payload.refresh_ms) refreshMs = Math.max(2500, Math.min(10000, parseInt(payload.refresh_ms, 10) || refreshMs));
    var numbers = numberList(history).slice(0, 10);
    var rawSignal = payload.current_signal || [];
    var signal = (Array.isArray(rawSignal) ? rawSignal : (rawSignal.numbers || [])).map(String);

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
      fire('sinalStatus', payload.msg || 'Aguardando jogadas reais da Roleta Brasileira');
      return;
    }

    var display = fallbackDisplaySignal(payload, signal, history);
    if (window.VNBSignalSync) {
      display = window.VNBSignalSync.attach(display, payload, {
        game: 'roleta-brasileira',
        roundMs: 30000,
        entryWindowMs: 14000,
        holdMs: 3 * 60 * 1000,
        minUsableMs: 12000
      });
    }
    fire('sinalGerado', display);
  }

  function refresh() {
    stopRefresh();
    fetch('/api/roulette/french/signals', { cache: 'no-store' })
      .then(function (res) { return res.json(); })
      .then(applyPayload)
      .catch(function (err) {
        fire('resultsUpdateAovivo', []);
        fire('statsUpdateFrench', { greens: 0, reds: 0, gains_cents: 0, losses_cents: 0, net_cents: 0, hit_rate: 0 });
        fire('resetSinal');
        fire('sinalStatus', err.message || 'Sem dados da Roleta Brasileira agora');
      })
      .finally(scheduleRefresh);
  }

  function stopRefresh() {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
  }

  function scheduleRefresh() {
    stopRefresh();
    if (document.hidden) return;
    refreshTimer = setTimeout(refresh, refreshMs);
  }

  document.addEventListener('DOMContentLoaded', function () {
    refresh();
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stopRefresh();
    else refresh();
  });
})();
