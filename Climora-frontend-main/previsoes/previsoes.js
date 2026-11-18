/* previsoes.js — previsões reais de safra e histórico registrado */
const frutasEl = document.getElementById('fruta-previsao');
const gerarEl = document.getElementById('gerar-previsao');
const cartoesEl = document.getElementById('cartoes-cultura');
const erroEl = document.getElementById('erro-previsoes');
const statusEl = document.getElementById('status-previsoes');
const configModeloEl = document.getElementById('config-modelo');
const formConfigModeloEl = document.getElementById('form-config-modelo');
const pesoClimaEl = document.getElementById('peso-clima');
const pesoMercadoEl = document.getElementById('peso-mercado');
const limiarColherEl = document.getElementById('limiar-colher');
const limiarMonitorarEl = document.getElementById('limiar-monitorar');
const statusConfigModeloEl = document.getElementById('status-config-modelo');
const salvarConfigModeloEl = document.getElementById('salvar-config-modelo');
const podeConfigurarModelo = ['ANALISTA', 'ADMIN'].includes(Auth.usuario()?.perfil);

let frutas = [];
let previsoesAtuais = new Map();
let gerando = false;

const RECOMENDACOES = {
  colher_agora: { titulo: 'Colher agora', cor: '#4ade80' },
  monitorar: { titulo: 'Monitorar', cor: '#f59e0b' },
  aguardar: { titulo: 'Aguardar', cor: '#60a5fa' },
};

const graficoAtual = new Chart(document.getElementById('grafico-janela'), {
  type: 'bar',
  data: { labels: [], datasets: [] },
  options: {
    scales: eixos({ min: 0, max: 100 }),
    plugins: { legend: { display: false } },
  },
});

const graficoHistorico = new Chart(document.getElementById('grafico-historico-previsoes'), {
  type: 'line',
  data: { labels: [], datasets: [] },
  options: { scales: eixos({ min: 0, max: 100 }), interaction: { mode: 'index', intersect: false } },
});

