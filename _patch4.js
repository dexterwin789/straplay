// _patch4.js — round-4 fixes for all 10 game pages + special mines build
// Run: node _patch4.js
const fs = require('fs');
const path = require('path');

const GAMES = ['aovivo','aviator','bacbo','hack-double-fortune','hack-dragon','hack-mines','hack-mouse','hack-ox','hack-rabbit','hack-tiger'];
const ROOT = path.join(__dirname, 'public', 'games');

// ---- Mojibake table (Latin1-decoded UTF-8 → real char) ----
const MOJIBAKE = [
  ['Ã¡','á'],['Ã ','à'],['Ã¢','â'],['Ã£','ã'],['Ã¤','ä'],['Ã¥','å'],
  ['Ã©','é'],['Ã¨','è'],['Ãª','ê'],['Ã«','ë'],
  ['Ã­','í'],['Ã¬','ì'],['Ã®','î'],['Ã¯','ï'],
  ['Ã³','ó'],['Ã²','ò'],['Ã´','ô'],['Ãµ','õ'],['Ã¶','ö'],
  ['Ãº','ú'],['Ã¹','ù'],['Ã»','û'],['Ã¼','ü'],
  ['Ã§','ç'],['Ã±','ñ'],
  ['Ã\u0081','Á'],['Ã\u0089','É'],['Ã\u008d','Í'],['Ã\u0093','Ó'],['Ã\u009a','Ú'],['Ã\u0087','Ç'],['Ã\u0083','Ã'],['Ã\u0095','Õ'],['Ã\u0082','Â'],
  // Specific known broken sequences in the source
  ['FAÃA','FAÇA'],['FAÃa','FAÇa'],['Faã','Faç'],['faÃ§','faç'],['BotÃ£o','Botão'],
  ['Vá!lido','Válido'],['atÃ©','até'],['inÃ­cio','início'],['Ã¡udio','áudio'],['nÃ£o','não'],['nÃ\u00a3o','não'],['informaÃ§Ãµes','informações'],
  ['CÃ³digo','Código'],['CÃ³d','Cód'],['nÃºmero','número'],['hÃ¡','há'],['Ã¢ncia','ância'],
  ['ï¿½','-'],
  // Visible junk chars from prior misencodings (literal artifacts in our pages)
  ['¨ GERAR','🎯 GERAR'],['â FUNCIONANDO','🎰 FUNCIONANDO'],['¥ NOVA','💰 NOVA'],['¤ FAÃA','💎 FAÇA'],['¤ FAça','💎 FAça'],['¤ FAÇA','💎 FAÇA'],
  ['BREXA','BRECHA'],
];

