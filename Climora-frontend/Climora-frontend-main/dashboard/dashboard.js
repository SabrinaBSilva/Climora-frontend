/* dashboard.js — gráficos e indicadores alimentados pela API */
const graficos = {};
const coresFrutas = [Cores.ouro, Cores.roxo, Cores.ciano, Cores.verde];

function atualizarGraficoClimatico(leituras) {
  graficos.clima.data.labels = leituras.map(leitura => {
    const data = new Date(leitura.medido_em);
    return Number.isNaN(data.getTime())
      ? '—'
      : data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  });
  graficos.clima.data.datasets[0].data = leituras.map(leitura => Number(leitura.temperatura));
  graficos.clima.data.datasets[1].data = leituras.map(leitura => Number(leitura.umidade));
  graficos.clima.update();
}

graficos.clima = new Chart(document.getElementById('grafico-clima'), {
  type: 'line',
  data: {
    labels: [],
    datasets: [serie('Temp (°C)', [], Cores.ouro, true), serie('Umidade (%)', [], Cores.ciano, true)],
  },
  options: { scales: eixos(), interaction: { mode: 'index', intersect: false } },
});

graficos.previsao = new Chart(document.getElementById('grafico-maturacao'), {
  type: 'bar',
  data: {
    labels: [],
    datasets: [
      { label: 'Clima', data: [], backgroundColor: 'rgba(34,211,238,0.75)', borderRadius: 3 },
      { label: 'Mercado', data: [], backgroundColor: 'rgba(167,139,250,0.75)', borderRadius: 3 },
      { label: 'Prontidão', data: [], backgroundColor: 'rgba(245,158,11,0.85)', borderRadius: 3 },
    ],
  },
  options: { scales: eixos({ min: 0, max: 100 }) },
});

graficos.demanda = new Chart(document.getElementById('grafico-exportacao'), {
  type: 'bar',
  data: {
    labels: [],
    datasets: [{ label: 'Índice de demanda', data: [], backgroundColor: [], borderRadius: 4 }],
  },
  options: { scales: eixos({ min: 0, max: 100 }), plugins: { legend: { display: false } } },
});

function exigirLista(resposta, campo, recurso) {
  if (!resposta || !Array.isArray(resposta[campo])) {
    throw new Error(`Resposta inválida ao carregar ${recurso}.`);
  }
  return resposta[campo];
}

