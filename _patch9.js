// Fix #1: remove double-BOM mojibake (bytes C3 AF C2 BB C2 BF at position 3) in 6 hack game files.
// Fix #2: remove scrolling="no" from aovivo iframe.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, 'public', 'games');
const MOJIBAKE_TARGETS = ['hack-double-fortune','hack-dragon','hack-mines','hack-mouse','hack-ox','hack-rabbit'];

// ---- Fix 1: strip 6-byte mojibake after initial BOM ----
for (const name of MOJIBAKE_TARGETS) {
  const p = path.join(ROOT, name, 'index.html');
  const buf = fs.readFileSync(p);
  if (buf.length < 9) { console.log('SKIP', name, '(too small)'); continue; }
  const hasBom = buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF;
  const hasMoji = buf[3] === 0xC3 && buf[4] === 0xAF && buf[5] === 0xC2 && buf[6] === 0xBB && buf[7] === 0xC2 && buf[8] === 0xBF;
  if (hasBom && hasMoji) {
    // keep BOM (0..2) + content from position 9 onward
    const fixed = Buffer.concat([buf.subarray(0, 3), buf.subarray(9)]);
    fs.writeFileSync(p, fixed);
    console.log('FIXED mojibake:', name);
  } else {
    console.log('SKIP', name, '(no mojibake: bom=' + hasBom + ' moji=' + hasMoji + ')');
  }
}

// ---- Fix 2: remove scrolling="no" from aovivo iframe ----
const aovivoPath = path.join(ROOT, 'aovivo', 'index.html');
let aovivo = fs.readFileSync(aovivoPath, 'utf8');
const before = aovivo;
aovivo = aovivo.replace(/\s+scrolling="no"/g, '');
if (aovivo !== before) {
  fs.writeFileSync(aovivoPath, aovivo);
  console.log('FIXED aovivo iframe scrolling=no removed');
} else {
  console.log('SKIP aovivo (no scrolling=no found)');
}

console.log('Done.');
