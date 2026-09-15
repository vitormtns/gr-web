# Design System v1

## Conceito

“Território Vivo” traduz o campo por divisas, coordenadas, trajetórias, ocupação e pontos de contexto. A linguagem evita ilustração rural literal e concentra sua assinatura no login, nos estados vazios e na superfície de preparação do painel operacional.

## Fundações

- Tipografia: Inter Variable, uma única família, com hierarquia por peso, tamanho e tracking.
- Paleta: fundo frio `#f5f7f5`, texto `#17211b`, verde profundo `#1f563d` e cores semânticas de sucesso, atenção, perigo e informação.
- Espaçamento: escala de 4 px, exposta por `--space-*`.
- Raios: 6, 10 e 14 px; sem “bubble UI”.
- Elevação: borda e contraste por padrão; `--shadow-floating` apenas para camadas reais.
- Movimento: 140, 210 e 290 ms com easing consistente e desativação efetiva em `prefers-reduced-motion`.
- Breakpoint principal do shell: 64 rem. Conteúdo tem largura máxima de 100 rem.

## Componentes P0

- Primitives: Button, IconButton, Input, Textarea, Select, Checkbox, Radio, Switch, Badge, Chip, Divider e Tooltip.
- Surfaces: Card, Panel, Popover, Menu, Dialog e Drawer.
- Feedback: Toast, Alert, Skeleton, Progress, EmptyState e ErrorState.
- Navigation: Sidebar, Topbar, Breadcrumb, Tabs e ContextSelector.
- Data display: Metric, StatusIndicator, Avatar, Table, Pagination e FilterBar.

Campos implementam `ControlValueAccessor`, associam rótulos e mensagens de erro, e só recebem erro quando a área decide mostrá-lo após interação. Dialog e Drawer usam `<dialog>` nativo, com foco modal e Escape. Popovers usam `summary` sem botões aninhados, fecham com Escape e oferecem ações como botões nativos. Abas aceitam setas, Home e End. A tabela oferece contêiner focável e rolagem horizontal em largura reduzida.

## Escrita de interface

Textos seguem pt-BR, voz ativa, sentence case e instruções acionáveis. Estados vazios explicam a ausência e o próximo passo; erros preservam uma referência de suporte quando disponível.