async function consultarCanalThingSpeak(sensor) {
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

function limitarPontosGrafico(leituras, limite = 120) {
  if (leituras.length <= limite) return leituras;
  const intervalo = (leituras.length - 1) / (limite - 1);
  return Array.from({ length: limite }, (_, indice) => leituras[Math.round(indice * intervalo)]);
}

function definirStatusApi(estado, texto) {
  const badge = document.getElementById('status-api');
  badge.classList.toggle('is-loading', estado === 'loading');
  badge.classList.toggle('is-error', estado === 'error');
  document.getElementById('status-api-text').textContent = texto;
}

function renderizarSensores(sensores, canais) {
  const comLeitura = canais
    .map(canal => {
      const leituras = canal.resposta.leituras.filter(leitura =>
        Number.isFinite(Date.parse(leitura.medido_em)) &&
        leitura.temperatura !== null && leitura.temperatura !== undefined && leitura.temperatura !== '' &&
        leitura.umidade !== null && leitura.umidade !== undefined && leitura.umidade !== '' &&
        Number.isFinite(Number(leitura.temperatura)) &&
        Number.isFinite(Number(leitura.umidade))
      );
      return { ...canal, leituras };
    })
    .filter(canal => canal.leituras.length)
    .sort((a, b) => Date.parse(b.leituras[b.leituras.length - 1].medido_em) - Date.parse(a.leituras[a.leituras.length - 1].medido_em));
  const sensorConectado = comLeitura[0] || canais[0] || null;

  document.getElementById('kpi-sensores-ativos').textContent = String(canais.length);
  document.getElementById('kpi-sensores-total').textContent = String(sensores.length);
  document.getElementById('kpi-sensores-status').textContent =
    `${Math.max(0, sensores.length - canais.length)} cadastro(s) não integrado(s) · sem dados simulados`;
  const detalheUmidade = document.getElementById('kpi-umidade-detalhe');
  detalheUmidade.textContent = sensorConectado
    ? `Sensor ${sensorConectado.sensor.codigo} · leitura do ThingSpeak`
    : 'Sem canal ThingSpeak configurado';

  if (!sensorConectado || !sensorConectado.leituras?.length) {
    document.getElementById('kpi-temperatura').textContent = '--';
    document.getElementById('kpi-sensor-temperatura').textContent = sensorConectado
      ? `Sensor ${sensorConectado.sensor.codigo} · sem histórico`
      : 'Nenhum sensor conectado ao ThingSpeak';
    document.getElementById('kpi-umidade').textContent = '--';
    atualizarGraficoClimatico([]);
    document.querySelector('#grafico-clima').closest('.card').querySelector('.card__subtitle').textContent =
      sensorConectado ? 'Canal conectado, mas sem leituras históricas válidas' : 'Sem canal ThingSpeak configurado';
    return sensorConectado;
  }

  const ultima = sensorConectado.leituras[sensorConectado.leituras.length - 1];
  const temperatura = Number(ultima.temperatura);
  const umidade = Number(ultima.umidade);
  document.getElementById('kpi-temperatura').textContent = temperatura.toFixed(1);
  document.getElementById('kpi-sensor-temperatura').textContent =
    `Sensor ${sensorConectado.sensor.codigo} · Setor ${sensorConectado.sensor.setor_codigo} · ${formatarData(ultima.medido_em)}`;
  document.getElementById('kpi-umidade').textContent = umidade.toFixed(1);
  document.querySelector('#grafico-clima').closest('.card').querySelector('.card__subtitle').textContent =
    `Todo o histórico real · Sensor ${sensorConectado.sensor.codigo} · Setor ${sensorConectado.sensor.setor_codigo}`;
  return sensorConectado;
}

function renderizarPrevisoes(previsoes, frutas) {
  const nomePorId = new Map(frutas.map(fruta => [Number(fruta.id_fruta), fruta.nome]));
  const itens = previsoes
    .filter(previsao => Number.isFinite(Number(previsao.combinedScore)))
    .map(previsao => ({
      nome: nomePorId.get(Number(previsao.fruitId)) || `Fruta ${previsao.fruitId}`,
      clima: Number(previsao.climateScore),
      mercado: Number(previsao.marketScore),
      prontidao: Number(previsao.combinedScore),
      recomendacao: previsao.recommendation,
      dias: Number(previsao.days),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  graficos.previsao.data.labels = itens.map(item => item.nome);
  graficos.previsao.data.datasets[0].data = itens.map(item => item.clima);
  graficos.previsao.data.datasets[1].data = itens.map(item => item.mercado);
  graficos.previsao.data.datasets[2].data = itens.map(item => item.prontidao);
  graficos.previsao.update();

  const janela = document.getElementById('kpi-janela');
  const detalhe = document.getElementById('kpi-janela-detalhe');
  const melhor = itens.slice().sort((a, b) => b.prontidao - a.prontidao)[0];
  if (!melhor) {
    janela.textContent = 'Sem dados';
    janela.className = 'stat__value c-gold';
    detalhe.textContent = 'Nenhuma previsão disponível';
    return;
  }

  const recomendacoes = {
    colher_agora: { texto: 'Alta', cor: 'c-green', detalhe: 'Colher agora' },
    monitorar: { texto: 'Monitorar', cor: 'c-gold', detalhe: 'Acompanhar condições' },
    aguardar: { texto: 'Aguardar', cor: 'c-cyan', detalhe: 'Janela ainda não ideal' },
  };
  const recomendacao = recomendacoes[melhor.recomendacao] || recomendacoes.aguardar;
  janela.textContent = recomendacao.texto;
  janela.className = `stat__value ${recomendacao.cor}`;
  detalhe.textContent = `${melhor.nome} · ${recomendacao.detalhe} · ${melhor.dias} dias`;
}

function renderizarDemanda(dados) {
  const maisRecentes = new Map();
  for (const item of dados) {
    const idFruta = Number(item.id_fruta);
    const demanda = item.indice_demanda;
    if (!Number.isFinite(idFruta) || demanda === null || demanda === undefined || !Number.isFinite(Number(demanda))) continue;
    if (!maisRecentes.has(idFruta)) maisRecentes.set(idFruta, item);
  }

  const itens = [...maisRecentes.values()].sort((a, b) => a.fruta_nome.localeCompare(b.fruta_nome, 'pt-BR'));
  graficos.demanda.data.labels = itens.map(item => item.fruta_nome);
  graficos.demanda.data.datasets[0].data = itens.map(item => Number(item.indice_demanda));
  graficos.demanda.data.datasets[0].backgroundColor = itens.map((_, indice) => coresFrutas[indice % coresFrutas.length]);
  graficos.demanda.update();
}

function formatarData(valor) {
  const data = new Date(valor);
  return Number.isNaN(data.getTime())
    ? 'Horário desconhecido'
    : data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function renderizarAlertas(alertas) {
  const lista = document.getElementById('alertas-recentes');
  lista.replaceChildren();

  if (!alertas.length) {
    const vazio = document.createElement('div');
    vazio.className = 'mini-alert';
    vazio.textContent = 'Nenhum alerta recente.';
    lista.appendChild(vazio);
    return;
  }

  for (const alerta of alertas) {
    const tipo = String(alerta.tipo || '').toUpperCase();
    const severidade = String(alerta.severidade || '').toUpperCase();
    const classe = tipo === 'JANELA_COLHEITA_IDEAL'
      ? 'success'
      : ['CRITICA', 'CRÍTICA', 'ALTA'].includes(severidade) ? 'warning' : 'info';
    const item = document.createElement('div');
    item.className = `mini-alert mini-alert--${classe}`;

    const mensagem = document.createElement('p');
    mensagem.textContent = alerta.mensagem || tipo || 'Alerta';
    item.appendChild(mensagem);

    const detalhe = document.createElement('small');
    const contexto = [alerta.sensor_codigo && `Sensor ${alerta.sensor_codigo}`, alerta.setor_codigo && `Setor ${alerta.setor_codigo}`]
      .filter(Boolean)
      .join(' · ');
    detalhe.textContent = [contexto, formatarData(alerta.criado_em)].filter(Boolean).join(' · ');
    item.appendChild(detalhe);
    lista.appendChild(item);
  }
}

async function carregarDashboard() {
  definirStatusApi('loading', 'Conectando à API…');
  try {
    const [painel, respostaFrutas, respostaPrevisoes, respostaMercado, respostaAlertas] = await Promise.all([
      Auth.requisitar('/painel'),
      Auth.requisitar('/frutas'),
      Auth.requisitar('/previsoes?limit=100'),
      Auth.requisitar('/mercado?limite=300'),
      Auth.requisitar('/alertas?limite=5'),
    ]);

    const sensores = exigirLista(painel, 'sensores', 'sensores');
    const frutas = exigirLista(respostaFrutas, 'frutas', 'culturas');
    const previsoes = exigirLista(respostaPrevisoes, 'predictions', 'previsões');
    const mercado = exigirLista(respostaMercado, 'dados', 'dados de mercado');
    const alertas = exigirLista(respostaAlertas, 'alertas', 'alertas');

    const resultadosCanais = await Promise.all(sensores.map(consultarCanalThingSpeak));
    const canais = resultadosCanais
      .filter(resultado => resultado.resposta)
      .map(resultado => ({
        sensor: resultado.sensor,
        resposta: resultado.resposta,
        leituras: resultado.resposta.leituras,
      }));
    const errosCanais = resultadosCanais.filter(resultado => resultado.erro);
    const sensorSelecionado = renderizarSensores(sensores, canais);
    renderizarPrevisoes(previsoes, frutas);
    renderizarDemanda(mercado);
    renderizarAlertas(alertas);

    const hora = painel.horaServidor ? formatarData(painel.horaServidor) : 'agora';
    document.getElementById('status-dashboard').textContent =
      `${sensorSelecionado ? `Sensor real ${sensorSelecionado.sensor.codigo} · ` : ''}Petrolina/Juazeiro · Atualizado em ${hora} · ${sensores.length} cadastros`;
    if (sensorSelecionado?.leituras?.length) {
      atualizarGraficoClimatico(limitarPontosGrafico(sensorSelecionado.leituras));
    } else {
      atualizarGraficoClimatico([]);
    }
    if (errosCanais.length && !canais.length) {
      document.getElementById('status-dashboard').textContent += ` · ThingSpeak indisponível: ${errosCanais[0].erro}`;
      definirStatusApi('error', 'ThingSpeak indisponível');
    } else {
      definirStatusApi('online', 'API conectada');
    }
  } catch (erro) {
    document.getElementById('status-dashboard').textContent = `Falha ao carregar o dashboard: ${erro.message}`;
    definirStatusApi('error', 'API indisponível');
  }
}

carregarDashboard();
