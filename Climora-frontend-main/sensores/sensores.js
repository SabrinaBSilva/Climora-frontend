/* sensores.js — sensores e histórico climático consultados na API */
let sensores = [];
let selecionado = null;
let periodoDias = null;
let leituras = [];
let dadosCanais = new Map();
let errosCanais = new Map();
let requisicaoHistorico = 0;
const graficos = {};

const listaEl = document.getElementById('lista-sensores');
const tituloEl = document.getElementById('titulo-historico');
const statusEl = document.getElementById('status-sensores');
const statusHistoricoEl = document.getElementById('status-historico');
const metricasEl = document.getElementById('metricas-sensor');

function numeroValido(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function dataValida(valor) {
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

function formatarDataHora(valor) {
  const data = dataValida(valor);
  return data
    ? data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : 'Sem leitura registrada';
}

function formatarDataCurta(valor) {
  const data = dataValida(valor);
  return data ? data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—';
}

function ultimaLeituraValida(registros = []) {
  const validas = registros
    .filter(registro =>
      dataValida(registro.medido_em) &&
      numeroValido(registro.temperatura) !== null &&
      numeroValido(registro.umidade) !== null
    )
    .sort((a, b) => Date.parse(a.medido_em) - Date.parse(b.medido_em));
  return validas[validas.length - 1];
}

function formatarPeriodo() {
  return periodoDias ? `últimos ${periodoDias} dias` : 'todo o histórico';
}

function leiturasDoPeriodo(registros) {
  if (!periodoDias) return registros;
  const limite = Date.now() - periodoDias * 24 * 60 * 60 * 1000;
  return registros.filter(registro => dataValida(registro.medido_em)?.getTime() >= limite);
}

function limitarLeiturasGrafico(registros, limite = 600) {
  if (registros.length <= limite) return registros;
  const intervalo = (registros.length - 1) / (limite - 1);
  return Array.from({ length: limite }, (_, indice) => registros[Math.round(indice * intervalo)]);
}

function limparGrafico(grafico) {
  grafico.data.labels = [];
  grafico.data.datasets.forEach(dataset => { dataset.data = []; });
  grafico.update();
}

function renderLista() {
  listaEl.replaceChildren();
  if (!sensores.length) {
    const vazio = document.createElement('div');
    vazio.className = 'empty';
    vazio.textContent = 'Nenhum sensor disponível para esta conta.';
    listaEl.appendChild(vazio);
    return;
  }

  for (const sensor of sensores) {
    const dadosCanal = dadosCanais.get(Number(sensor.id_sensor));
    const erroCanal = errosCanais.get(Number(sensor.id_sensor));
    const real = Boolean(dadosCanal);
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = `sensor${Number(sensor.id_sensor) === Number(selecionado) ? ' selected' : ''}${real ? ' sensor--real' : ' sensor--demo'}`;
    botao.dataset.id = String(sensor.id_sensor);
    botao.setAttribute('aria-pressed', Number(sensor.id_sensor) === Number(selecionado) ? 'true' : 'false');

    const topo = document.createElement('div');
    topo.className = 'sensor__top';
    const codigo = document.createElement('span');
    codigo.className = 'sensor__id';
    codigo.textContent = sensor.codigo;
    const estado = document.createElement('span');
    estado.className = `pill pill--sm ${real ? 'pill--green' : erroCanal ? 'pill--gold' : 'pill--red'}`;
    estado.textContent = real ? '● ThingSpeak real' : erroCanal ? 'ThingSpeak indisponível' : 'Demonstração';
    topo.append(codigo, estado);
    botao.appendChild(topo);

    const localizacao = document.createElement('div');
    localizacao.className = 'sensor__where';
    localizacao.textContent = `Setor ${sensor.setor_codigo} · ${sensor.fruta_nome || 'Sem cultura'}`;
    botao.appendChild(localizacao);

    const leitura = ultimaLeituraValida(dadosCanal?.leituras);
    if (leitura) {
      const valores = document.createElement('div');
      valores.className = 'sensor__readings';
      const temperatura = document.createElement('span');
      temperatura.className = 'c-gold';
      temperatura.textContent = `🌡 ${Number(leitura.temperatura).toFixed(1)}°C`;
      const umidade = document.createElement('span');
      umidade.className = 'c-cyan';
      umidade.textContent = `💧 ${Number(leitura.umidade).toFixed(1)}%`;
      valores.append(temperatura, umidade);
      botao.appendChild(valores);
    }

    const ultima = document.createElement('div');
    ultima.className = 'sensor__last';
    ultima.textContent = `Última leitura: ${formatarDataHora(leitura?.medido_em)}`;
    botao.appendChild(ultima);
    const origem = document.createElement('div');
    origem.className = 'sensor__source';
    origem.textContent = real
      ? 'Sensor físico integrado · dados históricos do canal'
      : erroCanal
        ? `Não foi possível consultar o canal: ${erroCanal}`
        : 'Cadastro preservado; não possui canal ThingSpeak configurado.';
    botao.appendChild(origem);
    listaEl.appendChild(botao);
  }
}

function criarMetrica(label, valor, detalhe, cor) {
  const card = document.createElement('div');
  card.className = 'card card--sm';
  const titulo = document.createElement('div');
  titulo.className = 'stat__label';
  titulo.textContent = label;
  titulo.style.cssText = 'text-transform:none;letter-spacing:0;margin-bottom:4px';
  const numero = document.createElement('div');
  numero.className = `stat__value ${cor}`;
  numero.style.fontSize = '24px';
  numero.textContent = valor;
  const descricao = document.createElement('div');
  descricao.className = 'stat__sub';
  descricao.textContent = detalhe;
  card.append(titulo, numero, descricao);
  return card;
}

function renderDetalhe(sensor) {
  tituloEl.textContent = sensor ? `Histórico — Sensor ${sensor.codigo}` : 'Histórico';
  metricasEl.replaceChildren();
  if (!sensor) return;

  const dadosCanal = dadosCanais.get(Number(sensor.id_sensor));
  const registros = dadosCanal?.leituras || [];
  const leitura = ultimaLeituraValida(registros);
  const estatisticas = dadosCanal?.estatisticas || {};
  const formatarValor = (valor, unidade) => {
    const numero = numeroValido(valor);
    return numero === null ? '--' : `${numero.toFixed(1)}${unidade}`;
  };
  const criarResumo = (titulo, valores, unidade, cor) => {
    const card = document.createElement('div');
    card.className = 'card card--sm';
    const cabecalho = document.createElement('div');
    cabecalho.className = `stat__label ${cor}`;
    cabecalho.textContent = titulo;
    const grade = document.createElement('div');
    grade.className = 'sensor-stats';
    for (const [chave, rotulo] of [['minima', 'Mínima'], ['maxima', 'Máxima'], ['media', 'Média']]) {
      const item = document.createElement('div');
      item.className = 'sensor-stats__item';
      const label = document.createElement('div');
      label.className = 'sensor-stats__label';
      label.textContent = rotulo;
      const valor = document.createElement('div');
      valor.className = 'sensor-stats__value';
      valor.textContent = formatarValor(valores?.[chave], unidade);
      item.append(label, valor);
      grade.appendChild(item);
    }
    card.append(cabecalho, grade);
    return card;
  };
  metricasEl.append(
    criarMetrica(
      'Temperatura mais recente',
      leitura ? `${Number(leitura.temperatura).toFixed(1)}°C` : '--',
      leitura ? `Atualizado em ${formatarDataHora(leitura.medido_em)}` : 'Sem leitura atual',
      'c-gold',
    ),
    criarMetrica(
      'Umidade mais recente',
      leitura ? `${Number(leitura.umidade).toFixed(1)}%` : '--',
      leitura ? `Atualizado em ${formatarDataHora(leitura.medido_em)}` : 'Sem leitura atual',
      'c-cyan',
    ),
    criarResumo('Temperatura · todo o canal', estatisticas.temperatura, '°C', 'c-gold'),
    criarResumo('Umidade · todo o canal', estatisticas.umidade, '%', 'c-cyan'),
    criarMetrica('Máxima / mínima / média do canal', leitura
      ? [leitura.maxima, leitura.minima, leitura.media].map(valor => formatarValor(valor, '')).join(' / ')
      : '--', `${registros.length} leituras reais recebidas`, 'c-purple'),
  );
}

function agregarPorDia(registros) {
  const dias = new Map();
  for (const registro of registros) {
    const data = dataValida(registro.medido_em);
    const temperatura = numeroValido(registro.temperatura);
    const umidade = numeroValido(registro.umidade);
    if (!data || temperatura === null || umidade === null) continue;

    const chave = `${data.getFullYear()}-${data.getMonth()}-${data.getDate()}`;
    if (!dias.has(chave)) {
      dias.set(chave, { data, temperaturas: [], umidades: [] });
    }
    dias.get(chave).temperaturas.push(temperatura);
    dias.get(chave).umidades.push(umidade);
  }

  const media = valores => valores.reduce((total, valor) => total + valor, 0) / valores.length;
  return [...dias.values()].sort((a, b) => a.data - b.data).map(dia => ({
    rotulo: formatarDataCurta(dia.data),
    tMax: Math.max(...dia.temperaturas),
    tMed: media(dia.temperaturas),
    tMin: Math.min(...dia.temperaturas),
    uMax: Math.max(...dia.umidades),
    uMed: media(dia.umidades),
    uMin: Math.min(...dia.umidades),
  }));
}

const VARS = {
  temp: {
    el: 'bloco-temp',
    titulo: 'Temperatura',
    unidade: '°C',
    campos: ['tMax', 'tMed', 'tMin'],
    cores: { max: '#f87171', med: '#f59e0b', min: '#38bdf8' },
    escala: { grace: '8%' },
  },
  umi: {
    el: 'bloco-umi',
    titulo: 'Umidade Relativa',
    unidade: '%',
    campos: ['uMax', 'uMed', 'uMin'],
    cores: { max: '#3b82f6', med: '#22d3ee', min: '#a78bfa' },
    escala: { suggestedMax: 100, grace: '5%' },
  },
};

const graficosMM = {};

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

function montarBloco(chave) {
  const variavel = VARS[chave];
  const cores = variavel.cores;
  const tile = (id, rotulo, cor) => `
    <div class="kpi" style="--tone:${cor}">
      <div class="kpi__label">${rotulo}</div>
      <div class="kpi__value"><span id="${chave}-${id}">--</span><small>${variavel.unidade}</small></div>
      <div class="kpi__sub" id="${chave}-${id}-sub"></div>
    </div>`;
  document.getElementById(variavel.el).innerHTML = `
    <div class="mm__head">
      <div>
        <h2 class="card__title">${variavel.titulo} — extremos e média diários</h2>
        <p class="mm__sub"><span class="js-sensor"></span> · <span class="js-periodo"></span></p>
      </div>
      <div class="legend">
        <span><i style="background:${cores.max}"></i>Máxima</span>
        <span><i style="background:${cores.med}"></i>Média</span>
        <span><i style="background:${cores.min}"></i>Mínima</span>
      </div>
    </div>
    <div class="chart-box chart-box--lg"><canvas id="grafico-${chave}"></canvas></div>
    <div class="mm__kpis">
      ${tile('max', 'Máxima', cores.max)}${tile('med', 'Média', cores.med)}${tile('min', 'Mínima', cores.min)}
    </div>`;

  const linha = (rotulo, cor, extra = {}) => ({
    label: rotulo,
    data: [],
    borderColor: cor,
    borderWidth: 2,
    tension: 0.35,
    pointRadius: 0,
    pointHoverRadius: 5,
    pointHoverBackgroundColor: cor,
    fill: false,
    ...extra,
  });
  graficosMM[chave] = new Chart(document.getElementById(`grafico-${chave}`), {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        linha('Máxima', cores.max, { fill: '+1', backgroundColor: hexA(cores.med, 0.1) }),
        linha('Mínima', cores.min),
        linha('Média', cores.med, { borderWidth: 3 }),
      ],
    },
    options: {
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { grid: { display: false }, border: { display: false }, ticks: { maxTicksLimit: 8, maxRotation: 0 } },
        y: { grid: { color: Cores.grade }, border: { display: false }, ...variavel.escala },
      },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: contexto => ` ${contexto.dataset.label}: ${contexto.parsed.y.toFixed(1)}${variavel.unidade}` } },
      },
    },
  });
}

