# Auditoria final de implementação — Phase 02

A Home operacional foi revisada na branch `feature/portal-dashboard-home`. A fase **não está pronta para aprovação final** enquanto faltar a prova autenticada contra Supabase e `gr-service`. Nenhum resultado da vitrine de desenvolvimento substitui esse smoke.

## CRITICAL

Nenhum defeito crítico identificado nos contratos, testes e revisão visual realizados.

## HIGH

- Smoke autenticado real pendente por configuração externa: `.env.smoke.local` não existe e nenhuma variável `GR_SMOKE_*` está definida nesta sessão. Não foram criadas credenciais fictícias nem executado um smoke com mocks. O gate deve comprovar login, sessão, JWT, organização, fazenda, headers de contexto, overview, attention, activity e cleanup.
- A proporção da barra lateral com a Home na rota autenticada também depende de uma sessão real. A vitrine `/dev/dashboard` isola a Home; sua revisão em 1280 px não deve ser confundida com uma captura da shell autenticada. O layout usa quebra pela largura da área de conteúdo para evitar esmagamento quando a barra lateral reduz a Home.

## MEDIUM

Nenhum defeito médio identificado no escopo efetivamente verificado.

## LOW

- A escolha do período não persiste na URL; dura apenas enquanto o serviço da Home permanece ativo.
- A agenda completa ainda é placeholder da Phase 01; os links apontam para a rota cadastrada.

## Revisão visual

- **1440 px, preenchido:** território e fila lado a lado, rebanho em trilho sem cartões de KPI, matriz legível, gráfico SVG com traços próprios e resumo lateral. Agenda e insights seguem a hierarquia operacional, sem cartões de recomendação genérica.
- **1280 px, preenchido, vazio e erro parcial:** matriz em duas colunas quando o território está ao lado da fila; rótulos, datas, mensagens vazias e retry local permanecem legíveis. A falha de Activity não derruba Overview, Attention ou Paddocks.
- **1024 px landscape, preenchido e período personalizado:** território e fila de atenção empilham; matriz volta a três colunas; gráfico, resumo e chips de séries permanecem utilizáveis, com quebra dos chips quando necessário. O formulário CUSTOM fica íntegro. `documentElement.scrollWidth` foi inferior a `innerWidth` em 1024, 1280 e 1440 px na vitrine.

A matriz informa explicitamente que é uma representação operacional, não cartográfica. Exibe nome, código quando disponível, ocupação e estado inativo quando suportado. Não há geometria geográfica inventada. A revisão não encontrou excesso material de ícones decorativos ou blocos numéricos isolados.

## CSS e implementação

- Antes: CSS da Home em aproximadamente **9,99 kB**, acima do budget de **8 kB**.
- Depois: CSS local da Home em **7.513 bytes**; estilos do território foram isolados no componente `TerritoryOverviewComponent` (**3.429 bytes**). A build de produção passou **sem aviso de budget**. O limite em `angular.json` não foi aumentado e seu diff preexistente permaneceu intocado.
- A Home mantém Overview/Activity separados de Attention/Agenda/Paddocks na troca de período. Cancelamento e geração por seção impedem que resposta tardia da fazenda ou do período anterior substitua a atual. Testes cobrem as duas corridas, falha parcial e retry.
- Controles de período e fila usam estado acessível; o gráfico tem descrição e tabela textual. A interação e a transição usam tokens de movimento existentes, inclusive `prefers-reduced-motion`.

## Evidências finais

- `npm run check`: 17 arquivos, 78 testes verdes e build de produção sem aviso de CSS.
- `npx tsc -p tsconfig.app.json --noEmit`: sem erros.
- `npm audit --audit-level=moderate`: 0 vulnerabilidades.
- `git diff --check`: limpo.
- `/dev/dashboard` é somente desenvolvimento; `/visao-geral` usa o serviço real, sem fixtures.

Após configurar `.env.smoke.local` ou `GR_SMOKE_*`, executar `npm run smoke:local` e revisar a Home autenticada com a shell em 1280 px. Não iniciar Phase 03 nem fazer merge em `main` antes da aprovação visual do usuário.
