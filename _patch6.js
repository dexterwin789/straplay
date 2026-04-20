// _patch6.js — replace • with - in marquee, add scroll-overlay on iframes
const fs = require('fs');
const path = require('path');

const GAMES = ['aovivo','aviator','bacbo','hack-double-fortune','hack-dragon','hack-mines','hack-mouse','hack-ox','hack-rabbit','hack-tiger'];
const ROOT = path.join(__dirname, 'public');

const OVERLAY_CSS_ID = '__VNB_IFRAME_SCROLL__';
const OVERLAY_CSS = `<style id="${OVERLAY_CSS_ID}">
.vnb-iframe-wrap{position:relative;display:inline-block;width:100%;text-align:center}
.vnb-iframe-wrap iframe{position:relative;z-index:1}
.vnb-iframe-catcher{position:absolute;inset:0;z-index:2;cursor:pointer;background:transparent;display:flex;align-items:center;justify-content:center}
.vnb-iframe-catcher::before{content:"Clique para jogar";background:rgba(0,0,0,.55);color:#fff;padding:10px 22px;border-radius:999px;font:600 14px system-ui,Arial,sans-serif;letter-spacing:.3px}
.vnb-iframe-catcher.off{display:none}
</style>`;

const OVERLAY_JS_ID = '__VNB_IFRAME_SCROLL_JS__';
const OVERLAY_JS = `<script id="${OVERLAY_JS_ID}">
(function(){
  function wrap(){
    document.querySelectorAll('iframe#iframe, iframe.iframe').forEach(function(f){
      if(f.parentElement && f.parentElement.classList.contains('vnb-iframe-wrap')) return;
      var w=document.createElement('div'); w.className='vnb-iframe-wrap';
      f.parentNode.insertBefore(w,f); w.appendChild(f);
      var c=document.createElement('div'); c.className='vnb-iframe-catcher';
      w.appendChild(c);
      c.addEventListener('click',function(){c.classList.add('off');});
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',wrap); else wrap();
})();
</script>`;

function fix(file) {
  let s = fs.readFileSync(file, 'utf8');
  const orig = s;

  // 1. Marquee separator • → -
  s = s.replace(/MULTIPLICADOR DE 3\.500X ATIVADO\s*•\s*FUNCIONANDO APENAS NA PLATAFORMA ABAIXO\s*•\s*NOVA BRECHA DETECTADA\s*•\s*FAÇA SUA ENTRADA IMEDIATAMENTE/g,
                'MULTIPLICADOR DE 3.500X ATIVADO - FUNCIONANDO APENAS NA PLATAFORMA ABAIXO - NOVA BRECHA DETECTADA - FAÇA SUA ENTRADA IMEDIATAMENTE');

  // 2. Iframe scroll overlay — inject CSS + JS once
  if (/iframe[^>]*id=["']iframe["']/i.test(s) || /iframe[^>]*class=["']iframe["']/i.test(s)) {
    if (!s.includes(OVERLAY_CSS_ID)) {
      s = s.replace(/<\/head>/i, OVERLAY_CSS + '\n</head>');
    }
    if (!s.includes(OVERLAY_JS_ID)) {
      s = s.replace(/<\/body>/i, OVERLAY_JS + '\n</body>');
    }
  }

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