function atualizarBloco(chave, pontos) {
  const variavel = VARS[chave];
  const grafico = graficosMM[chave];
  const [campoMax, campoMed, campoMin] = variavel.campos;
  const maximos = pontos.map(ponto => ponto[campoMax]);
  const medias = pontos.map(ponto => ponto[campoMed]);
  const minimos = pontos.map(ponto => ponto[campoMin]);

  grafico.data.labels = pontos.map(ponto => ponto.rotulo);
  grafico.data.datasets[0].data = maximos;
  grafico.data.datasets[1].data = minimos;
  grafico.data.datasets[2].data = medias;
  grafico.update();

  const definir = (id, valor, detalhe) => {
    document.getElementById(`${chave}-${id}`).textContent = valor;
    document.getElementById(`${chave}-${id}-sub`).textContent = detalhe;
  };
  if (!pontos.length) {
    definir('max', '--', 'Sem dados');
    definir('med', '--', 'Sem dados');
    definir('min', '--', 'Sem dados');
    return;
  }

  const indiceMax = maximos.indexOf(Math.max(...maximos));
  const indiceMin = minimos.indexOf(Math.min(...minimos));
  definir('max', Math.max(...maximos).toFixed(1), `Pico em ${pontos[indiceMax].rotulo}`);
  definir('med', (medias.reduce((total, valor) => total + valor, 0) / medias.length).toFixed(1), 'Média diária do período');
  definir('min', Math.min(...minimos).toFixed(1), `Mínimo em ${pontos[indiceMin].rotulo}`);
}