function criarElemento(tag, classe, texto) {
  const elemento = document.createElement(tag);
  if (classe) elemento.className = classe;
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

function formatarData(valor) {
  const data = new Date(valor);
  return Number.isNaN(data.getTime())
    ? 'Data indisponível'
    : data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function limparErro() {
  erroEl.textContent = '';
  erroEl.classList.add('hidden');
}

function mostrarErro(mensagem) {
  erroEl.textContent = mensagem;
  erroEl.classList.remove('hidden');
}

function atualizarPesoMercado() {
  const pesoClima = Number(pesoClimaEl.value);
  pesoMercadoEl.textContent = Number.isFinite(pesoClima)
    ? `${Math.max(0, Math.min(100, 100 - pesoClima))}%`
    : '—';
}

function preencherConfiguracaoModelo(configuracao) {
  const pesoClima = Number(configuracao?.pesoClima);
  const limiarColher = Number(configuracao?.limiarColher);
  const limiarMonitorar = Number(configuracao?.limiarMonitorar);
  if (!Number.isFinite(pesoClima) || !Number.isFinite(limiarColher) || !Number.isFinite(limiarMonitorar)) {
    throw new Error('A API retornou uma configuração de modelo inválida.');
  }
  pesoClimaEl.value = String(Math.round(pesoClima * 100));
  limiarColherEl.value = String(limiarColher);
  limiarMonitorarEl.value = String(limiarMonitorar);
  atualizarPesoMercado();
}

async function carregarConfiguracaoModelo() {
  configModeloEl.classList.remove('hidden');
  statusConfigModeloEl.textContent = 'Carregando configuração…';
  try {
    const resposta = await Auth.requisitar('/previsoes/configuracao');
    preencherConfiguracaoModelo(resposta?.configuracao);
    statusConfigModeloEl.textContent = 'Configuração global atual carregada.';
    statusConfigModeloEl.removeAttribute('data-erro');
  } catch (erro) {
    statusConfigModeloEl.textContent = `Não foi possível carregar a configuração: ${erro.message}`;
    statusConfigModeloEl.dataset.erro = 'true';
  }
}

async function salvarConfiguracaoModelo(evento) {
  evento.preventDefault();
  if (!formConfigModeloEl.reportValidity()) return;

  const pesoClimaPercentual = Number(pesoClimaEl.value);
  const limiarColher = Number(limiarColherEl.value);
  const limiarMonitorar = Number(limiarMonitorarEl.value);
  if (limiarColher <= limiarMonitorar) {
    statusConfigModeloEl.textContent = 'O limiar para colher precisa ser maior que o limiar para monitorar.';
    statusConfigModeloEl.dataset.erro = 'true';
    return;
  }

  salvarConfigModeloEl.disabled = true;
  statusConfigModeloEl.textContent = 'Salvando calibração…';
  statusConfigModeloEl.removeAttribute('data-erro');
  try {
    const resposta = await Auth.requisitar('/previsoes/configuracao', {
      metodo: 'PUT',
      corpo: {
        pesoClima: pesoClimaPercentual / 100,
        limiarColher,
        limiarMonitorar,
      },
    });
    preencherConfiguracaoModelo(resposta?.configuracao);
    statusConfigModeloEl.textContent = 'Calibração salva. As próximas previsões usarão estes parâmetros.';
    await carregarPrevisoesAtuais();
  } catch (erro) {
    statusConfigModeloEl.textContent = `Não foi possível salvar a calibração: ${erro.message}`;
    statusConfigModeloEl.dataset.erro = 'true';
  } finally {
    salvarConfigModeloEl.disabled = false;
  }
}

function atualizarGraficoAtual(dados) {
  graficoAtual.data.labels = dados.map(({ fruta }) => fruta.nome);
  graficoAtual.data.datasets = dados.length ? [{
    label: 'Prontidão',
    data: dados.map(({ previsao }) => Number(previsao.combinedScore)),
    backgroundColor: dados.map(({ previsao }) => (RECOMENDACOES[previsao.recommendation] || RECOMENDACOES.monitorar).cor),
    borderRadius: 6,
  }] : [];
  graficoAtual.update();
}

function criarCartao(fruta, previsao) {
  const score = Number(previsao.combinedScore);
  const recomendacao = RECOMENDACOES[previsao.recommendation] || { titulo: 'Indisponível', cor: '#60a5fa' };
  const cartao = criarElemento('article', 'card culture-card');
  const cabecalho = criarElemento('div', 'culture__head');
  cabecalho.appendChild(criarElemento('span', 'culture__icon', '🍃'));
  cabecalho.appendChild(criarElemento('h2', 'card__title', fruta.nome));
  cartao.appendChild(cabecalho);

  const linhaScore = criarElemento('div', 'progress-row');
  linhaScore.appendChild(criarElemento('span', '', 'Índice de prontidão'));
  const valorScore = criarElemento('span', '', `${score}%`);
  valorScore.style.color = recomendacao.cor;
  linhaScore.appendChild(valorScore);
  cartao.appendChild(linhaScore);

  const progresso = criarElemento('div', 'progress');
  progresso.setAttribute('role', 'progressbar');
  progresso.setAttribute('aria-label', `Prontidão para ${fruta.nome}`);
  progresso.setAttribute('aria-valuemin', '0');
  progresso.setAttribute('aria-valuemax', '100');
  progresso.setAttribute('aria-valuenow', String(score));
  const preenchimento = criarElemento('div', 'progress__fill');
  preenchimento.style.width = `${Math.max(0, Math.min(100, score))}%`;
  preenchimento.style.background = recomendacao.cor;
  progresso.appendChild(preenchimento);
  cartao.appendChild(progresso);

  const decisao = criarElemento('p', 'culture__recommendation', recomendacao.titulo);
  decisao.style.color = recomendacao.cor;
  cartao.appendChild(decisao);

  const janela = previsao.windowStart && previsao.windowEnd
    ? `${formatarData(previsao.windowStart)} – ${formatarData(previsao.windowEnd)}`
    : `${previsao.days} dia(s)`;
  cartao.appendChild(criarElemento('p', 'culture__window', `Janela estimada: ${janela}`));
  cartao.appendChild(criarElemento('p', 'culture__scores',
    `Clima ${previsao.climateScore}% · Mercado ${previsao.marketScore}%`));
  cartao.appendChild(criarElemento('p', 'culture__text', previsao.rationale || 'Sem justificativa disponível.'));
  return cartao;
}

function renderizarPrevisoes(resposta) {
  previsoesAtuais = new Map(resposta.predictions
    .filter(previsao => Number.isFinite(Number(previsao.fruitId)) &&
      previsao.combinedScore != null && Number.isFinite(Number(previsao.combinedScore)))
    .map(previsao => [Number(previsao.fruitId), previsao]));
  renderizarCartoes();
}

function renderizarCartoes() {
  cartoesEl.replaceChildren();
  const dados = frutas
    .map(fruta => ({ fruta, previsao: previsoesAtuais.get(Number(fruta.id_fruta)) }))
    .filter(item => item.previsao);

  if (!dados.length) {
    cartoesEl.appendChild(criarElemento('div', 'empty', 'Nenhuma previsão disponível para as culturas cadastradas.'));
    atualizarGraficoAtual([]);
    statusEl.textContent = 'Sem previsões disponíveis para as culturas cadastradas.';
    return;
  }

  for (const { fruta, previsao } of dados) cartoesEl.appendChild(criarCartao(fruta, previsao));
  atualizarGraficoAtual(dados);
  statusEl.textContent = `${dados.length} previsão(ões) atual(is) carregada(s).`;
}

function preencherSeletor() {
  frutasEl.replaceChildren();
  for (const fruta of frutas) {
    const opcao = document.createElement('option');
    opcao.value = String(fruta.id_fruta);
    opcao.textContent = fruta.nome;
    frutasEl.appendChild(opcao);
  }
  frutasEl.disabled = !frutas.length;
  gerarEl.disabled = !frutas.length;
  if (!frutas.length) {
    const opcao = document.createElement('option');
    opcao.value = '';
    opcao.textContent = 'Nenhuma cultura cadastrada';
    frutasEl.appendChild(opcao);
  }
}

async function carregarPrevisoesAtuais() {
  try {
    const resposta = await Auth.requisitar('/previsoes?limit=100');
    if (!resposta || !Array.isArray(resposta.predictions)) {
      throw new Error('A API retornou previsões em formato inválido.');
    }
    renderizarPrevisoes(resposta);
  } catch (erro) {
    cartoesEl.replaceChildren();
    atualizarGraficoAtual([]);
    statusEl.textContent = 'Previsões atuais indisponíveis.';
    mostrarErro(`Não foi possível carregar as previsões: ${erro.message}`);
  }
}

async function carregarHistoricoSafra() {
  const status = document.getElementById('status-historico-previsoes');
  if (!frutas.length) {
    graficoHistorico.data.labels = [];
    graficoHistorico.data.datasets = [];
    graficoHistorico.update();
    status.textContent = 'Cadastre uma cultura para iniciar o histórico de safra.';
    return;
  }

  status.textContent = 'Carregando histórico registrado…';
  try {
    const respostas = await Promise.all(frutas.map(fruta =>
      Auth.requisitar(`/previsoes/historico?fruit=${fruta.id_fruta}&limit=100`)
    ));
    const registros = [];
    for (let indice = 0; indice < respostas.length; indice += 1) {
      const resposta = respostas[indice];
      if (!resposta || !Array.isArray(resposta.historico)) {
        throw new Error('Resposta inválida ao carregar o histórico de safra.');
      }
      for (const registro of resposta.historico) {
        const instante = new Date(registro.gerada_em).getTime();
        const pontuacao = Number(registro.pontuacao_combinada);
        if (!Number.isFinite(instante) || registro.pontuacao_combinada == null || !Number.isFinite(pontuacao)) continue;
        registros.push({
          idFruta: Number(registro.id_fruta),
          frutaNome: registro.fruta_nome || frutas[indice].nome,
          instante,
          pontuacao,
        });
      }
    }

    registros.sort((a, b) => a.instante - b.instante);
    graficoHistorico.data.labels = registros.map(registro => new Date(registro.instante)
      .toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }));
    graficoHistorico.data.datasets = frutas.map((fruta, indice) => ({
      label: fruta.nome,
      data: registros.map(registro => registro.idFruta === Number(fruta.id_fruta) ? registro.pontuacao : null),
      borderColor: [Cores.ouro, Cores.roxo, Cores.ciano, Cores.verde][indice % 4],
      backgroundColor: [Cores.ouro, Cores.roxo, Cores.ciano, Cores.verde][indice % 4],
      borderWidth: 2,
      tension: 0.35,
      pointRadius: 3,
      spanGaps: true,
    }));
    graficoHistorico.update();
    status.textContent = registros.length
      ? `${registros.length} previsões registradas · pontuação combinada ao longo do tempo`
      : 'Sem histórico registrado. Gere previsões para iniciar a análise de tendência.';
  } catch (erro) {
    graficoHistorico.data.labels = [];
    graficoHistorico.data.datasets = [];
    graficoHistorico.update();
    status.textContent = `Não foi possível carregar o histórico de safra: ${erro.message}`;
  }
}

