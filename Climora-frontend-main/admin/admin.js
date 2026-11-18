/* admin.js — gerenciamento de usuários e perfis via API (RF12) */
let usuarios = [];
let falhaAoCarregar = false;

const CORES_PERFIL = { ADMIN: '#f59e0b', ANALISTA: '#a78bfa', PRODUTOR: '#22d3ee' };
const NOMES_PERFIL = { ADMIN: 'Administrador', ANALISTA: 'Analista', PRODUTOR: 'Produtor' };
const usuarioAtual = Auth.usuario();
const statsEl = document.getElementById('stats-usuarios');
const corpoEl = document.getElementById('corpo-tabela');
const buscaEl = document.getElementById('busca');
const erroEl = document.getElementById('erro-admin');
const statusEl = document.getElementById('status-admin');
const carregarEl = document.getElementById('atualizar-usuarios');
const novoEl = document.getElementById('novo-usuario');
const dialogEl = document.getElementById('usuario-dialog');
const formEl = document.getElementById('form-usuario');
const tituloDialogEl = document.getElementById('titulo-dialog-usuario');
const idEl = document.getElementById('usuario-id');
const nomeEl = document.getElementById('usuario-nome');
const emailEl = document.getElementById('usuario-email');
const senhaEl = document.getElementById('usuario-senha');
const campoSenhaEl = document.getElementById('campo-senha');
const perfilEl = document.getElementById('usuario-perfil');
const erroFormEl = document.getElementById('erro-form-usuario');
const salvarEl = document.getElementById('salvar-usuario');

function estaAtivo(usuario) {
  return usuario.ativo === true || usuario.ativo === 1 || usuario.ativo === '1';
}

