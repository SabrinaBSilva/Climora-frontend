/* login.js — comportamento da tela de login */
(function () {
  const form = document.getElementById('form-login');
  const inputEmail = document.getElementById('email');
  const inputSenha = document.getElementById('senha');
  const erro = document.getElementById('erro-login');
  const botaoEntrar = form.querySelector('[type="submit"]');

  function exibirErro(mensagem) {
    erro.textContent = mensagem;
    erro.classList.remove('hidden');
  }

  function mostrarSessao(usuario) {
    const aviso = document.getElementById('aviso-sessao');
    const nome = document.createElement('strong');
    nome.textContent = usuario.nome;

    aviso.replaceChildren(
      document.createTextNode('Você já está conectado como '),
      nome,
      document.createTextNode(` (${Auth.nomePerfil(usuario.perfil)}). `),
    );

    const continuar = document.createElement('a');
    continuar.href = '../dashboard/dashboard.html';
    continuar.className = 'demo__link';
    continuar.textContent = 'Continuar';

    const trocar = document.createElement('button');
    trocar.type = 'button';
    trocar.className = 'demo__link';
    trocar.textContent = 'Sair e trocar de conta';
    trocar.addEventListener('click', () => {
      Auth.sair();
      aviso.classList.add('hidden');
    });

    aviso.append(continuar, ' · ', trocar);
    aviso.classList.remove('hidden');
  }

  const avisoAnterior = sessionStorage.getItem('climora:aviso');
  if (avisoAnterior) {
    sessionStorage.removeItem('climora:aviso');
    exibirErro(avisoAnterior);
  }

  const atual = Auth.usuario();
  if (atual) mostrarSessao(atual);

  form.addEventListener('submit', async evento => {
    evento.preventDefault();
    erro.classList.add('hidden');
    botaoEntrar.disabled = true;
    botaoEntrar.textContent = 'Entrando…';

    try {
      await Auth.entrar(inputEmail.value, inputSenha.value);
      window.location.href = '../dashboard/dashboard.html';
    } catch (falha) {
      exibirErro(falha.message);
    } finally {
      botaoEntrar.disabled = false;
      botaoEntrar.textContent = 'Entrar';
    }
  });
})();
