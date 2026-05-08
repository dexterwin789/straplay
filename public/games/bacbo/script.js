const loadingTextEl = document.getElementById('loadingText');
const sinalGeradoEl = document.getElementById('sinalgerado');
const sinalDadosEl = document.getElementById('sinalDados');
const protecaoDadosEl = document.getElementById('protecaoDados');
const galeDadosEl = document.getElementById('galeDados');
const btnEl = document.getElementById('btnBacbo');

const SINAIS_POSSIVEIS = ['AZUL', 'VERMELHO'];
const MODELOS_BACBO = [
  { headline: 'ENTRADA CONFIRMADA', signal: 'APOSTAR NO {lado}', protection: 'NÃO ESQUEÇA PROTEJA O EMPATE', gale: 'ATÉ 3 PROTEÇÕES' },
  { headline: 'TENDÊNCIA IDENTIFICADA', signal: 'MANTER NO {lado}', protection: 'PROTEÇÃO NO EMPATE', gale: 'ATÉ 2 PROTEÇÕES' },
  { headline: 'QUEBRA DE PADRÃO', signal: 'ENTRADA NO {lado}', protection: 'COBRIR EMPATE SE ABRIR', gale: '1ª E 2ª PROTEÇÃO' },
  { headline: 'ENTRADA COM EMPATE', signal: '{lado} + EMPATE', protection: 'EMPATE COMO PROTEÇÃO PRINCIPAL', gale: 'ATÉ 3 PROTEÇÕES' },
  { headline: 'SINAL DE REPETIÇÃO', signal: 'REPETIR {lado}', protection: 'PROTEJA O EMPATE', gale: 'ATÉ 2 PROTEÇÕES' }
];
const TEMPO_BLOQUEIO = 30;
const TEXTO_FIXO_PROTECAO = 'ATÉ 3 PROTEÇÕES';

let countdownAtivo = null;
let timerExpiracaoSinal = null;

function escolher(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

function pad(numero) {
  return String(numero).padStart(2, '0');
}

function gerarValidadeAleatoria() {
  return Math.floor(Math.random() * 3) + 3; // 3, 4 ou 5 minutos
}

function gerarHorarioValidade(minutos) {
  const data = new Date(window.VNBSignalSync ? window.VNBSignalSync.now() : Date.now());
  data.setMinutes(data.getMinutes() + minutos);

  return {
    texto: `${pad(data.getHours())}:${pad(data.getMinutes())}`,
    timestamp: data.getTime()
  };
}

function atualizarStatus(texto, modo) {
  loadingTextEl.textContent = texto;
  loadingTextEl.classList.remove('loading-analisando', 'loading-validada');
  loadingTextEl.classList.add(modo === 'ok' ? 'loading-validada' : 'loading-analisando');
}

function limparCampos() {
  sinalGeradoEl.textContent = '---';
  sinalDadosEl.textContent = '---';
  protecaoDadosEl.textContent = '---';
  galeDadosEl.innerHTML = '<strong>---</strong>';
  atualizarStatus('ANALISANDO BAC BO...', 'analise');
}

function cancelarExpiracaoAnterior() {
  if (timerExpiracaoSinal) {
    clearTimeout(timerExpiracaoSinal);
    timerExpiracaoSinal = null;
  }
}

function agendarLimpezaSinal(timestampExpiracao) {
  cancelarExpiracaoAnterior();

  const agora = window.VNBSignalSync ? window.VNBSignalSync.now() : Date.now();
  const tempoRestante = timestampExpiracao - agora;

  if (tempoRestante <= 0) {
    limparCampos();
    return;
  }

  timerExpiracaoSinal = setTimeout(() => {
    limparCampos();
    timerExpiracaoSinal = null;
  }, tempoRestante);
}

function aplicarSinalLocal() {
  const lado = escolher(SINAIS_POSSIVEIS);
  const modelo = escolher(MODELOS_BACBO);
  const minutosValidade = gerarValidadeAleatoria();
  const validade = gerarHorarioValidade(minutosValidade);

  sinalGeradoEl.textContent = modelo.headline;
  sinalDadosEl.textContent = modelo.signal.replace('{lado}', lado);
  protecaoDadosEl.textContent = modelo.protection;
  galeDadosEl.innerHTML = `<strong>${modelo.gale || TEXTO_FIXO_PROTECAO}</strong>`;
  atualizarStatus('SINAL ENCONTRADO', 'ok');

  agendarLimpezaSinal(validade.timestamp);
}

async function gerarSinal() {
  try {
    const response = await fetch('/api/signals/bacbo', { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok || !payload.ok || !payload.current_signal) throw new Error(payload.msg || 'Sem sinal');
    const signal = payload.current_signal;
    const display = window.VNBSignalSync
      ? window.VNBSignalSync.attach({
          sinalgerado: signal.headline || 'ENTRADA CONFIRMADA',
          msg: signal.signal || 'APOSTAR NO AZUL',
          protecao: signal.protection || 'NÃO ESQUEÇA PROTEJA O EMPATE',
          gales: signal.gale || TEXTO_FIXO_PROTECAO
        }, payload, { game: 'bacbo', roundMs: 30000, entryWindowMs: 12000, holdMs: 33000 })
      : {
          sinalgerado: signal.headline || 'ENTRADA CONFIRMADA',
          msg: signal.signal || 'APOSTAR NO AZUL',
          protecao: signal.protection || 'NÃO ESQUEÇA PROTEJA O EMPATE',
          gales: signal.gale || TEXTO_FIXO_PROTECAO
        };
    if (display._entryLate) {
      atualizarStatus(window.VNBSignalSync.STATUS_WAITING, 'analise');
      return false;
    }
    sinalGeradoEl.textContent = display.sinalgerado;
    sinalDadosEl.textContent = display.msg;
    protecaoDadosEl.textContent = display.protecao;
    galeDadosEl.innerHTML = `<strong>${display.gales}</strong>`;
    atualizarStatus('SINAL ENCONTRADO', 'ok');
    agendarLimpezaSinal(display._validUntil || Date.now() + 4 * 60 * 1000);
    return true;
  } catch (err) {
    aplicarSinalLocal();
    return true;
  }
}

function finalizarCountdown() {
  if (countdownAtivo) {
    clearInterval(countdownAtivo);
    countdownAtivo = null;
  }

  btnEl.disabled = false;
  btnEl.textContent = 'GERAR NOVO SINAL';
}

function iniciarCountdown(segundos) {
  let restante = segundos;

  btnEl.disabled = true;
  btnEl.textContent = `AGUARDE ${restante}s`;

  if (countdownAtivo) {
    clearInterval(countdownAtivo);
  }

  countdownAtivo = setInterval(() => {
    restante -= 1;

    if (restante <= 0) {
      finalizarCountdown();
      return;
    }

    btnEl.textContent = `AGUARDE ${restante}s`;
  }, 1000);
}

btnEl.addEventListener('click', async () => {
  if (btnEl.disabled) return;

  const gerou = await gerarSinal();
  if (gerou) iniciarCountdown(TEMPO_BLOQUEIO);
});

limparCampos();