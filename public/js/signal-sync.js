(function () {
  'use strict';

  var clockOffsetMs = 0;
  var syncedAt = 0;
  var DEFAULT_HOLD_MS = 3 * 60 * 1000;
  var DEFAULT_MIN_USABLE_MS = 12 * 1000;

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

  function maxTextWindowMs(config) {
    var holdMs = (config && config.holdMs) || DEFAULT_HOLD_MS;
    return (config && config.maxTextWindowMs) || Math.max(holdMs * 2, 10 * 60 * 1000);
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
    var validUntil = serverNow + (config.holdMs || DEFAULT_HOLD_MS);
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
    config = config || {};
    var meta = metaFromPayload(payload, config);
    var copy = Object.assign({}, data || {});
    var minUsableMs = config.minUsableMs || DEFAULT_MIN_USABLE_MS;
    var displayValidUntil = parseValidUntilText(copy.protecao || copy.protection, meta.serverNow);
    var displayRemainingMs = displayValidUntil ? displayValidUntil - meta.serverNow : 0;
    var invalidDisplayClock = !!displayValidUntil && (displayRemainingMs < minUsableMs || displayRemainingMs > maxTextWindowMs(config));
    if (displayValidUntil && !invalidDisplayClock) {
      meta.validUntil = displayValidUntil;
      meta.entryLate = false;
    }
    if (invalidDisplayClock || meta.validUntil - meta.serverNow < minUsableMs) {
      meta.validUntil = meta.serverNow + (config.holdMs || DEFAULT_HOLD_MS);
      meta.entryLate = false;
    }
    copy._signalKey = meta.keyPrefix + ':' + signalText(copy);
    copy._validUntil = meta.validUntil;
    copy._entryUntil = meta.entryUntil;
    copy._entryLate = meta.entryLate;
    copy._nextRefreshMs = meta.nextRefreshMs;
    copy._serverTime = meta.serverNow;
    copy.timestamp = copy.timestamp || now();
    copy.protecao = ensureValidUntilText(copy.protecao, meta.validUntil, invalidDisplayClock);
    return copy;
  }

  function hasClockText(text) {
    return /(\d{1,2}):(\d{2})/.test(String(text || ''));
  }

  function ensureValidUntilText(text, validUntil, replaceExisting) {
    var base = String(text || '').trim();
    if (!validUntil || !Number.isFinite(Number(validUntil))) return base;
    var label = 'Válido até ' + formatBrtTime(validUntil);
    var validUntilPattern = /(\s*-\s*)?V[ÁA]LIDO\s+AT[ÉE]\s+\d{1,2}:\d{2}/i;
    if (replaceExisting && validUntilPattern.test(base)) {
      return base.replace(validUntilPattern, function (match) {
        return /^\s*-\s*/.test(match) ? ' - ' + label : label;
      });
    }
    if (hasClockText(base)) return base;
    return base ? base + ' - ' + label : label;
  }

  function normalize(data, options) {
    if (!data) return null;
    options = options || {};
    var copy = Object.assign({}, data);
    var baseNow = now();
    var textValidUntil = parseValidUntilText(copy.protecao, baseNow);
    var textRemainingMs = textValidUntil ? textValidUntil - baseNow : 0;
    var invalidTextClock = !!textValidUntil && (textRemainingMs < DEFAULT_MIN_USABLE_MS || textRemainingMs > maxTextWindowMs(options));
    if (!isFiniteNumber(copy._validUntil)) {
      copy._validUntil = !invalidTextClock && textValidUntil ? textValidUntil : ((copy.timestamp || baseNow) + (options.holdMs || DEFAULT_HOLD_MS));
    } else if (!invalidTextClock && textValidUntil && textValidUntil > Number(copy._validUntil)) {
      copy._validUntil = textValidUntil;
    }
    copy._signalKey = copy._signalKey || signalText(copy);
    copy.timestamp = copy.timestamp || baseNow;
    copy.protecao = ensureValidUntilText(copy.protecao, copy._validUntil, invalidTextClock);
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
    if (!isUsable(next)) return false;
    if (isActive(active) && active._signalKey !== next._signalKey) return false;
    return true;
  }

  function remainingMs(data) {
    var normalized = normalize(data);
    if (!normalized) return 0;
    return Math.max(0, Number(normalized._validUntil || 0) - now());
  }

  function isUsable(data, minMs) {
    return remainingMs(data) >= (minMs || DEFAULT_MIN_USABLE_MS);
  }

  window.VNBSignalSync = {
    STATUS_WAITING: 'SINCRONIZANDO PRÓXIMA RODADA...',
    attach: attach,
    formatBrtTime: formatBrtTime,
    isActive: isActive,
    isUsable: isUsable,
    metaFromPayload: metaFromPayload,
    normalize: normalize,
    now: now,
    remainingMs: remainingMs,
    rememberServerTime: rememberServerTime,
    shouldReplace: shouldReplace,
    syncClock: syncClock
  };

  syncClock();
})();