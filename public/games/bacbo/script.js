const loadingTextEl = document.getElementById('loadingText');
const sinalGeradoEl = document.getElementById('sinalgerado');
const sinalDadosEl = document.getElementById('sinalDados');
const protecaoDadosEl = document.getElementById('protecaoDados');
const galeDadosEl = document.getElementById('galeDados');
const btnEl = document.getElementById('btnBacbo');

const SINAIS_POSSIVEIS = ['AZUL', 'VERMELHO'];
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
  const lado = escolher(SINAIS_POSSIVEIS);
  const minutosValidade = gerarValidadeAleatoria();
  const validade = gerarHorarioValidade(minutosValidade);

  sinalGeradoEl.textContent = 'ENTRADA CONFIRMADA';
  sinalDadosEl.textContent = `APOSTAR NO ${lado}`;
  protecaoDadosEl.textContent = `NÃO ESQUEÇA PROTEJA O EMPATE`;
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

limparCampos();