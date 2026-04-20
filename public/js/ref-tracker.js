// ref-tracker.js — Captures ?ref= from URL, persists in localStorage,
// and propagates to all internal links + iframe to vemnabet.bet.
// Works on every page when included in the footer.
(function () {
  var KEY = 'vnb_ref';
  var TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

  function now() { return Date.now(); }

  function getRefFromUrl() {
    try {
      var p = new URLSearchParams(window.location.search);
      var r = p.get('ref');
      if (r) return String(r).trim().slice(0, 64);
    } catch (e) {}
    return null;
  }

  function saveRef(ref) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ref: ref, ts: now() }));
    } catch (e) {}
  }

  function loadRef() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || !obj.ref) return null;
      if (now() - (obj.ts || 0) > TTL_MS) {
        localStorage.removeItem(KEY);
        return null;
      }
      return obj.ref;
    } catch (e) { return null; }
  }

  function appendRef(url, ref) {
    if (!url || !ref) return url;
    try {
      var abs = url.indexOf('://') > -1;
      var u = new URL(url, abs ? undefined : window.location.origin);
      if (!u.searchParams.get('ref')) {
        u.searchParams.set('ref', ref);
      }
      return abs ? u.toString() : (u.pathname + u.search + u.hash);
    } catch (e) {
      // Fallback naive concat
      var sep = url.indexOf('?') > -1 ? '&' : '?';
      if (url.indexOf('ref=') > -1) return url;
      return url + sep + 'ref=' + encodeURIComponent(ref);
    }
  }

  function propagate(ref) {
    if (!ref) return;
    // Internal game links
    var links = document.querySelectorAll('a[href]');
    links.forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href) return;
      if (href.indexOf('#') === 0 || href.indexOf('javascript:') === 0) return;
      // Propagate to same-origin links and to vemnabet.bet
      if (href.indexOf('://') === -1 || href.indexOf('vemnabet.bet') > -1) {
        a.setAttribute('href', appendRef(href, ref));
      }
    });
    // Iframes pointing to vemnabet.bet
    var frames = document.querySelectorAll('iframe[src]');
    frames.forEach(function (f) {
      var src = f.getAttribute('src');
      if (!src) return;
      if (src.indexOf('vemnabet.bet') > -1) {
        f.setAttribute('src', appendRef(src, ref));
      }
    });
  }

  // Capture + persist
  var urlRef = getRefFromUrl();
  if (urlRef) saveRef(urlRef);
  var ref = urlRef || loadRef();

  // Expose for other scripts
  window.VNB_REF = ref || null;

  if (ref) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { propagate(ref); });
    } else {
      propagate(ref);
    }
  }
})();