// ---- Pure JS toast (no CDN) ----
const TOAST_BLOCK = `<!-- Pure-JS toast notifications (no CDN) -->
<style>
.vnb-toast{position:fixed;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;padding:14px 22px;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.4);z-index:2147483647;font-family:Arial,sans-serif;font-size:14px;max-width:92vw;border:1px solid rgba(255,255,255,.2);transition:top .35s ease,opacity .35s ease;opacity:0;top:-80px;pointer-events:auto}
.vnb-toast.show{opacity:1;top:18px}
.vnb-toast strong{color:#fff;font-weight:700}
</style>
<script>
(function(){
  if(window.__vnbToast)return;window.__vnbToast=1;
  var NOMES=['José','João','Antonio','Carlos','Paulo','Pedro','Lucas','Luiz','Marcos','Gabriel','Rafael','Daniel','Marcelo','Bruno','Eduardo','Felipe','Rodrigo','Mateus','André','Fernando','Fábio','Leonardo','Gustavo','Guilherme','Leandro','Tiago','Anderson','Ricardo','Jorge','Alexandre','Roberto','Diego','Vitor','Sérgio','Matheus','Thiago','Adriano','Luciano','Júlio','Renato','Alex','Vinícius','Rogério','Samuel','Ronaldo','Mário','Flávio','Douglas','Igor','Davi','Maria','Ana','Juliana','Márcia','Fernanda','Patrícia','Aline','Sandra','Camila','Amanda','Bruna','Jéssica','Letícia','Júlia','Luciana','Vanessa','Mariana','Gabriela','Vitória','Larissa','Cláudia','Beatriz','Rita','Luana','Sônia','Renata','Eliane'];
  var SOBRE=['A.','B.','C.','D.','F.','G.','L.','M.','N.','P.','R.','S.','V.'];
  var PRODUTO='__PRODUTO__';
  function valor(){return 'R$ '+(Math.random()*4800+200).toFixed(2).replace('.',',');}
  function show(){
    var t=document.createElement('div');t.className='vnb-toast';
    var n=NOMES[Math.floor(Math.random()*NOMES.length)]+' '+SOBRE[Math.floor(Math.random()*SOBRE.length)];
    t.innerHTML='<strong>'+n+'</strong> ganhou <strong>'+valor()+'</strong> no <strong>'+PRODUTO+'</strong>';
    document.body.appendChild(t);
    requestAnimationFrame(function(){t.classList.add('show');});
    setTimeout(function(){t.style.opacity='0';t.style.top='-80px';setTimeout(function(){t.remove();},400);},4200);
  }
  function loop(){show();setTimeout(loop,(Math.floor(Math.random()*22)+7)*1000);}
  function start(){setTimeout(loop,1500);}
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',start);}else{start();}
})();
</script>
<!-- /toast -->`;

const PRODUTOS = {
  'aovivo':'CASSINO AO VIVO','aviator':'AVIATOR','bacbo':'BAC BO',
  'hack-double-fortune':'DOUBLE FORTUNE','hack-dragon':'FORTUNE DRAGON','hack-mines':'MINES',
  'hack-mouse':'FORTUNE MOUSE','hack-ox':'FORTUNE OX','hack-rabbit':'FORTUNE RABBIT','hack-tiger':'FORTUNE TIGER'
};

// ---- Mines CSS (extracted from straplay original cssm.css) ----
const MINES_CSS = `<style id="mines-styles">
.mines-container{background:rgba(0,30,60,.95);border-radius:12px;padding:20px;max-width:400px;margin:80px auto 50px auto;box-shadow:0 8px 32px rgba(0,0,0,.25)}
.mines-header{display:flex;justify-content:center;margin-bottom:10px;color:#fff;font-size:18px}
.mines-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin:20px 0 10px 0}
.mine-cell{width:100%;aspect-ratio:1;background-color:rgba(0,0,0,.25);border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:default;position:relative;border:2px solid transparent;transition:all .6s ease}
.mine-cell .circle{width:70%;height:70%;border-radius:50%;background-color:rgba(255,255,255,.13);display:flex;align-items:center;justify-content:center;font-size:1.5em;position:relative;z-index:1}
.mine-cell.revealed-mine .circle{color:#fff}
.mine-cell.revealed-mine .circle::after{content:'💣';font-size:1.3em;display:block;line-height:1;color:#fff}
.mine-cell.revealed-mine{border:2px solid #00cc66;background-color:rgba(0,0,0,.4)}
.mines-config{margin:15px 0 10px 0;text-align:center}
.mines-config label{color:#fff;font-size:16px;display:inline-flex;align-items:center;gap:10px}
#minesCount{background:rgba(0,0,0,.3);border:2px solid #00cc66;border-radius:6px;color:#fff;padding:8px 12px;font-size:16px;outline:none;margin-left:5px}
.bet-controls{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:center;margin-top:10px}
.btn-bet{background-color:#00cc66;color:#fff;border:none;padding:12px 30px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:18px;transition:all .25s;flex-grow:1;max-width:240px}
.btn-bet:hover:not(:disabled){background:#00994d;transform:scale(1.05)}
.btn-bet:disabled{opacity:.7;cursor:not-allowed}
@media(max-width:480px){.mines-container{max-width:92vw;padding:14px}.mines-grid{gap:6px}}
</style>`;

