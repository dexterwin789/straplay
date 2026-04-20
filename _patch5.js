// _patch5.js — favicon + STRAPLAY→VEMNABET + char fixes
const fs = require('fs');
const path = require('path');

const GAMES = ['aovivo','aviator','bacbo','hack-double-fortune','hack-dragon','hack-mines','hack-mouse','hack-ox','hack-rabbit','hack-tiger'];
const ROOT = path.join(__dirname, 'public');

function fix(file) {
  let s = fs.readFileSync(file, 'utf8');
  const orig = s;

  // 1. Replace every existing favicon link with the VemNaBet one
  s = s.replace(/<link\s+rel="icon"[^>]*>/gi, '<link rel="icon" href="/favicon.png" type="image/png">');
  s = s.replace(/<link\s+rel="shortcut icon"[^>]*>/gi, '');
  // Ensure a favicon exists in head
  if (!/rel="icon"/i.test(s)) {
    s = s.replace(/<\/head>/i, '<link rel="icon" href="/favicon.png" type="image/png">\n</head>');
  }

  // 2. Brand replacements (preserve casing for 3 common variants)
  s = s.replace(/STRAPLAY/g, 'VEMNABET');
  s = s.replace(/Stra\s*Play/g, 'VemNaBet');
  s = s.replace(/straplay/g, 'vemnabet');

  // 3. Copyright/mojibake
  s = s.replace(/&copy;\s*VEMNABET\s*Â©/gi, '&copy; VemNaBet');
  s = s.replace(/Â©/g, '©');
  s = s.replace(/Copyright\s*©?\s*(\d{4})\s*-\s*VEMNABET/gi, '© $1 - VemNaBet');

  // 4. Fix the broken "GERAR NOVO SINAL" button text — strip emoji prefixes
  s = s.replace(/<button([^>]*id=["']btn["'][^>]*)>\s*[^\w\s<]+\s*GERAR NOVO SINAL\s*<\/button>/gi,
                '<button$1>GERAR NOVO SINAL</button>');
  s = s.replace(/button\.innerHTML\s*=\s*"[^"]*GERAR NOVO SINAL"\s*\)/g,
                'button.innerHTML = "GERAR NOVO SINAL")');

  // 5. Fix the broken animated-text marquee: remove stray "â\n" and unicode artifacts
  s = s.replace(/MULTIPLICADOR DE 3\.500X ATIVADO[\s\S]{0,12}FUNCIONANDO APENAS NA PLATAFORMA ABAIXO[\s\S]{0,8}NOVA BRECHA DETECTADA[\s\S]{0,8}FA[ÇC]A SUA ENTRADA IMEDIATAMENTE/g,
                'MULTIPLICADOR DE 3.500X ATIVADO • FUNCIONANDO APENAS NA PLATAFORMA ABAIXO • NOVA BRECHA DETECTADA • FAÇA SUA ENTRADA IMEDIATAMENTE');

  // 6. Junk chars from previous patches still present
  s = s.replace(/[\u00A0-\u00A9]\s+GERAR/g, 'GERAR');
  s = s.replace(/🎯\s*GERAR NOVO SINAL/g, 'GERAR NOVO SINAL');
  s = s.replace(/[\u2580-\u259F]+/g, ''); // block drawing chars

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
  if (!fs.existsSync(f)) { console.log('SKIP', f); continue; }
  const ok = fix(f);
  console.log((ok ? 'PATCHED' : 'unchanged').padEnd(10), path.relative(ROOT, f));
  if (ok) touched++;
}
console.log('\n' + touched + '/' + files.length + ' updated.');
