/**
 * theme.js — tema claro/escuro do CLIMORA (tudo neste único arquivo).
 *
 * O que ele faz:
 *  1. Descobre o tema: escolha salva do usuário > preferência do sistema > escuro.
 *  2. Aplica o tema em <html data-theme="light|dark"> ANTES da página aparecer
 *     (por isso o <script> fica no <head>) — evita o "flash" de tema errado.
 *  3. Injeta o CSS do tema claro (as cores do tema escuro continuam em base.css).
 *  4. Cria o botão de alternar (sol/lua) sozinho: na barra lateral das telas
 *     internas, ou flutuante no canto da tela de login.
 *  5. Avisa os gráficos (charts-theme.js) quando o tema muda, via evento.
 *
 * Uso: <script src="../shared/js/theme.js"></script> no <head>, depois dos <link> de CSS.
 * API: Tema.atual() · Tema.definir('light'|'dark') · Tema.alternar()
 */
const Tema = (() => {
  const CHAVE = 'climora:tema';
  const EVENTO = 'climora:tema';
  const raiz = document.documentElement;

  /* ---------- 1. Leitura / gravação da preferência ---------- */
  function salvo() {
    try { const v = localStorage.getItem(CHAVE); return v === 'light' || v === 'dark' ? v : null; }
    catch { return null; } // armazenamento bloqueado: segue sem persistir
  }
  function doSistema() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  function atual() { return raiz.dataset.theme === 'light' ? 'light' : 'dark'; }

  /* ---------- 2. Aplicar tema ---------- */
  function aplicar(tema) {
    raiz.dataset.theme = tema;
    raiz.style.colorScheme = tema; // scrollbars e campos nativos acompanham
    atualizarBotoes();
    document.dispatchEvent(new CustomEvent(EVENTO, { detail: { tema } }));
  }
  function definir(tema) {
    if (tema !== 'light' && tema !== 'dark') return;
    try { localStorage.setItem(CHAVE, tema); } catch { /* ignora */ }
    aplicar(tema);
  }
  function alternar() { definir(atual() === 'dark' ? 'light' : 'dark'); }

  /* ---------- 3. CSS do tema claro ---------- */
  const CSS_CLARO = `
  /* Variáveis: o tema claro redefine a paleta; o resto do CSS já usa var(--...) */
  :root[data-theme="light"] {
    --navy-950: #eaf0f7;   /* fundo geral */
    --navy-900: #ffffff;   /* sidebar / painéis */
    --navy-800: #ffffff;   /* cards */
    --navy-700: #e2e8f0;
    --navy-500: #94a3b8;
    --gold: #b45309;       /* texto/ícones dourados com contraste no branco */
    --cyan: #0e7490;
    --purple: #6d28d9;
    --green: #15803d;
    --red: #b91c1c;
    --blue-200: #334155;
    --blue-300: #475569;
    --blue-400: #5b6b80;
    --blue-500: #64748b;
    --border: rgba(15, 23, 42, 0.10);
  }
  [data-theme="light"] body { color: #0f172a; }
  [data-theme="light"] .card { box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05); }

  /* Textos que eram branco fixo */
  [data-theme="light"] .stat--simple .stat__value,
  [data-theme="light"] .btn-ghost:hover,
  [data-theme="light"] .btn-outline:hover,
  [data-theme="light"] .nav__link:hover,
  [data-theme="light"] .menu-toggle,
  [data-theme="light"] .search input,
  [data-theme="light"] .field input { color: #0f172a; }
  [data-theme="light"] .mini-alert p { color: #1e293b; }

  /* Botões/avatar dourados mantêm o dourado vivo e texto escuro */
  [data-theme="light"] .btn--primary,
  [data-theme="light"] .form__submit,
  [data-theme="light"] .user__avatar { background: #f59e0b; color: #0b1929; }
  [data-theme="light"] .nav__link.active { background: rgba(245, 158, 11, 0.16); }

  /* Fundos/bordas escuros fixos -> equivalentes claros */
  [data-theme="light"] .sidebar,
  [data-theme="light"] .sidebar__brand,
  [data-theme="light"] .sidebar__user,
  [data-theme="light"] thead tr,
  [data-theme="light"] td,
  [data-theme="light"] .table-wrap { border-color: rgba(15, 23, 42, 0.10); }
  [data-theme="light"] .search input,
  [data-theme="light"] .btn-outline,
  [data-theme="light"] .chip,
  [data-theme="light"] .demo,
  [data-theme="light"] .demo__item { border-color: rgba(15, 23, 42, 0.16); }
  [data-theme="light"] .chip,
  [data-theme="light"] .mini-alert { background: #f1f5f9; }
  [data-theme="light"] .chip.active { background: rgba(245, 158, 11, 0.16); color: #b45309; }
  [data-theme="light"] .nav__link:hover,
  [data-theme="light"] .demo__item:hover { background: rgba(15, 23, 42, 0.06); }
  [data-theme="light"] tbody tr:nth-child(even) { background: #f8fafc; }
  [data-theme="light"] .field input { background: #f1f5f9; border-color: var(--cyan); }
  [data-theme="light"] .demo { background: #f8fafc; }
  [data-theme="light"] .demo__item { background: #f1f5f9; }
  [data-theme="light"] .progress { background: rgba(15, 23, 42, 0.08); }
  [data-theme="light"] .sensor.selected { background: rgba(245, 158, 11, 0.12); }

  /* Cores vindas do JS (inline) ficam escurecidas para ler bem no fundo claro */
  [data-theme="light"] .badge[style],
  [data-theme="light"] .pill[style],
  [data-theme="light"] .avatar[style],
  [data-theme="light"] .culture__window span,
  [data-theme="light"] .progress-row span:last-child,
  [data-theme="light"] #resumo-alertas span { filter: brightness(0.62) saturate(1.3); }

  /* A coluna da imagem do login continua escura nos dois temas */
  [data-theme="light"] .login__hero {
    --navy-950: #07111e; --gold: #f59e0b;
    --blue-200: #bfdbfe; --blue-300: #93c5fd; --blue-400: #60a5fa;
    color: #fff;
  }

  /* Botão de alternar tema */
  .tema-toggle {
    width: 32px; height: 32px; flex-shrink: 0;
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: 8px;
    background: none; border: 1px solid transparent;
    color: var(--blue-400);
    transition: color 0.15s, background 0.15s, border-color 0.15s;
  }
  .tema-toggle:hover { color: var(--gold); background: rgba(245, 158, 11, 0.12); }
  .tema-toggle:focus-visible { outline: 2px solid var(--cyan); outline-offset: 2px; }
  .tema-toggle svg { display: block; }
  .tema-toggle .ico-sol { display: none; }
  [data-theme="dark"] .tema-toggle .ico-sol { display: block; }
  [data-theme="dark"] .tema-toggle .ico-lua { display: none; }
  /* versão flutuante (tela de login) */
  .tema-toggle--flutuante {
    position: fixed; top: 16px; right: 16px; z-index: 40;
    width: 40px; height: 40px;
    background: var(--navy-800); border-color: var(--border);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
  }
  body, .card, .sidebar, .app { transition: background-color 0.2s, color 0.2s, border-color 0.2s; }
  @media (prefers-reduced-motion: reduce) {
    body, .card, .sidebar, .app { transition: none; }
  }`;

  function injetarCSS() {
    const estilo = document.createElement('style');
    estilo.id = 'climora-tema-css';
    estilo.textContent = CSS_CLARO;
    document.head.appendChild(estilo);
  }

  /* ---------- 4. Botão de alternar ---------- */
  const ICONES = `
    <svg class="ico-sol" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
    <svg class="ico-lua" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

  function criarBotao(flutuante) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tema-toggle' + (flutuante ? ' tema-toggle--flutuante' : '');
    b.innerHTML = ICONES;
    b.addEventListener('click', alternar);
    return b;
  }
  function atualizarBotoes() {
    const claro = atual() === 'light';
    document.querySelectorAll('.tema-toggle').forEach(b => {
      b.setAttribute('aria-label', claro ? 'Ativar tema escuro' : 'Ativar tema claro');
      b.title = claro ? 'Tema escuro' : 'Tema claro';
      b.setAttribute('aria-pressed', String(!claro));
    });
  }
  function montarBotao() {
    const rodape = document.querySelector('.sidebar__user'); // telas internas
    if (rodape) rodape.insertBefore(criarBotao(false), document.getElementById('btn-sair') || null);
    else document.body.appendChild(criarBotao(true));        // login
    atualizarBotoes();
  }

  /* ---------- 5. Inicialização ---------- */
  injetarCSS();
  aplicar(salvo() || doSistema());

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montarBotao);
  else montarBotao();

  // Acompanha o sistema, mas só se o usuário nunca escolheu manualmente
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const seguir = e => { if (!salvo()) aplicar(e.matches ? 'light' : 'dark'); };
    mq.addEventListener ? mq.addEventListener('change', seguir) : mq.addListener(seguir);
  }
  // Mantém abas abertas sincronizadas
  window.addEventListener('storage', e => {
    if (e.key === CHAVE && (e.newValue === 'light' || e.newValue === 'dark')) aplicar(e.newValue);
  });

  return { atual, definir, alternar };
})();
