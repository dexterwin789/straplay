// useful-links.js — Fetches per-affiliate "Links Úteis" banners from
// vemnabet.bet based on ?ref= and overrides the 4 .custom-menu slots.
// Behavior:
//  - Hides ALL default banners + title IMMEDIATELY (no flash of defaults).
//  - Reveals only the slots the affiliate configured on vemnabet.bet.
//  - If NO slot is populated, the entire "Links úteis!" section stays hidden.
//  - Empty slots don't hold space → flex auto-centers remaining (1/2/3 items).
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

  function getTitleBlock(menu) {
    if (!menu) return null;
    var prev = menu.previousElementSibling;
    if (prev && prev.classList && prev.classList.contains('titulo-final')) return prev;
    return null;
  }

  function hideAll(menu, title) {
    if (!menu) return;
    menu.style.display = 'none';
    if (title) title.style.display = 'none';
    var containers = menu.querySelectorAll('.image-container');
    containers.forEach(function (c) { c.style.display = 'none'; });
  }

  function showMenu(menu, title) {
    if (!menu) return;
    menu.style.display = ''; // back to CSS default (flex)
    if (title) title.style.display = '';
  }

  function applySlot(container, slot) {
    if (!container || !slot || !slot.image_url) return false;
    var imgs = container.querySelectorAll('img.btn-image');
    if (!imgs.length) return false;
    imgs.forEach(function (img) {
      img.setAttribute('src', slot.image_url);
      if (slot.title) img.setAttribute('alt', slot.title);
    });

    // Render optional title ABOVE the image (idempotent).
    var titleEl = container.querySelector('.useful-title');
    var titleTxt = (slot.title || '').toString().trim();
    if (titleTxt) {
      if (!titleEl) {
        titleEl = document.createElement('div');
        titleEl.className = 'useful-title';
        container.insertBefore(titleEl, container.firstChild);
      }
      titleEl.textContent = titleTxt;
    } else if (titleEl) {
      titleEl.remove();
    }

    container.style.display = '';
    if (slot.target_url) {
      container.style.cursor = 'pointer';
      container.setAttribute('data-useful-href', slot.target_url);
      if (!container.__ulWired) {
        container.addEventListener('click', function () {
          var href = container.getAttribute('data-useful-href');
          if (href) window.open(href, '_blank', 'noopener,noreferrer');
        });
        container.__ulWired = true;
      }
    }
    return true;
  }

  function run() {
    var menu = document.querySelector('.custom-menu');
    if (!menu) return;
    var title = getTitleBlock(menu);

    // Always start clean: no default banners.
    hideAll(menu, title);

    var ref = getRef();
    if (!ref) return; // No ref → section stays hidden

    var url = API_BASE + '/api/public/useful-links?ref=' + encodeURIComponent(ref);
    fetch(url, { credentials: 'omit', cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.ok || !Array.isArray(d.slots)) return;
        var containers = menu.querySelectorAll('.image-container');
        var shown = 0;
        d.slots.forEach(function (s) {
          var idx = (parseInt(s.slot, 10) || 0) - 1;
          if (idx < 0 || idx >= containers.length) return;
          if (applySlot(containers[idx], s)) shown++;
        });
        if (shown > 0) showMenu(menu, title);
      })
      .catch(function () { /* silent → section remains hidden */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
