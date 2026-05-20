const loadingTextEl = document.getElementById('loadingText');
const sinalGeradoEl = document.getElementById('sinalgerado');
const sinalDadosEl = document.getElementById('sinalDados');
const protecaoDadosEl = document.getElementById('protecaoDados');
const galeDadosEl = document.getElementById('galeDados');
const btnEl = document.getElementById('btnAviator');
const radarTitleEl = document.getElementById('radarTitle');
const radarSubtitleEl = document.getElementById('radarSubtitle');
const radarPercentEl = document.getElementById('radarPercent');
const radarProgressEl = document.getElementById('radarProgress');
const radarRoundsEl = document.getElementById('radarRounds');
const radarConfidenceEl = document.getElementById('radarConfidence');
const radarWindowEl = document.getElementById('radarWindow');
const radarHistoryEl = document.getElementById('radarHistory');

const ANALISE_MS = 18000;
const SINAL_HOLD_MS = 45000;
const ROUND_MS = 15000;
const TEXTO_SINAL_PADRAO = 'Saia em 1.70x';
const TEXTO_FIXO_PROTECAO = '3';

let countdownAtivo = null;
let timerExpiracaoSinal = null;
let timersAnalise = [];
let payloadAnalise = null;

function pad(numero) {
  return String(numero).padStart(2, '0');
}

function agora() {
  return window.VNBSignalSync ? window.VNBSignalSync.now() : Date.now();
}

function horario(timestamp) {
  const data = new Date(timestamp);
  return `${pad(data.getHours())}:${pad(data.getMinutes())}`;
}

function atualizarStatus(texto, modo) {
  loadingTextEl.textContent = texto;
  loadingTextEl.classList.remove('loading-analisando', 'loading-validada');
  loadingTextEl.classList.add(modo === 'ok' ? 'loading-validada' : 'loading-analisando');
}

function multiplicadorClasse(valor) {
  if (valor >= 10) return 'history-pink';
  if (valor >= 2) return 'history-purple';
  return 'history-blue';
}

function limparTimersAnalise() {
  timersAnalise.forEach((timer) => clearTimeout(timer));
  timersAnalise = [];
}

function setRadar(percentual, titulo, subtitulo, rodadas, assertividade, janela) {
  const pct = Math.max(0, Math.min(100, Math.round(percentual)));
  radarTitleEl.textContent = titulo;
  radarSubtitleEl.textContent = subtitulo;
  radarPercentEl.textContent = `${pct}%`;
  radarProgressEl.style.width = `${pct}%`;
  radarRoundsEl.textContent = String(rodadas || 0);
  radarConfidenceEl.textContent = assertividade || '--';
  radarWindowEl.textContent = janela || '--';
}

function renderHistorico(history) {
  const rows = Array.isArray(history) ? history.slice(0, 10) : [];
  if (!rows.length) {
    radarHistoryEl.innerHTML = '<span class="history-pill history-muted">aguardando rodadas</span>';
    return;
  }
  radarHistoryEl.innerHTML = rows.map((row) => {
    const value = Number(row.multiplier || row.result || 0);
    const text = value > 0 ? `${value.toFixed(2)}x` : '--';
    return `<span class="history-pill ${multiplicadorClasse(value)}">${text}</span>`;
  }).join('');
}

function limparCampos() {
  sinalGeradoEl.textContent = '---';
  sinalDadosEl.textContent = '---';
  protecaoDadosEl.textContent = '---';
  galeDadosEl.innerHTML = '<strong>---</strong>';
  atualizarStatus('PROCURANDO SINAL AVIATOR...', 'analise');
  setRadar(0, 'Procurando padrão seguro', 'Aguardando novas rodadas do Aviator', 0, '--', '--');
  renderHistorico([]);
}

