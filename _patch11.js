// Fix #4: upgrade scrollbar hide block (use *::-webkit-scrollbar to beat inline ::-webkit-scrollbar{width:7px})
// Fix #5: shrink .vnb-toast on desktop via media query (mobile keeps 92vw)
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, 'public', 'games');
const games = fs.readdirSync(ROOT).filter(n => fs.statSync(path.join(ROOT, n)).isDirectory());

const NEW_HIDE = `<style id="__VNB_HIDE_SCROLLBAR__">html,body{scrollbar-width:none!important;-ms-overflow-style:none!important}html::-webkit-scrollbar,body::-webkit-scrollbar,*::-webkit-scrollbar{width:0!important;height:0!important;display:none!important;background:transparent!important}body{-webkit-overflow-scrolling:touch}iframe{scrollbar-width:none}</style>`;

const OLD_HIDE_RE = /<style id="__VNB_HIDE_SCROLLBAR__">[\s\S]*?<\/style>/;

// Shrink desktop toast — use attribute selector [style*="vnb-toast"] won't work; do a regex insert inside the inline style rule.
// Simpler: append a media query block right after the .vnb-toast{...} rule.
const TOAST_MEDIA = '@media(min-width:768px){.vnb-toast{max-width:420px!important;width:auto!important;padding:10px 16px!important;font-size:13px!important;border-radius:8px!important}}';

let updated = 0;
for (const game of games) {
  const p = path.join(ROOT, game, 'index.html');
  if (!fs.existsSync(p)) continue;
  let html = fs.readFileSync(p, 'utf8');
  let changed = false;

  // Replace hide block
  if (OLD_HIDE_RE.test(html) && !html.includes('*::-webkit-scrollbar')) {
    html = html.replace(OLD_HIDE_RE, NEW_HIDE);
    changed = true;
  }

  // Inject toast media query (only once)
  if (!html.includes('@media(min-width:768px){.vnb-toast')) {
    const toastRe = /(\.vnb-toast\{[^}]*\})/;
    if (toastRe.test(html)) {
      html = html.replace(toastRe, '$1' + TOAST_MEDIA);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(p, html);
    console.log('UPDATED', game);
    updated++;
  } else {
    console.log('SKIP   ', game);
  }
}
console.log(`${updated}/${games.length} pages updated.`);
