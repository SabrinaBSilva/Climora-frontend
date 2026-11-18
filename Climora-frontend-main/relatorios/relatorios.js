/* relatorios.js — auditoria de segurança (RF11) */
const periodoEl = document.getElementById('periodo-relatorio');
const atualizarEl = document.getElementById('atualizar-relatorios');
const baixarEl = document.getElementById('baixar-relatorio');
const resumoEl = document.getElementById('resumo-relatorios');
const listaEl = document.getElementById('lista-relatorios');
const erroEl = document.getElementById('erro-relatorios');
const statusEl = document.getElementById('status-relatorios');
const resumoQualidadeEl = document.getElementById('resumo-qualidade');
const statusQualidadeEl = document.getElementById('status-qualidade');
const baixarJUnitEl = document.getElementById('baixar-junit');

let relatorioAtual = null;
let carregando = false;
let qualidadeDisponivel = false;
let baixandoJUnit = false;

function numero(valor) {
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : 0;
}

function sucesso(valor) {
  return valor === true || valor === 1 || valor === '1';
}

function formatarData(valor) {
  const data = new Date(valor);
  return Number.isNaN(data.getTime())
    ? 'Horário desconhecido'
    : data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
}

function criarElemento(tag, classe, texto) {
  const elemento = document.createElement(tag);
  if (classe) elemento.className = classe;
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

function limparElemento(elemento) {
  elemento.replaceChildren();
}

function mostrarErro(mensagem) {
  erroEl.textContent = mensagem;
  erroEl.classList.remove('hidden');
}

function limparErro() {
  erroEl.textContent = '';
  erroEl.classList.add('hidden');
}

function renderizarResumo(relatorio) {
  limparElemento(resumoEl);
  const linhas = Array.isArray(relatorio.porAcao) ? relatorio.porAcao : [];
  const eventos = linhas.reduce((total, linha) => total + numero(linha.total), 0);
  const eventosBemSucedidos = linhas
    .filter(linha => sucesso(linha.sucesso))
    .reduce((total, linha) => total + numero(linha.total), 0);
  const falhas = linhas
    .filter(linha => !sucesso(linha.sucesso))
    .reduce((total, linha) => total + numero(linha.total), 0);
  const recentes = Array.isArray(relatorio.falhasRecentes) ? relatorio.falhasRecentes : [];

  const metricas = [
    ['Eventos agrupados', eventos],
    ['Ações bem-sucedidas', eventosBemSucedidos],
    ['Falhas agrupadas', falhas],
    ['Falhas recentes detalhadas', recentes.length],
  ];

  for (const [titulo, valor] of metricas) {
    const card = criarElemento('div', 'card card--sm stat--simple');
    card.appendChild(criarElemento('div', 'stat__value', String(valor)));
    card.appendChild(criarElemento('div', 'stat__label', titulo));
    resumoEl.appendChild(card);
  }
}

function criarLinhaAcao(linha) {
  const item = criarElemento('div', 'item item--report');
  const cor = sucesso(linha.sucesso) ? '#4ade80' : '#f87171';
  const barra = criarElemento('div', 'item__bar');
  barra.style.background = cor;
  item.appendChild(barra);

  const corpo = criarElemento('div', 'item__body');
  const cabecalho = criarElemento('div', 'item__head');
  const tituloGrupo = document.createElement('div');
  const badge = criarElemento('span', 'badge', sucesso(linha.sucesso) ? 'Sucesso' : 'Falha');
  badge.style.background = `${cor}22`;
  badge.style.color = cor;
  tituloGrupo.appendChild(badge);
  tituloGrupo.appendChild(criarElemento('span', 'item__title', String(linha.acao || 'Ação desconhecida').replaceAll('_', ' ')));
  cabecalho.appendChild(tituloGrupo);
  cabecalho.appendChild(criarElemento('span', 'pill pill--sm', `${numero(linha.total)} ocorrência(s)`));
  corpo.appendChild(cabecalho);
  item.appendChild(corpo);
  return item;
}

function criarLinhaFalha(falha) {
  const item = criarElemento('div', 'item item--report');
  const barra = criarElemento('div', 'item__bar');
  barra.style.background = '#f87171';
  item.appendChild(barra);

  const corpo = criarElemento('div', 'item__body');
  const cabecalho = criarElemento('div', 'item__head');
  cabecalho.appendChild(criarElemento('span', 'item__title', String(falha.acao || 'Falha de auditoria').replaceAll('_', ' ')));
  cabecalho.appendChild(criarElemento('span', 'item__time', formatarData(falha.criado_em)));
  corpo.appendChild(cabecalho);

  const detalhes = [falha.usuario_nome, falha.detalhe, falha.ip_origem && `IP: ${falha.ip_origem}`]
    .filter(valor => typeof valor === 'string' && valor.trim());
  corpo.appendChild(criarElemento('p', 'item__desc', detalhes.length ? detalhes.join(' · ') : 'Sem detalhes adicionais.'));
  item.appendChild(corpo);
  return item;
}

function renderizarLista(relatorio) {
  limparElemento(listaEl);
  const linhas = Array.isArray(relatorio.porAcao) ? relatorio.porAcao : [];
  const falhas = Array.isArray(relatorio.falhasRecentes) ? relatorio.falhasRecentes : [];

  listaEl.appendChild(criarElemento('h2', 'report-section-title', 'Atividade por ação'));
  if (!linhas.length) {
    listaEl.appendChild(criarElemento('div', 'empty', 'Nenhuma atividade de auditoria neste período.'));
  } else {
    for (const linha of linhas) listaEl.appendChild(criarLinhaAcao(linha));
  }

  listaEl.appendChild(criarElemento('h2', 'report-section-title', 'Falhas recentes'));
  if (!falhas.length) {
    listaEl.appendChild(criarElemento('div', 'empty', 'Nenhuma falha registrada neste período.'));
  } else {
    for (const falha of falhas) listaEl.appendChild(criarLinhaFalha(falha));
  }
}

function renderizar(relatorio) {
  renderizarResumo(relatorio);
  renderizarLista(relatorio);
  baixarEl.disabled = false;
  const dataGeracao = formatarData(relatorio.geradoEm);
  statusEl.textContent = `Período: últimos ${relatorio.periodoDias} dias · Gerado em ${dataGeracao}`;
  statusEl.classList.remove('hidden');
}

function renderizarQualidade(relatorio) {
  limparElemento(resumoQualidadeEl);
  const metricas = [
    ['Testes executados', relatorio.testes],
    ['Aprovados', relatorio.aprovados],
    ['Falhas', relatorio.falhas],
    ['Erros', relatorio.erros],
    ['Ignorados', relatorio.ignorados],
    ['Taxa de sucesso', `${relatorio.taxaSucesso}%`],
  ];

  for (const [titulo, valor] of metricas) {
    const card = criarElemento('div', 'card card--sm stat--simple');
    card.appendChild(criarElemento('div', 'stat__value', String(valor)));
    card.appendChild(criarElemento('div', 'stat__label', titulo));
    resumoQualidadeEl.appendChild(card);
  }

  statusQualidadeEl.textContent = `Relatório JUnit gerado em ${formatarData(relatorio.geradoEm)}.`;
  qualidadeDisponivel = true;
  baixarJUnitEl.disabled = false;
}

async function carregarQualidade() {
  if (Auth.usuario()?.perfil !== 'ADMIN') {
    resumoQualidadeEl.replaceChildren();
    baixarJUnitEl.disabled = true;
    statusQualidadeEl.textContent = 'O relatório de qualidade está disponível apenas para administradores.';
    return;
  }

  qualidadeDisponivel = false;
  baixarJUnitEl.disabled = true;
  statusQualidadeEl.textContent = 'Carregando o último relatório JUnit disponível no backend…';
  try {
    const resposta = await Auth.requisitar('/relatorios/qualidade');
    const camposNumericos = ['testes', 'aprovados', 'falhas', 'erros', 'ignorados', 'taxaSucesso'];
    if (!resposta || camposNumericos.some(campo => !Number.isFinite(Number(resposta[campo]))) || !resposta.geradoEm) {
      throw new Error('A API retornou um resumo de qualidade inválido.');
    }
    renderizarQualidade(resposta);
  } catch (erro) {
    resumoQualidadeEl.replaceChildren();
    statusQualidadeEl.textContent = `Não foi possível carregar o relatório de qualidade: ${erro.message}`;
  }
}

async function baixarJUnit() {
  if (!qualidadeDisponivel || baixandoJUnit) return;
  baixandoJUnit = true;
  baixarJUnitEl.disabled = true;
  statusQualidadeEl.textContent = 'Baixando relatório JUnit…';
  try {
    const nome = await Auth.baixarArquivo('/relatorios/qualidade/junit', 'relatorio-testes.xml');
    statusQualidadeEl.textContent = `Relatório baixado: ${nome}`;
  } catch (erro) {
    statusQualidadeEl.textContent = `Não foi possível baixar o relatório JUnit: ${erro.message}`;
  } finally {
    baixandoJUnit = false;
    baixarJUnitEl.disabled = !qualidadeDisponivel;
  }
}

function limparRelatorio() {
  relatorioAtual = null;
  baixarEl.disabled = true;
  limparElemento(resumoEl);
  limparElemento(listaEl);
  statusEl.textContent = '';
  statusEl.classList.add('hidden');
}

async function carregarRelatorio() {
  if (carregando) return;
  if (Auth.usuario()?.perfil !== 'ADMIN') {
    limparRelatorio();
    mostrarErro('O relatório de segurança está disponível apenas para administradores.');
    return;
  }

  carregando = true;
  atualizarEl.disabled = true;
  periodoEl.disabled = true;
  limparErro();
  limparRelatorio();
  statusEl.textContent = 'Carregando relatório…';
  statusEl.classList.remove('hidden');

  try {
    const dias = Number(periodoEl.value);
    const resposta = await Auth.requisitar(`/relatorios/seguranca?dias=${dias}`);
    if (!resposta || !Array.isArray(resposta.porAcao) || !Array.isArray(resposta.falhasRecentes)) {
      throw new Error('A API retornou um relatório inválido.');
    }
    relatorioAtual = resposta;
    renderizar(resposta);
  } catch (erro) {
    limparRelatorio();
    if (erro.status === 403) {
      mostrarErro('O relatório de segurança está disponível apenas para administradores.');
    } else {
      mostrarErro(`Não foi possível carregar o relatório de segurança: ${erro.message}`);
    }
  } finally {
    carregando = false;
    atualizarEl.disabled = false;
    periodoEl.disabled = false;
  }
}

function protegerCampoCSV(valor) {
  const texto = String(valor ?? '');
  const seguro = /^[\s]*[=+\-@]/.test(texto) ? `'${texto}` : texto;
  return `"${seguro.replaceAll('"', '""')}"`;
}

function baixarCSV() {
  if (!relatorioAtual) return;
  const linhas = [
    ['tipo', 'acao', 'sucesso', 'total', 'usuario', 'detalhe', 'ip', 'data'],
  ];

  for (const item of relatorioAtual.porAcao) {
    linhas.push(['resumo', item.acao, sucesso(item.sucesso) ? 'sim' : 'nao', numero(item.total), '', '', '', '']);
  }
  for (const item of relatorioAtual.falhasRecentes) {
    linhas.push(['falha', item.acao, 'nao', 1, item.usuario_nome, item.detalhe, item.ip_origem, item.criado_em]);
  }

  const conteudo = `\uFEFF${linhas.map(linha => linha.map(protegerCampoCSV).join(';')).join('\r\n')}`;
  const arquivo = new Blob([conteudo], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement('a');
  link.href = url;
  link.download = `relatorio-seguranca-${relatorioAtual.periodoDias}-dias.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

atualizarEl.addEventListener('click', () => {
  carregarRelatorio();
  carregarQualidade();
});
periodoEl.addEventListener('change', carregarRelatorio);
baixarEl.addEventListener('click', baixarCSV);
baixarJUnitEl.addEventListener('click', baixarJUnit);
carregarRelatorio();
carregarQualidade();
