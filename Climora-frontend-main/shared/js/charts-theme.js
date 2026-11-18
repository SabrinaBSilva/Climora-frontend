/* charts-theme.js — tema escuro do Chart.js e funções auxiliares */
const Cores = {
  ouro: '#f59e0b', ciano: '#22d3ee', roxo: '#a78bfa', verde: '#4ade80',
  texto: '#93c5fd', grade: 'rgba(255,255,255,0.05)',
};

// Cores de texto/grade de cada tema (o tema é controlado por theme.js)
const PALETAS_TEMA = {
  dark:  { texto: '#93c5fd', grade: 'rgba(255,255,255,0.05)' },
  light: { texto: '#475569', grade: 'rgba(15,23,42,0.08)' },
};

/** Aplica o tema nos gráficos: novos usam os defaults, os existentes são atualizados */
function aplicarTemaNosGraficos(tema) {
  Object.assign(Cores, PALETAS_TEMA[tema] || PALETAS_TEMA.dark);
  Chart.defaults.color = Cores.texto;
  Object.values(Chart.instances).forEach(grafico => {
    grafico.options.color = Cores.texto;
    Object.values(grafico.options.scales || {}).forEach(escala => {
      escala.grid.color = Cores.grade;
      escala.ticks.color = Cores.texto;
    });
    if (grafico.options.plugins.legend) grafico.options.plugins.legend.labels.color = Cores.texto;
    grafico.update();
  });
}
document.addEventListener('climora:tema', e => aplicarTemaNosGraficos(e.detail.tema));

Chart.defaults.color = Cores.texto;
Chart.defaults.font.size = 11;
Chart.defaults.maintainAspectRatio = false;
Chart.defaults.plugins.legend.labels.boxWidth = 10;
Chart.defaults.plugins.tooltip.backgroundColor = '#0f2236';
Chart.defaults.plugins.tooltip.borderColor = 'rgba(34,211,238,0.2)';
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.cornerRadius = 8;

// Tema atual no carregamento (theme.js já rodou no <head>)
Object.assign(Cores, PALETAS_TEMA[document.documentElement.dataset.theme] || PALETAS_TEMA.dark);
Chart.defaults.color = Cores.texto;

/** Degradê vertical usado nos gráficos de área */
function degrade(ctx, cor) {
  const g = ctx.createLinearGradient(0, 0, 0, 220);
  g.addColorStop(0.05, cor + '4d'); // ~30% de opacidade
  g.addColorStop(0.95, cor + '00');
  return g;
}

/** Opções de eixos padrão (sem linhas nas bordas, grade discreta) */
function eixos(extra = {}) {
  return {
    x: { grid: { color: Cores.grade }, border: { display: false } },
    y: { grid: { color: Cores.grade }, border: { display: false }, ...extra },
  };
}

/** Dataset de linha/área */
function serie(rotulo, dados, cor, area = false) {
  return {
    label: rotulo, data: dados, borderColor: cor, borderWidth: 2, tension: 0.4, pointRadius: 0,
    fill: area,
    backgroundColor: area ? ctx => degrade(ctx.chart.ctx, cor) : cor,
  };
}
