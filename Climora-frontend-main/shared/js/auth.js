/**
 * auth.js — autenticação pela API e controle visual de acesso por perfil.
 * A API continua sendo responsável por validar token e permissões.
 */
const Auth = (() => {
  const API_BASE_URL = 'https://temperaturapi.onrender.com';
  const CHAVE_TOKEN = 'climora:token';
  const CHAVE_USUARIO = 'climora:usuario';

  const PERMISSOES = {
    PRODUTOR: ['dashboard', 'sensores', 'previsoes', 'alertas'],
    ANALISTA: ['dashboard', 'sensores', 'previsoes', 'alertas'],
    ADMIN: ['dashboard', 'sensores', 'previsoes', 'alertas', 'relatorios', 'admin'],
  };

  const NOMES_PERFIL = {
    PRODUTOR: 'Produtor',
    ANALISTA: 'Analista',
    ADMIN: 'Administrador',
  };

  function prepararUsuario(usuario) {
    const nome = typeof usuario.nome === 'string' ? usuario.nome.trim() : '';
    const iniciais = nome
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(parte => parte[0].toLocaleUpperCase('pt-BR'))
      .join('');
    return { ...usuario, iniciais };
  }

  function guardarUsuario(usuario) {
    const preparado = prepararUsuario(usuario);
    sessionStorage.setItem(CHAVE_USUARIO, JSON.stringify(preparado));
    return preparado;
  }

  async function requisitar(caminho, { metodo = 'GET', corpo, incluirToken = true } = {}) {
    const headers = { Accept: 'application/json' };
    if (corpo !== undefined) headers['Content-Type'] = 'application/json';
    const token = incluirToken ? sessionStorage.getItem(CHAVE_TOKEN) : null;
    if (token) headers.Authorization = `Bearer ${token}`;

    let resposta;
    try {
      resposta = await fetch(`${API_BASE_URL}${caminho}`, {
        method: metodo,
        headers,
        ...(corpo !== undefined ? { body: JSON.stringify(corpo) } : {}),
      });
    } catch {
      throw new Error('Não foi possível conectar à API. Verifique se o backend está em execução.');
    }

    let dados;
    try {
      dados = await resposta.json();
    } catch {
      throw new Error('A API retornou uma resposta inválida.');
    }

    if (!resposta.ok) {
      const erro = new Error(dados.error || 'Não foi possível concluir a solicitação.');
      erro.status = resposta.status;
      throw erro;
    }
    return dados;
  }

  async function baixarArquivo(caminho, nomeFallback) {
    const headers = { Accept: 'application/xml, application/octet-stream' };
    const token = sessionStorage.getItem(CHAVE_TOKEN);
    if (token) headers.Authorization = `Bearer ${token}`;

    let resposta;
    try {
      resposta = await fetch(`${API_BASE_URL}${caminho}`, { headers });
    } catch {
      throw new Error('Não foi possível conectar à API. Verifique se o backend está em execução.');
    }

    if (!resposta.ok) {
      let mensagem = 'Não foi possível baixar o arquivo.';
      try {
        const dados = await resposta.json();
        if (typeof dados.error === 'string') mensagem = dados.error;
      } catch {
        // Respostas de erro sem JSON mantêm a mensagem padrão.
      }
      const erro = new Error(mensagem);
      erro.status = resposta.status;
      throw erro;
    }

    const disposicao = resposta.headers.get('Content-Disposition') || '';
    const nomeServidor = /filename="?([^";]+)"?/i.exec(disposicao)?.[1];
    const nome = nomeServidor || nomeFallback || 'download';
    const url = URL.createObjectURL(await resposta.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = nome;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return nome;
  }

  async function entrar(email, senha) {
    const dados = await requisitar('/autenticacao/login', {
      metodo: 'POST',
      corpo: { email, senha },
      incluirToken: false,
    });
    if (typeof dados.token !== 'string' || !dados.usuario) {
      throw new Error('A API retornou dados de autenticação inválidos.');
    }
    sessionStorage.setItem(CHAVE_TOKEN, dados.token);
    return guardarUsuario(dados.usuario);
  }

  async function validarSessao() {
    if (!sessionStorage.getItem(CHAVE_TOKEN)) {
      sessionStorage.removeItem(CHAVE_USUARIO);
      return null;
    }

    try {
      const dados = await requisitar('/autenticacao/eu');
      if (!dados.usuario) throw new Error('A API não retornou o usuário da sessão.');
      return guardarUsuario(dados.usuario);
    } catch (erro) {
      if (erro.status === 401) {
        sair();
        return null;
      }
      throw erro;
    }
  }

  function usuario() {
    if (!sessionStorage.getItem(CHAVE_TOKEN)) return null;
    try {
      const salvo = JSON.parse(sessionStorage.getItem(CHAVE_USUARIO));
      return salvo ? prepararUsuario(salvo) : null;
    } catch {
      sair();
      return null;
    }
  }

  function sair() {
    sessionStorage.removeItem(CHAVE_TOKEN);
    sessionStorage.removeItem(CHAVE_USUARIO);
  }

  function podeAcessar(pagina) {
    const atual = usuario();
    return Boolean(atual && PERMISSOES[atual.perfil]?.includes(pagina));
  }

  function nomePerfil(perfil) {
    return NOMES_PERFIL[perfil] || 'Usuário';
  }

  return { entrar, validarSessao, usuario, sair, podeAcessar, nomePerfil, requisitar, baixarArquivo };
})();