async function gerarPrevisao() {
  if (gerando) return;
  const idFruta = Number(frutasEl.value);
  if (!Number.isInteger(idFruta) || idFruta <= 0) {
    mostrarErro('Selecione uma cultura válida para gerar a previsão.');
    return;
  }

  gerando = true;
  gerarEl.disabled = true;
  limparErro();
  statusEl.textContent = 'Gerando e registrando previsão…';
  try {
    const resposta = await Auth.requisitar('/previsoes', {
      metodo: 'POST',
      corpo: { fruit: idFruta },
    });
    const fruta = frutas.find(item => Number(item.id_fruta) === idFruta);
    const previsao = resposta && resposta.prediction;
    if (!fruta || !previsao || Number(previsao.fruitId) !== idFruta ||
      previsao.combinedScore == null || !Number.isFinite(Number(previsao.combinedScore))) {
      throw new Error('A API não confirmou a previsão gerada.');
    }
    previsoesAtuais.set(idFruta, previsao);
    renderizarCartoes();
    statusEl.textContent = `Previsão de ${fruta.nome} gerada e registrada.`;
    await carregarHistoricoSafra();
  } catch (erro) {
    mostrarErro(`Não foi possível gerar a previsão: ${erro.message}`);
    statusEl.textContent = 'A previsão não foi registrada.';
  } finally {
    gerando = false;
    gerarEl.disabled = !frutas.length;
  }
}

