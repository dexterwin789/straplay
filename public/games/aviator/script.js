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
  const data = new Date();
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

  const tempoRestante = timestampExpiracao - Date.now();

  if (tempoRestante <= 0) {
    limparCampos();
    return;
  }

  timerExpiracaoSinal = setTimeout(() => {
    limparCampos();
    timerExpiracaoSinal = null;
  }, tempoRestante);
}

function gerarSinal() {
  const minutosValidade = gerarValidadeAleatoria();
  const validade = gerarHorarioValidade(minutosValidade);

  sinalGeradoEl.textContent = 'ENTRADA CONFIRMADA';
  sinalDadosEl.textContent = TEXTO_SINAL;
  protecaoDadosEl.textContent = `VÁLIDO ATÉ ${validade.texto}`;
  galeDadosEl.innerHTML = `<strong>${TEXTO_FIXO_PROTECAO}</strong>`;
  atualizarStatus('SINAL ENCONTRADO', 'ok');

  agendarLimpezaSinal(validade.timestamp);
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

btnEl.addEventListener('click', () => {
  if (btnEl.disabled) return;

  gerarSinal();
  iniciarCountdown(TEMPO_BLOQUEIO);
});

gerarResultadosIniciais();
limparCampos();