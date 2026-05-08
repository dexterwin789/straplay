(function () {
  'use strict';

  var clockOffsetMs = 0;
  var syncedAt = 0;
  var DEFAULT_HOLD_MS = 45000;

  function isFiniteNumber(value) {
    return Number.isFinite(Number(value));
  }

  function parseTime(value) {
    var ts = Date.parse(value || '');
    return Number.isFinite(ts) ? ts : 0;
  }

  function rememberServerTime(value) {
    var ts = parseTime(value);
    if (!ts) return;
    clockOffsetMs = ts - Date.now();
    syncedAt = Date.now();
  }

  function now() {
    return Date.now() + clockOffsetMs;
  }

  function syncClock() {
    return fetch('/api/time', { cache: 'no-store' })
      .then(function (res) { return res.json(); })
      .then(function (payload) { rememberServerTime(payload && payload.server_time); })
      .catch(function () {});
  }

  function detectInterval(history, fallbackMs) {
    var rows = Array.isArray(history) ? history : [];
    if (rows.length >= 2) {
      var first = parseTime(rows[0] && rows[0].created_at);
      var second = parseTime(rows[1] && rows[1].created_at);
      var diff = Math.abs(first - second);
      if (diff >= 8000 && diff <= 120000) return diff;
    }
    return fallbackMs || 30000;
  }

  function signalText(data) {
    return [data && data.sinalgerado, data && data.tipo, data && data.msg, data && data.protecao, data && data.gales]
      .filter(Boolean)
      .join('|');
  }

  function parseValidUntilText(text, baseNow) {
    var match = String(text || '').match(/(\d{1,2}):(\d{2})/);
    if (!match) return 0;
    var base = new Date(baseNow || now());
    var target = new Date(base.getTime());
    target.setHours(parseInt(match[1], 10), parseInt(match[2], 10), 0, 0);
    if (target.getTime() <= base.getTime() - 60000) target.setDate(target.getDate() + 1);
    return target.getTime();
  }

  function formatBrtTime(timestamp) {
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(new Date(timestamp));
    } catch (err) {
      var date = new Date(timestamp);
      return String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
    }
  }

  function metaFromPayload(payload, config) {
    config = config || {};
    rememberServerTime(payload && payload.server_time);
    var history = Array.isArray(payload && payload.history) ? payload.history : [];
    var latest = history[0] || null;
    var latestAt = parseTime(latest && latest.created_at);
    var roundMs = detectInterval(history, config.roundMs || 30000);
    var serverNow = parseTime(payload && payload.server_time) || now();
    var entryWindowMs = config.entryWindowMs || Math.min(Math.max(Math.round(roundMs * 0.45), 7000), 16000);
    var validUntil = latestAt ? latestAt + roundMs + (config.graceMs || 1500) : serverNow + (config.holdMs || DEFAULT_HOLD_MS);
    var entryUntil = latestAt ? latestAt + entryWindowMs : serverNow + entryWindowMs;
    return {
      latestAt: latestAt,
      roundMs: roundMs,
      serverNow: serverNow,
      entryUntil: entryUntil,
      validUntil: validUntil,
      entryLate: !!latestAt && serverNow > entryUntil && serverNow < validUntil,
      nextRefreshMs: latestAt ? Math.max(1200, Math.min(8000, validUntil - serverNow + 600)) : 2500,
      keyPrefix: [config.game || 'game', latest && (latest.id || latest.created_at || latest.number || latest.result || latest.multiplier)].filter(Boolean).join(':')
    };
  }

  function attach(data, payload, config) {
    var meta = metaFromPayload(payload, config);
    var copy = Object.assign({}, data || {});
    copy._signalKey = meta.keyPrefix + ':' + signalText(copy);
    copy._validUntil = meta.validUntil;
    copy._entryUntil = meta.entryUntil;
    copy._entryLate = meta.entryLate;
    copy._nextRefreshMs = meta.nextRefreshMs;
    copy._serverTime = meta.serverNow;
    copy.timestamp = copy.timestamp || now();
    return copy;
  }

  function normalize(data, options) {
    if (!data) return null;
    options = options || {};
    var copy = Object.assign({}, data);
    var baseNow = now();
    if (!isFiniteNumber(copy._validUntil)) {
      copy._validUntil = parseValidUntilText(copy.protecao, baseNow) || ((copy.timestamp || baseNow) + (options.holdMs || DEFAULT_HOLD_MS));
    }
    copy._signalKey = copy._signalKey || signalText(copy);
    copy.timestamp = copy.timestamp || baseNow;
    return copy;
  }

  function isActive(data) {
    var normalized = normalize(data);
    return !!normalized && now() < Number(normalized._validUntil || 0);
  }

  function shouldReplace(current, incoming) {
    var active = normalize(current);
    var next = normalize(incoming);
    if (!next) return false;
    if (Number(next._validUntil || 0) && now() >= Number(next._validUntil)) return false;
    if (next._entryLate && !isActive(active)) return false;
    if (isActive(active) && active._signalKey !== next._signalKey) return false;
    return true;
  }

  window.VNBSignalSync = {
    STATUS_WAITING: 'SINCRONIZANDO PRÓXIMA RODADA...',
    attach: attach,
    formatBrtTime: formatBrtTime,
    isActive: isActive,
    metaFromPayload: metaFromPayload,
    normalize: normalize,
    now: now,
    rememberServerTime: rememberServerTime,
    shouldReplace: shouldReplace,
    syncClock: syncClock
  };

  syncClock();
})();