function formatarData(valor) {
  if (!valor) return 'Nunca';
  const data = new Date(valor);
  return Number.isNaN(data.getTime())
    ? 'Data desconhecida'
    : data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function iniciais(nome) {
  return String(nome || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(parte => parte[0].toLocaleUpperCase('pt-BR'))
    .join('') || '--';
}

function criarElemento(tag, classe, texto) {
  const elemento = document.createElement(tag);
  if (classe) elemento.className = classe;
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

function limparErro() {
  erroEl.textContent = '';
  erroEl.classList.add('hidden');
}

function mostrarErro(mensagem) {
  erroEl.textContent = mensagem;
  erroEl.classList.remove('hidden');
}

function atualizarStatus(mensagem) {
  statusEl.textContent = mensagem;
  statusEl.classList.toggle('hidden', !mensagem);
}

function renderStats() {
  statsEl.replaceChildren();
  const ativos = usuarios.filter(estaAtivo).length;
  const metricas = [
    ['Total de usuários', usuarios.length],
    ['Usuários ativos', ativos],
    ['Administradores', usuarios.filter(usuario => usuario.perfil === 'ADMIN').length],
    ['Analistas', usuarios.filter(usuario => usuario.perfil === 'ANALISTA').length],
    ['Produtores', usuarios.filter(usuario => usuario.perfil === 'PRODUTOR').length],
  ];

  for (const [titulo, valor] of metricas) {
    const card = criarElemento('div', 'card card--sm stat--simple');
    card.appendChild(criarElemento('div', 'stat__value', String(valor)));
    card.appendChild(criarElemento('div', 'stat__label', titulo));
    statsEl.appendChild(card);
  }
}

function criarCelulaUsuario(usuario) {
  const celula = document.createElement('td');
  const grupo = criarElemento('div', 'user-cell');
  const cor = CORES_PERFIL[usuario.perfil] || '#60a5fa';
  const avatar = criarElemento('div', 'avatar', iniciais(usuario.nome));
  avatar.style.background = `${cor}22`;
  avatar.style.color = cor;
  avatar.style.borderColor = `${cor}55`;
  grupo.appendChild(avatar);

  const textos = document.createElement('div');
  textos.appendChild(criarElemento('div', 'user-cell__name', usuario.nome));
  textos.appendChild(criarElemento('div', 'user-cell__mail', usuario.email));
  grupo.appendChild(textos);
  celula.appendChild(grupo);
  return celula;
}

function criarBotaoAcao(rotulo, acao, id, desabilitado = false) {
  const botao = criarElemento('button', 'btn-outline', rotulo);
  botao.type = 'button';
  botao.dataset.acao = acao;
  botao.dataset.idUsuario = String(id);
  botao.disabled = desabilitado;
  if (desabilitado) botao.title = 'Não é possível desativar a própria conta.';
  return botao;
}

function renderTabela() {
  corpoEl.replaceChildren();
  const termo = buscaEl.value.trim().toLocaleLowerCase('pt-BR');
  const lista = usuarios.filter(usuario =>
    String(usuario.nome).toLocaleLowerCase('pt-BR').includes(termo) ||
    String(usuario.email).toLocaleLowerCase('pt-BR').includes(termo)
  );

  if (!lista.length) {
    const linha = document.createElement('tr');
    const mensagem = falhaAoCarregar
      ? 'Usuários indisponíveis.'
      : usuarios.length ? 'Nenhum usuário encontrado.' : 'Nenhum usuário cadastrado.';
    const celula = criarElemento('td', 'empty', mensagem);
    celula.colSpan = 5;
    linha.appendChild(celula);
    corpoEl.appendChild(linha);
    return;
  }

  for (const usuario of lista) {
    const ativo = estaAtivo(usuario);
    const linha = document.createElement('tr');
    linha.appendChild(criarCelulaUsuario(usuario));

    const perfil = document.createElement('td');
    const cor = CORES_PERFIL[usuario.perfil] || '#60a5fa';
    const badge = criarElemento('span', 'pill', NOMES_PERFIL[usuario.perfil] || 'Usuário');
    badge.style.background = `${cor}15`;
    badge.style.color = cor;
    badge.style.borderColor = `${cor}35`;
    perfil.appendChild(badge);
    linha.appendChild(perfil);

    const status = document.createElement('td');
    status.appendChild(criarElemento('span', `pill ${ativo ? 'pill--green' : 'pill--red'}`, ativo ? '● Ativo' : '● Inativo'));
    linha.appendChild(status);
    linha.appendChild(criarElemento('td', 'td-muted', formatarData(usuario.ultimo_login_em)));

    const acoes = criarElemento('td');
    const grupoAcoes = criarElemento('div', 'row-actions');
    const proprioUsuario = Number(usuario.id_usuario) === Number(usuarioAtual?.id_usuario);
    grupoAcoes.appendChild(criarBotaoAcao(ativo ? 'Desativar' : 'Ativar', 'alternar', usuario.id_usuario, proprioUsuario));
    grupoAcoes.appendChild(criarBotaoAcao('Editar', 'editar', usuario.id_usuario));
    acoes.appendChild(grupoAcoes);
    linha.appendChild(acoes);
    corpoEl.appendChild(linha);
  }
}

async function carregarUsuarios() {
  carregarEl.disabled = true;
  limparErro();
  atualizarStatus('Carregando usuários…');
  try {
    const resposta = await Auth.requisitar('/usuarios');
    if (!resposta || !Array.isArray(resposta.usuarios)) {
      throw new Error('A API retornou uma lista de usuários inválida.');
    }
    usuarios = resposta.usuarios;
    falhaAoCarregar = false;
    renderStats();
    renderTabela();
    atualizarStatus(`${usuarios.length} usuário(s) carregado(s).`);
    return true;
  } catch (erro) {
    usuarios = [];
    falhaAoCarregar = true;
    renderStats();
    renderTabela();
    atualizarStatus('');
    mostrarErro(`Não foi possível carregar os usuários: ${erro.message}`);
    return false;
  } finally {
    carregarEl.disabled = false;
  }
}

function mostrarErroForm(mensagem) {
  erroFormEl.textContent = mensagem;
  erroFormEl.classList.remove('hidden');
}

function limparErroForm() {
  erroFormEl.textContent = '';
  erroFormEl.classList.add('hidden');
}

function abrirDialog(usuario = null) {
  formEl.reset();
  limparErroForm();
  idEl.value = usuario ? String(usuario.id_usuario) : '';
  tituloDialogEl.textContent = usuario ? 'Editar usuário' : 'Novo usuário';
  nomeEl.value = usuario ? usuario.nome : '';
  emailEl.value = usuario ? usuario.email : '';
  perfilEl.value = usuario ? usuario.perfil : 'PRODUTOR';

  const editando = Boolean(usuario);
  campoSenhaEl.classList.toggle('hidden', editando);
  senhaEl.required = !editando;
  senhaEl.disabled = editando;
  const proprioUsuario = usuario && Number(usuario.id_usuario) === Number(usuarioAtual?.id_usuario);
  perfilEl.disabled = Boolean(proprioUsuario);
  dialogEl.showModal();
  nomeEl.focus();
}

function fecharDialog() {
  if (dialogEl.open) dialogEl.close();
}

function atualizarUsuarioNaBarra(usuario) {
  if (Number(usuario.id_usuario) !== Number(usuarioAtual?.id_usuario)) return;
  document.getElementById('user-nome').textContent = usuario.nome;
  document.getElementById('user-iniciais').textContent = iniciais(usuario.nome);
}

async function salvarUsuario(evento) {
  evento.preventDefault();
  limparErroForm();
  if (!formEl.reportValidity()) return;

  const id = idEl.value;
  const corpo = {
    nome: nomeEl.value.trim(),
    email: emailEl.value.trim(),
  };
  if (!id || !perfilEl.disabled) corpo.perfil = perfilEl.value;

  if (!id) {
    const senha = senhaEl.value;
    if (!/[a-z]/.test(senha) || !/[A-Z]/.test(senha) || !/\d/.test(senha)) {
      mostrarErroForm('A senha precisa conter letras maiúsculas, minúsculas e números.');
      return;
    }
    corpo.senha = senha;
  }

  salvarEl.disabled = true;
  try {
    const resposta = await Auth.requisitar(id ? `/usuarios/${id}` : '/usuarios', {
      metodo: id ? 'PUT' : 'POST',
      corpo,
    });
    if (!resposta || !resposta.usuario) throw new Error('A API não confirmou o usuário salvo.');
    atualizarUsuarioNaBarra(resposta.usuario);
    fecharDialog();
    atualizarStatus(id ? 'Usuário atualizado.' : 'Usuário criado.');
    await carregarUsuarios();
  } catch (erro) {
    mostrarErroForm(erro.message);
  } finally {
    salvarEl.disabled = false;
  }
}

async function alternarAtivo(usuario, botao) {
  const proprioUsuario = Number(usuario.id_usuario) === Number(usuarioAtual?.id_usuario);
  if (proprioUsuario) return;

  const novoEstado = !estaAtivo(usuario);
  botao.disabled = true;
  limparErro();
  try {
    const resposta = await Auth.requisitar(`/usuarios/${usuario.id_usuario}`, {
      metodo: 'PUT',
      corpo: { ativo: novoEstado },
    });
    if (!resposta || !resposta.usuario) throw new Error('A API não confirmou a alteração do usuário.');
    if (await carregarUsuarios()) atualizarStatus(`Usuário ${novoEstado ? 'ativado' : 'desativado'}.`);
  } catch (erro) {
    botao.disabled = false;
    mostrarErro(`Não foi possível alterar o status do usuário: ${erro.message}`);
  }
}

corpoEl.addEventListener('click', evento => {
  const botao = evento.target.closest('[data-acao]');
  if (!botao) return;
  const usuario = usuarios.find(item => Number(item.id_usuario) === Number(botao.dataset.idUsuario));
  if (!usuario) return;
  if (botao.dataset.acao === 'editar') abrirDialog(usuario);
  if (botao.dataset.acao === 'alternar') alternarAtivo(usuario, botao);
});

buscaEl.addEventListener('input', renderTabela);
carregarEl.addEventListener('click', carregarUsuarios);
novoEl.addEventListener('click', () => abrirDialog());
document.getElementById('fechar-dialog-usuario').addEventListener('click', fecharDialog);
document.getElementById('cancelar-dialog-usuario').addEventListener('click', fecharDialog);
formEl.addEventListener('submit', salvarUsuario);

renderStats();
renderTabela();
carregarUsuarios();
