// useful-links.js — Fetches per-affiliate "Links Úteis" banners from
// vemnabet.bet based on ?ref= and overrides the 4 .custom-menu slots.
(function () {
  'use strict';

  var API_BASE = 'https://vemnabet.bet';

  function getRef() {
    if (window.VNB_REF) return window.VNB_REF;
    try {
      var p = new URLSearchParams(window.location.search);
      var r = p.get('ref');
      if (r) return String(r).trim().slice(0, 64);
    } catch (e) {}
    try {
      var raw = localStorage.getItem('vnb_ref');
      if (raw) {
        var o = JSON.parse(raw);
        if (o && o.ref) return o.ref;
      }
    } catch (e) {}
    return null;
  }

  function applySlot(container, slot) {
    if (!container || !slot || !slot.image_url) return;
    var imgs = container.querySelectorAll('img.btn-image');
    imgs.forEach(function (img) {
      img.setAttribute('src', slot.image_url);
      if (slot.title) img.setAttribute('alt', slot.title);
    });
    // Make clickable
    if (slot.target_url) {
      container.style.cursor = 'pointer';
      container.setAttribute('data-useful-href', slot.target_url);
      // Avoid stacking multiple listeners on re-run
      if (!container.__ulWired) {
        container.addEventListener('click', function () {
          var href = container.getAttribute('data-useful-href');
          if (href) window.open(href, '_blank', 'noopener,noreferrer');
        });
        container.__ulWired = true;
      }
    }
  }

  function run() {
    var ref = getRef();
    if (!ref) return;
    var containers = document.querySelectorAll('.custom-menu .image-container');
    if (!containers || !containers.length) return;

    var url = API_BASE + '/api/public/useful-links?ref=' + encodeURIComponent(ref);
    fetch(url, { credentials: 'omit', cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.ok || !Array.isArray(d.slots)) return;
        d.slots.forEach(function (s) {
          var idx = (parseInt(s.slot, 10) || 0) - 1;
          if (idx < 0 || idx >= containers.length) return;
          applySlot(containers[idx], s);
        });
      })
      .catch(function () { /* silent */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
