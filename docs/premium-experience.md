# Territory UI — Premium Experience

## Vision

Territory UI é a linguagem de **Spatial Operational Intelligence** do eBov. A interface não descreve uma fazenda: ela mantém território, animais, sinais, processos e tempo em um contexto operacional conectado. Agricultura de precisão, tecnologia calma e território vivo tornam relações imediatamente compreensíveis. O sistema deve ser reconhecível pela composição e pelo comportamento, não apenas pelo logo.

## Principles

- Denso, mas calmo: mais informação útil, menos caixas decorativas.
- Uma hierarquia forte por região da tela.
- O espaço comunica relações e escopo.
- Movimento explica mudança, foco, causalidade ou continuidade.
- Cor comunica identidade ou semântica; nunca decoração gratuita.
- Fixtures do laboratório são identificadas como `DEV SHOWCASE DATA`.

## Objects

A experiência é formada por objetos operacionais vivos: `Entity`, `Signal`, `Field`, `Stream`, `Path`, `Process`, `Pulse`, `Context` e `Action`. Cards continuam disponíveis, mas cada família possui anatomia e comportamento próprios: métrica contém leitura e microvisualização; entidade preserva identidade; atenção prioriza ação; processo mostra estágio; temporal materializa tempo; espacial mantém escopo e relações.

## Cross-object reactions

O Lab usa um estado compartilhado dev-only. Selecionar Mimosa, Aurora ou Estrela atualiza conjuntamente território, peso, saúde, reprodução, movimento e fluxo. Foco e hover realçam relações sem esconder os demais objetos. Selecionar um piquete também pode transferir o contexto para um animal relacionado.

## Dynamic cards

Cards variam por função usando tint, edge, ritmo interno, microvisualização e profundidade controlada. Hover e foco aumentam contraste em 1 px; seleção persiste; atenção usa borda semântica em vez de fundo vermelho; carregamento é local. O catálogo secundário demonstra `MetricCard`, `EntityCard`, `SignalCard`, `AttentionCard`, `ProcessCard`, `TemporalCard`, `SpatialCard` e `ExpandableCard`.

## Focus context

Uma entidade selecionada cria um contexto de foco. Objetos relacionados ficam mais nítidos e os não relacionados recuam discretamente sem mudar o layout. `Escape` limpa hover, expansão e foco contextual.

## Motion causality

“Simular movimentação” enfatiza origem, desenha o trajeto uma vez, atualiza o território e insere o evento no fluxo. Trocas de animal e período atualizam apenas regiões relacionadas. Não há count-up, movimento contínuo ou animação decorativa. Em redução de movimento, o trajeto aparece diretamente.

## Time and streams

Tempo é parte da estrutura: relógio operacional, seletor Hoje/7/30/90 dias, blocos de data, densidade temporal e fluxo recente. `Operation Stream` conecta evento, animal, território e domínio sem se tornar uma lista administrativa.

## Progressive disclosure

O `Animal Signal` responde em três níveis: leitura essencial no estado padrão, affordance em hover/foco e expansão contextual no clique. A identidade persiste durante a expansão; não há troca por modal genérico.

## Tokens

Três camadas organizam a fundação:

1. Primitivos `--gr-color-*`: valores brutos da paleta, documentados e demonstrados no Lab dev-only.
2. Semânticos `--color-*`, `--space-*`, `--radius-*`, `--shadow-*`, `--duration-*` e `--ease-*`: intenção independente de componente.
3. Tokens de componente, como `--control-height`, consomem a camada semântica.

A escala espacial usa base de 4 px: 4, 8, 12, 16, 20, 24, 32, 40, 48 e 64. Valores intermediários exigem justificativa estrutural.

## Typography

