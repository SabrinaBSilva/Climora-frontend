/* alertas.js — alertas reais, filtros e atualização de leitura (RF09) */
const TIPOS = {
  critico: { cor: '#f87171', rotulo: 'Crítico', icone: '🚨' },
  aviso: { cor: '#f59e0b', rotulo: 'Aviso', icone: '⚠️' },
  sucesso: { cor: '#4ade80', rotulo: 'Sucesso', icone: '✅' },
  info: { cor: '#22d3ee', rotulo: 'Info', icone: 'ℹ️' },
};

const TITULOS = {
  TEMPERATURA_ALTA: 'Temperatura alta',
  TEMPERATURA_BAIXA: 'Temperatura baixa',
  UMIDADE_ALTA: 'Umidade alta',
  UMIDADE_BAIXA: 'Umidade baixa',
  SENSOR_OFFLINE: 'Sensor offline',
  JANELA_COLHEITA_IDEAL: 'Janela de colheita ideal',
};

const FILTROS = [
  ['todos', 'Todos'], ['nao-lidos', 'Não lidos'], ['critico', 'Crítico'],
  ['aviso', 'Aviso'], ['sucesso', 'Sucesso'], ['info', 'Info'],
];

let alertas = [];
let filtro = 'todos';

const resumoEl = document.getElementById('resumo-alertas');
const filtrosEl = document.getElementById('filtros-alertas');
const listaEl = document.getElementById('lista-alertas');
const erroEl = document.getElementById('erro-alertas');

function categoriaAlerta(alerta) {
  if (alerta.tipo === 'JANELA_COLHEITA_IDEAL') return 'sucesso';
  if (alerta.severidade === 'ALTA' || alerta.severidade === 'CRITICA' || alerta.severidade === 'CRÍTICA') return 'critico';
  if (alerta.severidade === 'MEDIA' || alerta.severidade === 'MÉDIA') return 'aviso';
  return 'info';
}

function estaLido(valor) {
  return valor === true || valor === 1 || valor === '1';
}

function dataFormatada(valor) {
  const data = new Date(valor);
  return Number.isNaN(data.getTime())
    ? 'Horário desconhecido'
    : data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function alertasFiltrados() {
  if (filtro === 'todos') return alertas;
  if (filtro === 'nao-lidos') return alertas.filter(alerta => !estaLido(alerta.lido));
  return alertas.filter(alerta => categoriaAlerta(alerta) === filtro);
}

function mostrarErro(mensagem) {
  erroEl.textContent = mensagem;
  erroEl.classList.remove('hidden');
}

function limparErro() {
  erroEl.textContent = '';
  erroEl.classList.add('hidden');
}

function renderizarResumo() {
  const naoLidos = alertas.filter(alerta => !estaLido(alerta.lido)).length;
  resumoEl.textContent = `${naoLidos} não lidos · ${alertas.length} alertas carregados`;
}

function renderizarFiltros() {
  filtrosEl.replaceChildren();
  for (const [id, nome] of FILTROS) {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = `chip${filtro === id ? ' active' : ''}`;
    botao.dataset.filtro = id;
    botao.textContent = nome;
    filtrosEl.appendChild(botao);
  }
}

function criarAlerta(alerta) {
  const categoria = categoriaAlerta(alerta);
  const tipo = TIPOS[categoria];
  const lido = estaLido(alerta.lido);
  const item = document.createElement('div');
  item.className = `item${lido ? ' read' : ''}`;
  item.style.borderColor = `${tipo.cor}59`;
  item.style.background = `${tipo.cor}1a`;

  const icone = document.createElement('div');
  icone.className = 'item__icon';
  icone.textContent = tipo.icone;
  item.appendChild(icone);

  const corpo = document.createElement('div');
  corpo.className = 'item__body';
  const cabecalho = document.createElement('div');
  cabecalho.className = 'item__head';

  const tituloGrupo = document.createElement('div');
  const badge = document.createElement('span');
  badge.className = 'badge';
  badge.style.background = `${tipo.cor}22`;
  badge.style.color = tipo.cor;
  badge.textContent = tipo.rotulo;
  tituloGrupo.appendChild(badge);

  const titulo = document.createElement('span');
  titulo.className = 'item__title';
  titulo.textContent = TITULOS[alerta.tipo] || 'Alerta do sistema';
  tituloGrupo.appendChild(titulo);
  cabecalho.appendChild(tituloGrupo);

  const acoes = document.createElement('div');
  acoes.className = 'item__actions';
  if (!lido) {
    const botaoLido = document.createElement('button');
    botaoLido.type = 'button';
    botaoLido.className = 'btn-ghost';
    botaoLido.dataset.lido = String(alerta.id_alerta);
    botaoLido.textContent = 'Marcar lido';
    acoes.appendChild(botaoLido);
  }
  const horario = document.createElement('span');
  horario.className = 'item__time';
  horario.textContent = dataFormatada(alerta.criado_em);
  acoes.appendChild(horario);
  cabecalho.appendChild(acoes);
  corpo.appendChild(cabecalho);

  const descricao = document.createElement('p');
  descricao.className = 'item__desc';
  descricao.textContent = alerta.mensagem || 'Sem descrição para este alerta.';
  corpo.appendChild(descricao);

  const metadados = [alerta.setor_codigo && `Setor: ${alerta.setor_codigo}`, alerta.sensor_codigo && `Sensor: ${alerta.sensor_codigo}`]
    .filter(Boolean);
  if (metadados.length) {
    const meta = document.createElement('div');
    meta.className = 'item__meta';
    meta.textContent = metadados.join(' · ');
    corpo.appendChild(meta);
  }

  item.appendChild(corpo);
  return item;
}

function renderizarLista() {
  listaEl.replaceChildren();
  const itens = alertasFiltrados();
  if (!itens.length) {
    const vazio = document.createElement('div');
    vazio.className = 'empty';
    vazio.textContent = 'Nenhum alerta neste filtro.';
    listaEl.appendChild(vazio);
    return;
  }
  for (const alerta of itens) listaEl.appendChild(criarAlerta(alerta));
}

function renderizar() {
  renderizarResumo();
  renderizarFiltros();
  renderizarLista();
}

async function carregarAlertas() {
  try {
    const resposta = await Auth.requisitar('/alertas?limite=200');
    if (!resposta || !Array.isArray(resposta.alertas)) {
      throw new Error('Resposta inválida ao carregar os alertas.');
    }
    alertas = resposta.alertas;
    limparErro();
    renderizar();
  } catch (erro) {
    resumoEl.textContent = 'Alertas indisponíveis';
    mostrarErro(`Não foi possível carregar os alertas: ${erro.message}`);
  }
}

async function marcarComoLido(id, botao) {
  botao.disabled = true;
  limparErro();
  try {
    await Auth.requisitar(`/alertas/${id}/lido`, { metodo: 'PATCH' });
    const alerta = alertas.find(item => Number(item.id_alerta) === id);
    if (alerta) alerta.lido = true;
    renderizar();
  } catch (erro) {
    botao.disabled = false;
    mostrarErro(`Não foi possível marcar o alerta como lido: ${erro.message}`);
  }
}

filtrosEl.addEventListener('click', evento => {
  const botao = evento.target.closest('[data-filtro]');
  if (!botao) return;
  filtro = botao.dataset.filtro;
  renderizar();
});

listaEl.addEventListener('click', evento => {
  const botao = evento.target.closest('[data-lido]');
  if (!botao) return;
  const id = Number(botao.dataset.lido);
  if (Number.isInteger(id) && id > 0) marcarComoLido(id, botao);
});

carregarAlertas();
