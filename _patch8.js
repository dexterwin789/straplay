// _patch8.js — fix notification width + deduplicate vnb-toast blocks
const fs = require('fs');
const path = require('path');

const GAMES = ['aovivo','aviator','bacbo','hack-double-fortune','hack-dragon','hack-mines','hack-mouse','hack-ox','hack-rabbit','hack-tiger'];
const ROOT = path.join(__dirname, 'public', 'games');

let touched = 0;
for (const slug of GAMES) {
  const file = path.join(ROOT, slug, 'index.html');
  if (!fs.existsSync(file)) continue;
  let s = fs.readFileSync(file, 'utf8');
  const orig = s;

  // 1. Add width:92vw to .vnb-toast (replace max-width:92vw with width:92vw;max-width:92vw)
  // The current CSS has: max-width:92vw but no width
  s = s.replace(
    /\.vnb-toast\{([^}]*?)max-width:92vw([^}]*?)\}/g,
    (match, before, after) => {
      if (before.includes('width:92vw') || after.includes('width:92vw')) return match;
      return `.vnb-toast{${before}width:92vw;max-width:92vw${after}}`;
    }
  );

  // 2. Remove duplicate vnb-toast style+script blocks (keep first, remove second)
  // Pattern: the SECOND occurrence of <style> containing .vnb-toast{ ... </style> + <script> with __vnbToast ... </script>
  let count = 0;
  s = s.replace(/<style>\s*\.vnb-toast\{[\s\S]*?<\/style>\s*<script>\s*\(function\(\)\{\s*if\(window\.__vnbToast\)[\s\S]*?<\/script>/g, (match) => {
    count++;
    return count === 1 ? match : ''; // keep first, remove duplicates
  });

  if (s !== orig) {
    fs.writeFileSync(file, s, 'utf8');
    console.log('FIXED'.padEnd(10), slug, `(removed ${count - 1} duplicate block(s))`);
    touched++;
  } else {
    console.log('unchanged'.padEnd(10), slug);
  }
}
console.log('\n' + touched + '/' + GAMES.length + ' fixed.');