Inter Variable é a família instalada, licenciada e carregada localmente para interface e corpo. Desde o Brand Foundation, **Poppins** (`--font-display`, pesos latin 600/700/800 via `@fontsource/poppins`) cobre títulos de página, cabeçalhos de seção, valores de métricas e nome da marca; ver valores vigentes em `## eBov Brand Foundation`. Geist Sans permanece uma recomendação futura, condicionada a avaliação de dependência e licenciamento. A escala principal é: hero 40/44, entidade 32/36, seção 18/24, superfície 15/20, corpo 14/21 e rótulo operacional 11/14. Números comparáveis usam algarismos tabulares; fonte monoespaçada fica restrita a identificadores técnicos.

## Colors

Canvas `#F4F7F4`, superfície `#FFFFFF`, tinta `#0D1B12`, texto secundário `#5F6F65`, identidade `#155B3B`, atenção `#B66A08`, perigo `#C44136`, informação `#356A8A` e reprodução `#7057A8`. Verde identifica marca, ação primária e território, mas não colore toda a interface. Séries de dados não representam estados de interface. Valores oficiais vigentes da marca eBov em `## eBov Brand Foundation`.

## Surface Model

- **Canvas Surface:** relações espaciais, território, gráficos e processos.
- **Data Surface:** tabelas, listas e leitura densa, com separadores precisos.
- **Action Surface:** formulários, confirmação e mutação com rodapé previsível.
- **Insight Surface:** um sinal operacional compacto, com acento semântico contido.

Cards são usados apenas quando o conteúdo precisa permanecer agrupado. As variantes conceituais são base, elevada e interativa; o estado entra por acento, não por um componente diferente para cada cor.

## Motion

Os ritmos são fast 120 ms, standard 180 ms e emphasis 280 ms. A curva padrão é `cubic-bezier(0.2, 0, 0, 1)` e a entrada usa `cubic-bezier(0.16, 1, 0.3, 1)`. Hover desloca no máximo 1 px; ações pressionadas retornam 1 px. Não há pulso, brilho, partículas ou animação decorativa contínua. `prefers-reduced-motion` remove transformações e movimento não essencial.

## Controls

Primary, secondary, ghost e danger compartilham altura padrão de 44 px, raio de 10–12 px, foco visível e largura estável no carregamento. Icon buttons possuem nome acessível e alvo suficiente. Badges comunicam estado; chips representam filtros, atributos ou seleções removíveis.

## Forms

Labels são persistentes, placeholders apenas exemplificam, ajuda antecede o erro e estados disabled/read-only permanecem distintos. Formulários são sequências com introdução, agrupamento, opções e rodapé de ação. O laboratório demonstra formulário simples, operacional, revisão e erro.

## Data Surfaces

Tabelas preservam cabeçalho, separadores, seleção, foco, ações explícitas e rolagem horizontal. A célula de identidade combina nome e identificador; a territorial combina marcador e localização. A barra de filtros separa busca, filtros estruturados, chips ativos e limpeza. A densidade é uma decisão de workspace, não um ajuste arbitrário por linha.

## Timeline

A timeline estabelece eixo, marcadores, evento atual, autoria e tempo. Eventos não são cards independentes. A ordem temporal e a continuidade visual têm prioridade.

## Process Rail

O trilho expõe etapas concluídas, atual e futuras sem carregar regras de negócio. Labels e detalhes vêm do consumidor. Em telas estreitas, o eixo muda de horizontal para vertical.

## Territory

`TerritoryField` recebe regiões e estados declarativos. Ele não calcula capacidade, regras do domínio nem geografia. A representação é explicitamente “sem escala”, abstrata e relacional. Hover/foco alteram preenchimento, traço e ênfase; regiões nunca se movem geograficamente. `TerritoryPath`, escopo, indicadores e ausência de localização completam a leitura operacional.

## Data Visualization

Frames de visualização sempre informam título, período, legenda, leitura e fonte. Estados de atualização suavizam o conteúdo antigo e fazem o novo estado entrar sem salto de layout. Paletas são curtas e semânticas; não há gráficos arco-íris.

## Page Archetypes

O sistema prevê seis estruturas: Home operacional, workspace de entidade, perfil de entidade, workspace de processo, workspace analítico e administração. Elas definem hierarquia e relação espacial, não markup rígido.

