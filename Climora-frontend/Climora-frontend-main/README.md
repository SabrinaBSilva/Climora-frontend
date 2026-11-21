# CLIMORA — Front-end

Front-end em **HTML + CSS + JavaScript puro**, com cada tecnologia em arquivos separados.

## Como abrir
Sirva a pasta por HTTP (por exemplo, com a extensão Live Server do VS Code) e abra `index.html`.
O login integrado à API não funciona abrindo o arquivo diretamente como `file://`.
Os gráficos usam Chart.js via CDN, então é preciso internet.

## Estrutura
```
index.html              Redireciona para o login
login/                  login.html · login.css · login.js
dashboard/              dashboard.html · dashboard.css · dashboard.js
sensores/               sensores.html · sensores.css · sensores.js
previsoes/              previsoes.html · previsoes.css · previsoes.js
alertas/                alertas.html · alertas.css · alertas.js
relatorios/             relatorios.html · relatorios.css · relatorios.js
admin/                  admin.html · admin.css · admin.js
shared/css/             base.css, layout.css, components.css (usados por várias telas)
shared/js/              auth.js, layout.js, charts-theme.js (usados por várias telas)
```
Cada tela tem o seu `.css` só com os estilos exclusivos dela; o que é comum fica em `shared/`.

## Autenticação
O login usa `POST /api/autenticacao/login`; as páginas protegidas validam o token em
`GET /api/autenticacao/eu`. As permissões de interface correspondem aos perfis `PRODUTOR`, `ANALISTA` e `ADMIN`
retornados pelo backend. Produtor e Analista acessam previsões e os dados climáticos das
Propriedades vinculadas; Analista e `ADMIN` também podem calibrar os pesos e limiares globais do modelo
na tela de previsões. Somente `ADMIN` enxerga administração e relatórios.

Por padrão, a API é procurada em `http://<host-do-front>:3000/api`. Sirva o front em HTTP
e configure `CORS_ORIGINS` no backend com a origem exata do servidor local, por exemplo:
`http://localhost:5500,http://127.0.0.1:5500`. O usuário deve existir no banco do backend.

## Integração com o back-end
- `shared/js/auth.js` centraliza as chamadas autenticadas e a URL base da API.
- O dashboard usa `/painel`, `/leituras/:idSensor/thingspeak`, `/frutas`, `/previsoes`, `/mercado` e `/alertas`. Para o clima, exibe apenas canais ThingSpeak configurados e não substitui falhas por leituras demonstrativas.
- A tela de alertas lista os registros de `/alertas` e marca como lidos por `PATCH /alertas/:id/lido`.
- A tela de sensores consulta `/leituras/:idSensor/thingspeak`, mostra todo o histórico disponível (mesmo quando a última leitura é antiga), estatísticas de temperatura e umidade e os campos de máxima, mínima e média. Cadastros sem canal permanecem visíveis, identificados como demonstração, sem misturar seus dados ao histórico real. A tela de previsões consulta `/previsoes/historico` (requer a migração RF10 do backend).
- A tela de previsões carrega resultados atuais por `/previsoes?limit=100` e registra uma previsão para a cultura selecionada por `POST /previsoes`. O histórico persistido ainda depende da migração RF10.
- Analistas e administradores calibram o peso de clima e os limiares de recomendação por `GET/PUT /previsoes/configuracao`; a configuração é global e afeta as previsões futuras, sem reescrever o histórico.
- A tela de relatórios consulta `/relatorios/seguranca?dias=7|30|90` e `/relatorios/qualidade` (somente `ADMIN`), exporta auditorias em CSV e baixa o XML por `/relatorios/qualidade/junit`. A instância do backend precisa ter `test-results.xml` na raiz; gere/atualize com `npm run test:report`. O artefato do GitHub Actions continua disponível na execução do workflow.
- A tela de administração lista, cria, edita e ativa/desativa usuários por `/usuarios` (somente `ADMIN`); os perfis disponíveis são `PRODUTOR`, `ANALISTA` e `ADMIN`.
- O gráfico de exportação apresenta o índice de demanda disponível na API; o backend não expõe volume de remessas.
- As demais telas ainda contêm dados demonstrativos e serão integradas requisito por requisito.
- Não coloque as chaves do ThingSpeak no front (RNF02).

## Tema claro / escuro
Tudo está em `shared/js/theme.js` (lógica, botão sol/lua e CSS do tema claro).
- Basta incluir `<script src="../shared/js/theme.js"></script>` no `<head>`, depois dos `<link>` de CSS.
- A escolha é salva no navegador (`localStorage`); na primeira visita segue o tema do sistema.
- Os gráficos (Chart.js) mudam de cor ao alternar — ver `charts-theme.js`.
- Para ajustar as cores do tema claro, edite o bloco `:root[data-theme="light"]` dentro do `theme.js`.