const MINES_JS = `<script id="mines-logic">
(function(){
  var grid=document.querySelector('.mines-grid');
  var sel=document.getElementById('minesCount');
  var btn=document.getElementById('placeBet');
  var msg=document.getElementById('sinal-msg');
  if(!grid||!sel||!btn) return;
  var minesLocations=[];
  var minesCount=parseInt(sel.value,10)||3;
  function build(){
    grid.innerHTML='';
    for(var i=0;i<25;i++){
      var c=document.createElement('div');c.className='mine-cell';c.dataset.index=i;
      var ci=document.createElement('div');ci.className='circle';
      c.appendChild(ci);grid.appendChild(c);
    }
  }
  function reset(){
    document.querySelectorAll('.mine-cell').forEach(function(c){c.classList.remove('revealed-mine');});
    minesLocations=[];
  }
  function reveal(){
    minesLocations.forEach(function(idx){
      var c=document.querySelector('.mine-cell[data-index="'+idx+'"]');
      if(c) c.classList.add('revealed-mine');
    });
  }
  function startGame(){
    reset();
    minesCount=parseInt(sel.value,10)||3;
    var total=Math.min(Math.max(minesCount,1),24);
    while(minesLocations.length<total){
      var p=Math.floor(Math.random()*25);
      if(minesLocations.indexOf(p)===-1) minesLocations.push(p);
    }
    reveal();
  }
  function countdown(s){
    btn.disabled=true;btn.textContent='Aguarde ('+s+'s)';
    if(msg){msg.textContent='Realizar até 4 jogadas com o mesmo sinal!';msg.style.display='block';}
    var rem=s;var iv=setInterval(function(){
      rem--;
      if(rem<=0){clearInterval(iv);btn.disabled=false;btn.textContent='GERAR SINAL';if(msg)msg.style.display='none';reset();}
      else{btn.textContent='Aguarde ('+rem+'s)';}
    },1000);
  }
  build();
  btn.addEventListener('click',function(){if(!btn.disabled){startGame();countdown(20);}});
  sel.addEventListener('change',function(){minesCount=parseInt(this.value,10)||3;});
})();
</script>`;