## Accessibility

Foco é visível; controles possuem nomes acessíveis; estados não dependem apenas de cor; alvos mantêm área adequada; tabelas têm região rolável identificada; overlays usam `dialog` nativo; teclado, Escape e redução de movimento são suportados. Texto secundário e muted foram mantidos em contraste adequado sobre superfícies claras.

## Responsive

O laboratório foi projetado para 1440, 1280 e 1024 px. Em 1024 px, a navegação lateral vira barra superior rolável, composições reduzem colunas e preservam contexto. Abaixo de 736 px, processos viram eixo vertical, formulários usam uma coluna e tabelas mantêm rolagem própria.

## Performance

A rota `/dev/design-system` permanece condicionada a `ngDevMode`, lazy-loaded e ausente do grafo de produção. Fixtures e estilos exclusivos ficam junto ao componente do Lab. Tokens compartilhados são retrocompatíveis. Budgets não são ampliados.

## Do / Don't

**Faça:** composição densa e calma; hierarquia única; movimento significativo; contexto espacial; bordas precisas; cor contida; estados orientados a ação.

**Não faça:** cemitério de KPIs; verde em tudo; geografia ou métricas falsas; gradientes aleatórios; glassmorphism; animação decorativa; badges em cada célula; menu de três pontos para uma única ação.

## Rollout Strategy

1. Validar visualmente o Lab em 1440, 1280 e 1024 px.
2. Registrar aprovação humana e ajustes de linguagem.
3. Priorizar primitives estáveis por risco e frequência de uso.
4. Reconstruir cada arquétipo por fluxo, com testes funcionais preservados.
5. Propagar por blocos isolados e não mesclar em `main` antes da aprovação humana.

## Production Promotion

O Block 08B promoveu para produção apenas padrões sem dependência de fixtures: `MetricDeck`, `TerritoryField`, a coluna de ações operacionais e o `ContextNavigator`. A página faz o mapeamento de DTOs reais para view models pequenos; os componentes de apresentação não conhecem endpoints. `LiveFarmStage`, controles de cenário e estado demonstrativo continuam exclusivos das rotas condicionadas por `ngDevMode`.

## Shell

O shell real usa o canvas mineral, separação por borda e realce interno discreto. A navegação preserva rotas, permissões, recolhimento e comportamento responsivo. O item ativo combina trilho lateral, tint de superfície, ênfase do ícone e marcador espacial. O topbar mantém apenas contexto e conta, sem busca, notificações ou comandos fictícios.

## Context Ribbon

Organização e fazenda formam uma única faixa territorial compacta. O glifo indica escopo, o separador explicita o caminho e o popover mantém troca de fazenda e organização. Durante uma transição, o conteúdo anterior sai antes da entrada do novo contexto; falhas preservam o contexto anterior quando possível.

## Operational Home

A Home segue a sequência contexto ativo → estado atual → território → atenção → tempo → próximas ações. O cabeçalho é operacional e compacto. Métricas reais ocupam uma faixa única; o campo territorial domina a composição; atenção e agenda compartilham uma coluna de ação; atividade e leitura do rebanho completam o fluxo sem criar um painel de cards equivalentes.

## Real Data Adaptation

Toda leitura de produção deriva de `DashboardStore` e dos contratos existentes. A interface não calcula tendências, capacidade, clima ou recomendações. Mudanças de período invalidam somente visão geral e atividade. Falhas permanecem isoladas por seção, e a proteção contra respostas obsoletas continua no store.

## Sparse Data Rules

- Zero itens de atenção vira o estado compacto “Operação em dia”.
- Zero eventos reduz a atividade a uma leitura curta, sem reservar a altura do gráfico.
- De um a três eventos usa marcas temporais com detalhe textual.
- Acima de três eventos usa o pulso operacional navegável por teclado.
- Agenda vazia e fazenda sem piquetes usam estados compactos e orientativos.
- Poucos dados não são completados com métricas, tendências ou eventos fictícios.

