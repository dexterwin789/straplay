// _patch7.js — remove iframe overlay (patch6 was bad UX)
const fs = require('fs');
const path = require('path');

const GAMES = ['aovivo','aviator','bacbo','hack-double-fortune','hack-dragon','hack-mines','hack-mouse','hack-ox','hack-rabbit','hack-tiger'];
const ROOT = path.join(__dirname, 'public');

function fix(file) {
  let s = fs.readFileSync(file, 'utf8');
  const orig = s;

  // Remove the CSS overlay block
  s = s.replace(/<style id="__VNB_IFRAME_SCROLL__">[\s\S]*?<\/style>\s*/g, '');
  // Remove the JS overlay block
  s = s.replace(/<script id="__VNB_IFRAME_SCROLL_JS__">[\s\S]*?<\/script>\s*/g, '');

  if (s !== orig) {
    fs.writeFileSync(file, s, 'utf8');
    return true;
  }
  return false;
}

const files = [path.join(ROOT, 'index.html')];
for (const slug of GAMES) files.push(path.join(ROOT, 'games', slug, 'index.html'));

let touched = 0;
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const ok = fix(f);
  console.log((ok ? 'CLEANED' : 'unchanged').padEnd(10), path.relative(ROOT, f));
  if (ok) touched++;
}
console.log('\n' + touched + '/' + files.length + ' cleaned.');