function atualizarTendencias(registros) {
  const pontos = agregarPorDia(registros);
  const sensor = sensores.find(item => Number(item.id_sensor) === Number(selecionado));
  const periodoTexto = formatarPeriodo();
  document.querySelectorAll('.js-periodo').forEach(elemento => { elemento.textContent = periodoTexto; });
  document.querySelectorAll('.js-sensor').forEach(elemento => {
    elemento.textContent = sensor ? `Sensor ${sensor.codigo} · Setor ${sensor.setor_codigo}` : 'Sensor não selecionado';
  });
  Object.keys(VARS).forEach(chave => atualizarBloco(chave, pontos));
}

function atualizarGraficoHistorico(registros) {
  graficos.historico.data.labels = registros.map(registro => {
    const data = dataValida(registro.medido_em);
    return data ? data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
  });
  graficos.historico.data.datasets[0].data = registros.map(registro => Number(registro.temperatura));
  graficos.historico.data.datasets[1].data = registros.map(registro => Number(registro.umidade));
  graficos.historico.update();
}

function atualizarMetricas(sensor) {
  renderDetalhe(sensor);
}

async function carregarHistorico() {
  const sensor = sensores.find(item => Number(item.id_sensor) === Number(selecionado));
  const requisicaoAtual = ++requisicaoHistorico;
  const dadosCanal = sensor ? dadosCanais.get(Number(sensor.id_sensor)) : null;
  leituras = [];
  atualizarMetricas(sensor);
  if (!sensor) {
    limparGrafico(graficos.historico);
    atualizarTendencias([]);
    statusHistoricoEl.textContent = 'Selecione um sensor para consultar o histórico.';
    return;
  }

  if (!dadosCanal) {
    limparGrafico(graficos.historico);
    atualizarTendencias([]);
    atualizarMetricas(sensor);
    statusHistoricoEl.textContent = errosCanais.has(Number(sensor.id_sensor))
      ? `Não foi possível consultar o ThingSpeak: ${errosCanais.get(Number(sensor.id_sensor))}`
      : 'Este cadastro não possui canal ThingSpeak configurado; dados demonstrativos não são exibidos como reais.';
    return;
  }

  if (requisicaoAtual !== requisicaoHistorico) return;
  leituras = dadosCanal.leituras
    .filter(registro =>
      dataValida(registro.medido_em) &&
      numeroValido(registro.temperatura) !== null &&
      numeroValido(registro.umidade) !== null
    )
    .sort((a, b) => Date.parse(a.medido_em) - Date.parse(b.medido_em));
  const registrosVisiveis = leiturasDoPeriodo(leituras);
  atualizarGraficoHistorico(limitarLeiturasGrafico(registrosVisiveis));
  atualizarTendencias(registrosVisiveis);
  atualizarMetricas(sensor);
  statusHistoricoEl.textContent = registrosVisiveis.length
    ? `${registrosVisiveis.length} leituras reais · ${formatarPeriodo()} · última em ${formatarDataHora(leituras[leituras.length - 1]?.medido_em)}`
    : `Nenhuma leitura real no ${formatarPeriodo()}`;
}

