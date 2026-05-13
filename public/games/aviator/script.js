const loadingTextEl = document.getElementById('loadingText');
const sinalGeradoEl = document.getElementById('sinalgerado');
const sinalDadosEl = document.getElementById('sinalDados');
const protecaoDadosEl = document.getElementById('protecaoDados');
const galeDadosEl = document.getElementById('galeDados');
const btnEl = document.getElementById('btnAviator');
const resultsEl = document.getElementById('results');

const TEMPO_BLOQUEIO = 60;
const TEXTO_SINAL = 'Saia em 1.7x';
const TEXTO_FIXO_PROTECAO = '3';

let countdownAtivo = null;
let timerExpiracaoSinal = null;

function pad(numero) {
  return String(numero).padStart(2, '0');
}

function gerarValidadeAleatoria() {
  return Math.floor(Math.random() * 3) + 3; // 3, 4 ou 5 min
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

function classeMultiplier(valor) {
  if (valor >= 50) return 'legendary-multiplier';
  if (valor >= 10) return 'pink-multiplier';
  if (valor >= 2) return 'purple-multiplier';
  return 'blue-multiplier';
}

function limparCampos() {
  sinalGeradoEl.textContent = '---';
  sinalDadosEl.textContent = '---';
  protecaoDadosEl.textContent = '---';
  galeDadosEl.innerHTML = '<strong>---</strong>';
  atualizarStatus('ANALISANDO AVIATOR...', 'analise');
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
  const minutosValidade = gerarValidadeAleatoria();
  const validade = gerarHorarioValidade(minutosValidade);

  sinalGeradoEl.textContent = 'ENTRADA CONFIRMADA';
  sinalDadosEl.textContent = TEXTO_SINAL;
  protecaoDadosEl.textContent = `VÁLIDO ATÉ ${validade.texto}`;
  galeDadosEl.innerHTML = `<strong>${TEXTO_FIXO_PROTECAO}</strong>`;
  atualizarStatus('SINAL ENCONTRADO', 'ok');

  agendarLimpezaSinal(validade.timestamp);
}

async function gerarSinal() {
  try {
    const response = await fetch('/api/signals/aviator', { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok || !payload.ok || !payload.current_signal) throw new Error(payload.msg || 'Sem sinal');
    const signal = payload.current_signal;
    const display = window.VNBSignalSync
      ? window.VNBSignalSync.attach({
          sinalgerado: signal.headline || 'ENTRADA CONFIRMADA',
          msg: signal.signal || TEXTO_SINAL,
          protecao: signal.protection || `VÁLIDO ATÉ ${gerarHorarioValidade(4).texto}`,
          gales: signal.gale || TEXTO_FIXO_PROTECAO
        }, payload, { game: 'aviator', roundMs: 15000, entryWindowMs: 7000, holdMs: 45 * 1000, minUsableMs: 5000 })
      : {
          sinalgerado: signal.headline || 'ENTRADA CONFIRMADA',
          msg: signal.signal || TEXTO_SINAL,
          protecao: signal.protection || `VÁLIDO ATÉ ${gerarHorarioValidade(4).texto}`,
          gales: signal.gale || TEXTO_FIXO_PROTECAO
        };
    if (window.VNBSignalSync && !window.VNBSignalSync.isUsable(display, 5000)) {
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