# Territory UI — Premium Experience

## Vision

Territory UI é a linguagem visual do BovNex. Combina agricultura de precisão, tecnologia calma e território vivo para tornar relações entre fazenda, rebanho, tempo e operação imediatamente compreensíveis. O sistema deve ser reconhecível pela composição, não apenas pelo logo.

## Principles

- Denso, mas calmo: mais informação útil, menos caixas decorativas.
- Uma hierarquia forte por região da tela.
- O espaço comunica relações e escopo.
- Movimento explica mudança, foco, causalidade ou continuidade.
- Cor comunica identidade ou semântica; nunca decoração gratuita.
- Fixtures do laboratório são identificadas como `DEV SHOWCASE DATA`.

## Tokens

Três camadas organizam a fundação:

1. Primitivos `--gr-color-*`: valores brutos da paleta, documentados e demonstrados no Lab dev-only.
2. Semânticos `--color-*`, `--space-*`, `--radius-*`, `--shadow-*`, `--duration-*` e `--ease-*`: intenção independente de componente.
3. Tokens de componente, como `--control-height`, consomem a camada semântica.

A escala espacial usa base de 4 px: 4, 8, 12, 16, 20, 24, 32, 40, 48 e 64. Valores intermediários exigem justificativa estrutural.

## Typography

Inter Variable é a família instalada, licenciada e carregada localmente. Geist Sans permanece uma recomendação futura, condicionada a avaliação de dependência e licenciamento. A escala principal é: hero 40/44, entidade 32/36, seção 18/24, superfície 15/20, corpo 14/21 e rótulo operacional 11/14. Números comparáveis usam algarismos tabulares; fonte monoespaçada fica restrita a identificadores técnicos.

## Colors

Canvas `#F4F7F4`, superfície `#FFFFFF`, tinta `#0D1B12`, texto secundário `#5F6F65`, identidade `#155B3B`, atenção `#B66A08`, perigo `#C44136`, informação `#356A8A` e reprodução `#7057A8`. Verde identifica marca, ação primária e território, mas não colore toda a interface. Séries de dados não representam estados de interface.

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
5. Não propagar o sistema ao Portal nem mesclar em `main` antes da aprovação humana.
