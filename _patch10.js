// Fix #3: hide visible scrollbar on all game pages while keeping scroll functional.
// Append a <style id="__VNB_HIDE_SCROLLBAR__"> block right after the existing __VNB_SCROLL_FIX__ (or __VNB_IFRAME_FIX__ if present).
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, 'public', 'games');
const games = fs.readdirSync(ROOT).filter(n => fs.statSync(path.join(ROOT, n)).isDirectory());

const HIDE_BLOCK = `<style id="__VNB_HIDE_SCROLLBAR__">html{scrollbar-width:none;-ms-overflow-style:none}html::-webkit-scrollbar,body::-webkit-scrollbar{width:0!important;height:0!important;display:none!important}body{-webkit-overflow-scrolling:touch}iframe{scrollbar-width:none}iframe::-webkit-scrollbar{display:none!important}</style>`;

let fixed = 0;
for (const game of games) {
  const p = path.join(ROOT, game, 'index.html');
  if (!fs.existsSync(p)) continue;
  let html = fs.readFileSync(p, 'utf8');
  if (html.includes('__VNB_HIDE_SCROLLBAR__')) {
    console.log('SKIP', game, '(already has hide scrollbar block)');
    continue;
  }
  // Insert right after __VNB_SCROLL_FIX__ closing </style>
  const marker = '__VNB_SCROLL_FIX__';
  const idx = html.indexOf(marker);
  if (idx === -1) {
    console.log('SKIP', game, '(no scroll fix marker)');
    continue;
  }
  const closeIdx = html.indexOf('</style>', idx);
  if (closeIdx === -1) {
    console.log('SKIP', game, '(no </style> after marker)');
    continue;
  }
  const insertAt = closeIdx + '</style>'.length;
  html = html.slice(0, insertAt) + '\n' + HIDE_BLOCK + html.slice(insertAt);
  fs.writeFileSync(p, html);
  console.log('FIXED', game);
  fixed++;
}
console.log(`${fixed}/${games.length} game pages updated.`);
