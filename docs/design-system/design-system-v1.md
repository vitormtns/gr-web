# Design System v1

## Conceito

“Território Vivo” traduz o campo por divisas, trajetórias e pontos de contexto. A linguagem evita ilustração rural literal. Sua assinatura aparece com parcimônia no login, no ContextNavigator, no estado vazio e na troca de contexto; não é textura de fundo para cartões. O símbolo de marca atual permanece provisório; o trabalho completo de branding fica para uma etapa futura.

## Fundações

- Tipografia: Inter Variable, uma única família, com hierarquia por peso, tamanho e tracking.
- Paleta: fundo frio `#f5f7f5`, texto `#17211b`, verde profundo `#1f563d` e cores semânticas de sucesso, atenção, perigo e informação.
- Espaçamento: escala de 4 px, exposta por `--space-*`.
- Raios: 6, 10 e 14 px; sem “bubble UI”.
- Elevação: borda e contraste por padrão; `--shadow-floating` apenas para camadas reais.
- Movimento: 140, 210 e 290 ms com easing consistente e desativação efetiva em `prefers-reduced-motion`.
- Controles: `--control-height` de 42 px e `--control-height-small` de 34 px. Campos têm estados hover, foco com borda e halo, erro, desabilitado e somente leitura. Select mantém o elemento nativo acessível com caret e espaçamento próprios.
- Breakpoint principal do shell: 64 rem. Conteúdo tem largura máxima de 100 rem.

## Componentes P0

- Primitives: Button, IconButton, Input, Textarea, Select, Checkbox, Radio, Switch, Badge, Chip, Divider e Tooltip.
- Surfaces: Card, Panel, Popover, Menu, Dialog e Drawer.
- Feedback: Toast, Alert, Skeleton, Progress, EmptyState e ErrorState.
- Navigation: Sidebar, Topbar, Breadcrumb, Tabs e ContextNavigator. ContextSelector continua disponível como primitivo nativo.
- Data display: Metric, StatusIndicator, AttentionItem, Avatar, Table, Pagination e FilterBar.

Campos implementam `ControlValueAccessor`, associam rótulos e mensagens de erro, e só recebem erro quando a área decide mostrá-lo após interação. Senha pode ser exibida por botão com `aria-pressed`. Dialog e Drawer usam `<dialog>` nativo, com foco modal e Escape. Popovers usam `summary` sem botões aninhados, fecham com Escape e oferecem ações como botões nativos. Abas aceitam setas, Home e End. A tabela oferece contêiner focável, rolagem horizontal, linha selecionada, foco em ações e estados vazio/carregando.

## Padrões do produto

O ContextNavigator apresenta “Organização › Fazenda” como uma única unidade. Seu popover compacto distingue organização atual, fazendas disponíveis e a ação de trocar organização; Escape fecha e devolve o foco. A sidebar marca a rota ativa com verde sutil, indicador vertical e `aria-current="page"`; hover é menos forte. OperationalStatus usa ponto semântico, Badge classifica e Chip representa filtro interativo. Metric, AttentionItem e TerritoryIndicator têm exemplos isolados em `/dev/design-system`, sem constituir um painel de negócio.

Na troca de contexto, o conteúdo anterior deixa de ser exibido imediatamente, uma indicação territorial e carregamento localizado aparecem, e o novo conteúdo entra em até 290 ms. Os tokens `--duration-fast`, `--duration-standard`, `--duration-context` e os easings são compartilhados; movimento é reduzido conforme a preferência do sistema. Sombras ficam restritas a camadas flutuantes.

## Escrita de interface

Textos seguem pt-BR, voz ativa, sentence case e instruções acionáveis. Estados vazios explicam a ausência e o próximo passo; erros preservam uma referência de suporte quando disponível.
