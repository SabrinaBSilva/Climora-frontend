const API_URL = 'https://temperaturapi.onrender.com';

const form = document.getElementById('form');
const erro = document.getElementById('erro');
const botao = document.getElementById('enviar');
const campoCnpj = document.getElementById('cnpj');

const digitos = (v) => v.replace(/\D/g, '');

function cnpjValido(valor) {
  return digitos(valor).length === 14;
}

campoCnpj.addEventListener('input', () => {
  const d = digitos(campoCnpj.value).slice(0, 14);
  campoCnpj.value = d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
});

function mostrarErro(msg, campo) {
  erro.textContent = msg;
  erro.hidden = false;
  form.querySelectorAll('input').forEach((i) => i.removeAttribute('aria-invalid'));
  if (campo) { campo.setAttribute('aria-invalid', 'true'); campo.focus(); }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  erro.hidden = true;
  const f = Object.fromEntries(new FormData(form));
  const nome = f.nome.trim();
  const email = f.email.trim().toLowerCase();

  if (nome.length < 2) return mostrarErro('Informe seu nome.', form.nome);
  if (!/^\S+@\S+\.\S+$/.test(email)) return mostrarErro('Informe um e-mail válido.', form.email);
  if (!cnpjValido(f.cnpj)) return mostrarErro('CNPJ inválido. Confira os números.', form.cnpj);
  if (f.senha.length < 10 || !/[a-z]/.test(f.senha) || !/[A-Z]/.test(f.senha) || !/\d/.test(f.senha)) {
    return mostrarErro('A senha precisa ter 10 caracteres ou mais, com maiúscula, minúscula e número.', form.senha);
  }
  if (f.senha !== f.confirmar) return mostrarErro('As senhas não são iguais.', form.confirmar);

  botao.disabled = true;
  botao.textContent = 'Criando conta...';
  try {
    const resp = await fetch(`${API_URL}/api/autenticacao/registrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, cnpj: digitos(f.cnpj), senha: f.senha }),
    });
    const dados = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const detalhe = dados.detalhes?.[0]?.mensagem;
      throw new Error(detalhe || dados.error || 'Não foi possível criar a conta. Tente de novo.');
    }
    form.hidden = true;
    document.getElementById('rodape').hidden = true;
    document.getElementById('sucesso').hidden = false;
  } catch (err) {
    const rede = err instanceof TypeError;
    mostrarErro(rede ? 'Sem conexão com o servidor. Se acabou de abrir o site, aguarde um minuto e tente de novo.' : err.message);
  } finally {
    botao.disabled = false;
    botao.textContent = 'Criar conta';
  }
});