function cancelarExpiracaoAnterior() {
  if (timerExpiracaoSinal) {
    clearTimeout(timerExpiracaoSinal);
    timerExpiracaoSinal = null;
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

function agendarLimpezaSinal(timestampExpiracao) {
  cancelarExpiracaoAnterior();
  const tempoRestante = timestampExpiracao - agora();
  if (tempoRestante <= 0) {
    limparCampos();
    finalizarCountdown();
    return;
  }
  timerExpiracaoSinal = setTimeout(() => {
    limparCampos();
    finalizarCountdown();
    timerExpiracaoSinal = null;
  }, tempoRestante);
}

function iniciarCountdownSinal(timestampExpiracao) {
  if (countdownAtivo) clearInterval(countdownAtivo);
  btnEl.disabled = true;
  countdownAtivo = setInterval(() => {
    const restante = Math.max(0, Math.ceil((timestampExpiracao - agora()) / 1000));
    btnEl.textContent = restante > 0 ? `SINAL ATIVO ${restante}s` : 'GERAR NOVO SINAL';
    if (restante <= 0) finalizarCountdown();
  }, 250);
}

function criarFallback(history) {
  const ultimos = Array.isArray(history) ? history.slice(0, 8).map((row) => Number(row.multiplier || 0)).filter(Boolean) : [];
  const baixos = ultimos.filter((valor) => valor < 2).length;
  const alvo = baixos >= 3 ? 1.55 : baixos >= 1 ? 1.65 : 1.75;
  const validUntil = agora() + SINAL_HOLD_MS;
  return {
    sinalgerado: 'ENTRADA CONFIRMADA',
    msg: `Saia em ${alvo.toFixed(2)}x`,
    protecao: `VÁLIDO ATÉ ${horario(validUntil)}`,
    gales: TEXTO_FIXO_PROTECAO,
    _validUntil: validUntil,
    _history: history || []
  };
}

function normalizarSinal(payload) {
  const signal = payload && payload.current_signal;
  const history = Array.isArray(payload && payload.history) ? payload.history : [];
  if (!signal) return criarFallback(history);

  const base = {
    sinalgerado: signal.headline || 'ENTRADA CONFIRMADA',
    msg: signal.signal || TEXTO_SINAL_PADRAO,
    protecao: signal.protection || '',
    gales: signal.gale || TEXTO_FIXO_PROTECAO
  };

  const display = window.VNBSignalSync
    ? window.VNBSignalSync.attach(base, payload, {
        game: 'aviator',
        roundMs: ROUND_MS,
        entryWindowMs: 9000,
        holdMs: SINAL_HOLD_MS,
        minUsableMs: 15000
      })
    : Object.assign(base, { _validUntil: agora() + SINAL_HOLD_MS });

  if (window.VNBSignalSync && !window.VNBSignalSync.isUsable(display, 12000)) {
    return criarFallback(history);
  }

  const holdUntil = agora() + SINAL_HOLD_MS;
  if (!Number.isFinite(Number(display._validUntil)) || Number(display._validUntil) < holdUntil) {
    display._validUntil = holdUntil;
    display.protecao = `VÁLIDO ATÉ ${horario(holdUntil)}`;
  }

  display._history = history;
  return display;
}

async function buscarPayloadSinal() {
  const response = await fetch('/api/signals/aviator', { cache: 'no-store' });
  const payload = await response.json();
  if (!response.ok || !payload || payload.ok === false) throw new Error(payload && payload.msg ? payload.msg : 'Sem sinal');
  return payload;
}

function iniciarAnimacaoAnalise() {
  limparTimersAnalise();
  payloadAnalise = null;
  renderHistorico([]);
  setRadar(8, 'Procurando padrão seguro', 'Sincronizando com as próximas rodadas', 0, '--', '--');
  atualizarStatus('PROCURANDO SINAL...', 'analise');

  const etapas = [
    { em: 2500, pct: 22, titulo: 'Lendo histórico recente', sub: 'Mapeando os últimos multiplicadores', rodadas: 6, conf: '74%', janela: '--', status: 'ANALISANDO RODADAS...' },
    { em: 6500, pct: 48, titulo: 'Filtrando volatilidade', sub: 'Aguardando a rodada encaixar no padrão', rodadas: 14, conf: '81%', janela: 'próxima' , status: 'AGUARDE A CONFIRMAÇÃO...' },
    { em: 11000, pct: 73, titulo: 'Validando entrada', sub: 'Comparando payout e proteção', rodadas: 22, conf: '87%', janela: 'curta', status: 'VALIDANDO ENTRADA...' },
    { em: 15000, pct: 92, titulo: 'Preparando sinal', sub: 'A entrada aparece quando a janela estiver segura', rodadas: 30, conf: '91%', janela: '45s', status: 'QUASE PRONTO...' }
  ];

  etapas.forEach((etapa) => {
    timersAnalise.push(setTimeout(() => {
      setRadar(etapa.pct, etapa.titulo, etapa.sub, etapa.rodadas, etapa.conf, etapa.janela);
      atualizarStatus(etapa.status, 'analise');
    }, etapa.em));
  });
}

function renderizarSinal(display) {
  const validUntil = Number(display._validUntil || (agora() + SINAL_HOLD_MS));
  sinalGeradoEl.textContent = display.sinalgerado || 'ENTRADA CONFIRMADA';
  sinalDadosEl.textContent = display.msg || TEXTO_SINAL_PADRAO;
  protecaoDadosEl.textContent = display.protecao || `VÁLIDO ATÉ ${horario(validUntil)}`;
  galeDadosEl.innerHTML = `<strong>${display.gales || TEXTO_FIXO_PROTECAO}</strong>`;
  renderHistorico(display._history || []);
  setRadar(100, 'Sinal liberado', 'Entre somente dentro da janela exibida', (display._history || []).length || 30, '91%', `${Math.ceil((validUntil - agora()) / 1000)}s`);
  atualizarStatus('SINAL ENCONTRADO', 'ok');
  iniciarCountdownSinal(validUntil);
  agendarLimpezaSinal(validUntil);
}

async function gerarSinal() {
  iniciarAnimacaoAnalise();
  btnEl.disabled = true;

  buscarPayloadSinal()
    .then((payload) => {
      payloadAnalise = payload;
      renderHistorico(payload.history || []);
    })
    .catch(() => {
      payloadAnalise = { ok: true, history: [] };
    });

  let restante = Math.ceil(ANALISE_MS / 1000);
  btnEl.textContent = `ANALISANDO ${restante}s`;
  if (countdownAtivo) clearInterval(countdownAtivo);
  countdownAtivo = setInterval(() => {
    restante -= 1;
    btnEl.textContent = restante > 0 ? `ANALISANDO ${restante}s` : 'LIBERANDO SINAL...';
    if (restante <= 0) {
      clearInterval(countdownAtivo);
      countdownAtivo = null;
    }
  }, 1000);

  timersAnalise.push(setTimeout(() => {
    limparTimersAnalise();
    const display = normalizarSinal(payloadAnalise || { ok: true, history: [] });
    renderizarSinal(display);
  }, ANALISE_MS));
}

btnEl.addEventListener('click', () => {
  if (btnEl.disabled) return;
  gerarSinal();
});

limparCampos();