// ---- Per-file processing ----
function fix(file, slug){
  let s = fs.readFileSync(file, 'utf8');
  const orig = s;

  // 1. Mojibake pass
  for (const [bad, good] of MOJIBAKE) {
    s = s.split(bad).join(good);
  }

  // 2. Fix broken html/body CSS that has position:absolute/bottom:-10%/height:110% breaking page scroll
  // Pattern: html, body { ... background-size: cover; <broken-stuff> }
  s = s.replace(/(html,\s*body\s*\{[^}]*?background-size:\s*cover;)\s*bottom:[^;]+;\s*height:[^;]+;\s*left:[^;]+;\s*position:[^;]+;\s*right:[^;]+;\s*top:[^;]+;\s*width:[^;}]+/g,
                '$1\n    min-height:100vh;');
  // Same broken stuff inside the @media block for body
  s = s.replace(/(@media[^{]*\{\s*body\s*\{[^}]*?background-size:\s*cover;)\s*bottom:[^;]+;\s*height:[^;]+;\s*left:[^;]+;\s*position:[^;]+;\s*right:[^;]+;\s*top:[^;]+;\s*width:[^;}]+/g,
                '$1\n        min-height:100vh;');

  // 3. Force page scroll: add explicit overflow-y:auto + remove any html,body{overflow:hidden}
  s = s.replace(/html\s*,\s*body\s*\{\s*overflow\s*:\s*hidden\s*;?\s*\}/gi, '');
  if (!/__VNB_SCROLL_FIX__/.test(s)) {
    s = s.replace('</head>',
      '<style id="__VNB_SCROLL_FIX__">html,body{overflow-x:hidden!important;overflow-y:auto!important;position:static!important;height:auto!important;min-height:100vh}body{overflow-y:auto!important}</style></head>');
    // If no </head>, inject after first <style ...>...</style>
    if (!/__VNB_SCROLL_FIX__/.test(s)) {
      s = s.replace(/<\/style>/i, '</style>\n<style id="__VNB_SCROLL_FIX__">html,body{overflow-x:hidden!important;overflow-y:auto!important;position:static!important;height:auto!important;min-height:100vh}body{overflow-y:auto!important}</style>');
    }
  }

  // 4. Iframe spacing: ensure margin-bottom on #iframe and remove overflow:hidden so wheel events bubble
  s = s.replace(/(#iframe\s*\{[^}]*?)margin:\s*1em\s+auto\s*;/g, '$1margin:1em auto 3em auto;');
  s = s.replace(/(#iframe\s*\{[^}]*?)overflow:\s*hidden\s*;?/g, '$1');
  // Also append a final guarantee block
  if (!/__VNB_IFRAME_FIX__/.test(s)) {
    s = s.replace('</head>', '<style id="__VNB_IFRAME_FIX__">#iframe{margin:1em auto 3em auto!important;display:block;border:0;border-radius:15px;background:#000}body>div:last-of-type{margin-bottom:2em}</style></head>');
  }

  // 5. Junk leading "]" before iframe link comment
  s = s.replace(/\]\s*<!--Iframe link afiliado/g, '<!--Iframe link afiliado');

  // 6. Remove old Notiflix CDN block + old script, replace with pure-JS toast
  s = s.replace(/<!-- Notiflix ganhadores -->[\s\S]*?<\/script>\s*(<style id="responsive-iframe-height">[^<]*<\/style>)?/gi, '');
  s = s.replace(/<link[^>]+notiflix[^>]+>\s*/gi, '');
  s = s.replace(/<script[^>]+notiflix[^>]+><\/script>\s*/gi, '');
  // Remove any orphan IIFE that refs Notiflix
  s = s.replace(/<script>\s*\(function\(\)\{[^<]*?Notiflix[\s\S]*?\}\)\(\);\s*<\/script>/gi, '');

  const toast = TOAST_BLOCK.replace('__PRODUTO__', PRODUTOS[slug] || 'JOGO');
  s = s.replace(/<\/body>/i, toast + '\n<style id="responsive-iframe-height">@media(max-width:600px){#iframe{height:520px;width:95vw!important}}</style>\n</body>');

  // 7. Special: hack-mines — inject CSS + replace JS with self-contained logic
  if (slug === 'hack-mines') {
    if (!/id="mines-styles"/.test(s)) {
      if (/<\/head>/i.test(s)) s = s.replace(/<\/head>/i, MINES_CSS + '\n</head>');
      else s = s.replace(/<body/i, MINES_CSS + '\n<body');
    }
    // Remove any prior mines IIFE/logic blocks that referenced minesGrid/placeBet to avoid dupes
    s = s.replace(/<script id="mines-logic">[\s\S]*?<\/script>/g, '');
    // Strip the original inline mines JS (it spans lines around 820-915 with const minesGrid = ...)
    s = s.replace(/<script>\s*const\s+minesGrid\s*=[\s\S]*?<\/script>/g, '');
    // Append fresh
    s = s.replace(/<\/body>/i, MINES_JS + '\n</body>');
  }

  if (s !== orig) {
    fs.writeFileSync(file, s, 'utf8');
    return true;
  }
  return false;
}

let touched = 0;
for (const slug of GAMES) {
  const f = path.join(ROOT, slug, 'index.html');
  if (!fs.existsSync(f)) { console.log('SKIP', slug, '(missing)'); continue; }
  const changed = fix(f, slug);
  console.log((changed ? 'PATCHED' : 'unchanged').padEnd(10), slug);
  if (changed) touched++;
}
console.log('\nDone. ' + touched + '/' + GAMES.length + ' files updated.');