async function iniciar() {
  try {
    const resposta = await Auth.requisitar('/frutas');
    if (!resposta || !Array.isArray(resposta.frutas)) {
      throw new Error('A API retornou culturas em formato inválido.');
    }
    frutas = resposta.frutas;
    preencherSeletor();
    const tarefaConfiguracao = podeConfigurarModelo ? carregarConfiguracaoModelo() : Promise.resolve();
    if (!frutas.length) {
      statusEl.textContent = 'Nenhuma cultura cadastrada.';
      cartoesEl.replaceChildren(criarElemento('div', 'empty', 'Cadastre uma cultura antes de gerar previsões.'));
      await Promise.all([carregarHistoricoSafra(), tarefaConfiguracao]);
      return;
    }
    await Promise.all([carregarPrevisoesAtuais(), carregarHistoricoSafra(), tarefaConfiguracao]);
  } catch (erro) {
    frutas = [];
    preencherSeletor();
    statusEl.textContent = 'Não foi possível carregar as culturas.';
    mostrarErro(`Não foi possível iniciar as previsões: ${erro.message}`);
  }
}

gerarEl.addEventListener('click', gerarPrevisao);
pesoClimaEl.addEventListener('input', atualizarPesoMercado);
formConfigModeloEl.addEventListener('submit', salvarConfiguracaoModelo);
iniciar();