graficos.historico = new Chart(document.getElementById('grafico-historico'), {
  type: 'line',
  data: {
    labels: [],
    datasets: [serie('Temp (°C)', [], Cores.ouro), serie('Umidade (%)', [], Cores.ciano)],
  },
  options: { scales: eixos(), interaction: { mode: 'index', intersect: false } },
});

Object.keys(VARS).forEach(montarBloco);

listaEl.addEventListener('click', evento => {
  const botao = evento.target.closest('[data-id]');
  if (!botao) return;
  selecionado = Number(botao.dataset.id);
  renderLista();
  carregarHistorico();
});

document.getElementById('seg-periodo').addEventListener('click', evento => {
  const botao = evento.target.closest('[data-p]');
  if (!botao) return;
  const novoPeriodo = botao.dataset.p === 'all' ? null : Number(botao.dataset.p);
  if (![null, 7, 30].includes(novoPeriodo)) return;
  periodoDias = novoPeriodo;
  document.querySelectorAll('.seg__btn').forEach(item => item.classList.toggle('active', item === botao));
  const sensor = sensores.find(item => Number(item.id_sensor) === Number(selecionado));
  const registrosVisiveis = leiturasDoPeriodo(leituras);
  atualizarGraficoHistorico(limitarLeiturasGrafico(registrosVisiveis));
  atualizarTendencias(registrosVisiveis);
  atualizarMetricas(sensor);
  statusHistoricoEl.textContent = registrosVisiveis.length
    ? `${registrosVisiveis.length} leituras reais · ${formatarPeriodo()} · última em ${formatarDataHora(leituras[leituras.length - 1]?.medido_em)}`
    : `Nenhuma leitura real no ${formatarPeriodo()}`;
});

