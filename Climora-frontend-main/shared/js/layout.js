/* layout.js — proteção de rota, dados do usuário e menu lateral */
(async function () {
  const pagina = document.body.dataset.page;
  let usuario;

  try {
    usuario = await Auth.validarSessao();
  } catch (erro) {
    sessionStorage.setItem('climora:aviso', `Não foi possível validar a sessão: ${erro.message}`);
    window.location.replace('../login/login.html');
    return;
  }

  if (!usuario) {
    sessionStorage.setItem('climora:aviso', 'Sua sessão expirou. Entre novamente.');
    window.location.replace('../login/login.html');
    return;
  }

  if (!Auth.podeAcessar(pagina)) {
    sessionStorage.setItem('climora:aviso', `O perfil ${Auth.nomePerfil(usuario.perfil)} não tem acesso a esta tela.`);
    window.location.replace('../dashboard/dashboard.html');
    return;
  }

  const aviso = sessionStorage.getItem('climora:aviso');
  if (aviso) {
    sessionStorage.removeItem('climora:aviso');
    const elemento = document.createElement('div');
    elemento.setAttribute('role', 'alert');
    elemento.textContent = aviso;
    elemento.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:9999;max-width:90vw;' +
      'padding:12px 18px;border-radius:10px;background:#b91c1c;color:#fff;font-size:14px;box-shadow:0 8px 24px rgba(0,0,0,.35)';
    document.body.appendChild(elemento);
    setTimeout(() => elemento.remove(), 6000);
  }

  document.getElementById('user-iniciais').textContent = usuario.iniciais;
  document.getElementById('user-nome').textContent = usuario.nome;
  document.getElementById('user-perfil').textContent = Auth.nomePerfil(usuario.perfil);

  document.querySelectorAll('.nav__link').forEach(link => {
    if (!Auth.podeAcessar(link.dataset.page)) link.classList.add('hidden');
  });

  document.getElementById('btn-sair').addEventListener('click', () => {
    Auth.sair();
    window.location.href = '../login/login.html';
  });

  const sidebar = document.getElementById('sidebar');
  document.getElementById('menu-toggle').addEventListener('click', () => sidebar.classList.toggle('open'));
})();