## Territory Layout Rules

O campo territorial é abstrato, determinístico e explicitamente sem escala. De um a seis piquetes usam composições específicas e equilibradas; dois piquetes formam uma divisão orgânica completa, e três usam uma assimetria legível. Acima de seis, cinco regiões permanecem individuais e as demais são agrupadas em “Outros piquetes”, com total real de animais e quantidade real de piquetes. A densidade usa um único pattern SVG com opacidade proporcional, sem nós por animal. Animais sem localização aparecem fora do campo. Seleção reforça a região, suaviza as demais e oferece resumo textual.

## eBov Brand Foundation

A identidade visual do produto é **eBov**. Estes tokens e regras formam a fundação do Portal; a arquitetura visual operacional Territory UI continua existindo sobre ela.

### Official colors

- `--brand-primary: #0F5132` — marca, ação primária, território.
- `--brand-live: #22C55E` — sinal de vida/crescimento/estado ativo (rails, marcadores, indicadores). Nunca como fundo gigante nem como cor de texto sobre fundo claro.
- `--brand-amber: #F59E0B` — atenção e sinal de produtividade (indicadores e marcadores, nunca decoração).
- `--brand-ink: #1F2937` — texto primário (`--text-primary`).
- `--brand-neutral: #E5E7EB` — base das bordas (`--border-soft`).
- `--brand-canvas: #FAFAF8` — canvas global (`--canvas-base`).

Texto em âmbar continua usando o tom escuro legível (`--semantic-warning: #b36605`); o âmbar oficial aparece em indicadores, não em texto corrido. Texto de sucesso continua no verde escuro legível (`--semantic-success`); o verde vivo aparece em sinais, não em texto.

### Typography roles

- `--font-display: Poppins` — títulos de página (`h1`), cabeçalhos de seção (`h2`), valores de métricas operacionais, nome da marca. Carregada localmente via `@fontsource/poppins` (pesos latin 600/700/800), mesmo mecanismo do Inter.
- `--font-interface: Inter Variable` — corpo, controles, tabelas, navegação, texto secundário e técnico. Continua sendo a fonte principal da interface.

### Brand vs domain colors

A marca não transforma tudo em verde. Cores de domínio com função semântica são preservadas: peso (violeta), movimento (teal/mineral blue), reprodução (plum), saúde (verde/âmbar quando devido), atenção (âmbar), overdue (vermelho de perigo). A marca entra por tint, borda, pequenos indicadores e acentos tipográficos.

### Sidebar usage

Fundo sólido `--brand-primary`, texto off-white, ícones sage claro, rótulos de grupo em off-white com opacidade controlada. Item ativo: superfície branca translúcida (`rgba(255,255,255,0.12)`) com borda sutil, label e ícone brancos, trilho/marcador em `--brand-live`. Hover: branco em alpha baixo, sem pintar o item de verde vivo. Foco de teclado preservado com anel claro.

### Canvas

Base `--brand-canvas` (`#FAFAF8`), com nuances minerais discretas herdadas. Sem imagem, sem fotografia.

### Positive vs attention semantics

`--brand-live` (`#22C55E`): crescimento, atividade, estado ativo. `--brand-amber` (`#F59E0B`): atenção, vencimento próximo, produtividade. Vermelho (`--semantic-danger`) fica reservado a atraso/criticidade real (`OVERDUE`).

### Logo asset locations

- `public/brand/ebov/logo-horizontal.svg` — uso geral sobre fundo claro.
- `public/brand/ebov/logo-negative.svg` — sidebar verde e fundos escuros (referenciado pelo shell, com fallback textual `eBov`).
- `public/brand/ebov/symbol.svg` — símbolo isolado.
- `public/brand/ebov/app-icon.png` — ícone do aplicativo.

Os arquivos ainda não existem; quando disponíveis, colocá-los nesses caminhos. Não commitar reconstruções provisórias.