async function consultarCanal(sensor) {
  try {
    const resposta = await Auth.requisitar(`/leituras/${sensor.id_sensor}/thingspeak`);
    if (!resposta || !resposta.sensor || !Array.isArray(resposta.leituras)) {
      throw new Error('Resposta inválida ao consultar o canal ThingSpeak.');
    }
    return { sensor, resposta };
  } catch (erro) {
    if (erro.status === 409) return { sensor, semCanal: true };
    return { sensor, erro: erro.message };
  }
}

async function carregarSensores() {
  try {
    const resposta = await Auth.requisitar('/painel');
    if (!resposta || !Array.isArray(resposta.sensores)) {
      throw new Error('Resposta inválida ao carregar os sensores.');
    }
    sensores = resposta.sensores;
    const resultados = await Promise.all(sensores.map(consultarCanal));
    dadosCanais = new Map();
    errosCanais = new Map();
    for (const resultado of resultados) {
      if (resultado.resposta) dadosCanais.set(Number(resultado.sensor.id_sensor), resultado.resposta);
      if (resultado.erro) errosCanais.set(Number(resultado.sensor.id_sensor), resultado.erro);
    }
    const comCanal = resultados.find(resultado => resultado.resposta);
    const comFalhaCanal = resultados.find(resultado => resultado.erro);
    selecionado = comCanal?.sensor.id_sensor || comFalhaCanal?.sensor.id_sensor || sensores[0]?.id_sensor || null;
    renderLista();
    const quantidadeReal = dadosCanais.size;
    statusEl.textContent = sensores.length
      ? `${quantidadeReal} sensor(es) com canal ThingSpeak · ${sensores.length - quantidadeReal} outro(s) cadastro(s) preservado(s) como demonstração`
      : 'Nenhum sensor cadastrado para esta conta.';
    await carregarHistorico();
  } catch (erro) {
    statusEl.textContent = `Não foi possível carregar os sensores: ${erro.message}`;
    listaEl.replaceChildren();
    const aviso = document.createElement('div');
    aviso.className = 'empty';
    aviso.textContent = 'Os sensores estão indisponíveis.';
    listaEl.appendChild(aviso);
  }
}

carregarSensores();
