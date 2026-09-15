# Auditoria final de implementação — Phase 02

A Home operacional foi revisada na branch `feature/portal-dashboard-home`, inclusive com uma sessão real no Supabase local e a shell autenticada. A Phase 02 está tecnicamente pronta para a aprovação visual final do usuário; nenhum mock participou da prova de integração.

## CRITICAL

Nenhum defeito crítico identificado nos contratos, testes e revisão visual realizados.

## HIGH

Nenhum finding alto permanece após a prova real e a correção da corrida de restauração.

## MEDIUM

Nenhum defeito médio identificado no escopo efetivamente verificado.

## LOW

- A escolha do período não persiste na URL; dura apenas enquanto o serviço da Home permanece ativo.
- A agenda completa ainda é placeholder da Phase 01; os links apontam para a rota cadastrada.
- A conta descartável de desenvolvimento e `.env.smoke.local` permanecem somente na stack local para repetir a inspeção; o arquivo é ignorado pelo Git. O cenário opcional 403 com um segundo usuário `VIEWER` não foi necessário para os gates desta fase.

## Revisão visual

- **1440 px, preenchido:** território e fila lado a lado, rebanho em trilho sem cartões de KPI, matriz legível, gráfico SVG com traços próprios e resumo lateral. Agenda e insights seguem a hierarquia operacional, sem cartões de recomendação genérica.
- **1280 px, preenchido, vazio e erro parcial:** matriz em duas colunas quando o território está ao lado da fila; rótulos, datas, mensagens vazias e retry local permanecem legíveis. A falha de Activity não derruba Overview, Attention ou Paddocks.
- **1024 px landscape, preenchido e período personalizado:** território e fila de atenção empilham; matriz volta a três colunas; gráfico, resumo e chips de séries permanecem utilizáveis, com quebra dos chips quando necessário. O formulário CUSTOM fica íntegro. `documentElement.scrollWidth` foi inferior a `innerWidth` em 1024, 1280 e 1440 px na vitrine.
- **1280 px autenticado, com barra lateral real:** sidebar de 248 px, workspace de 1.032 px e seções úteis de 968 px. Território e fila empilham; o território mantém destaque, três piquetes legíveis e rebanho real. Gráfico e resumo continuam utilizáveis; agenda e insights ocupam colunas de 474 px sem clipping. `documentElement.scrollWidth` foi 1.280 px, igual ao viewport. ContextNavigator, topbar e controle de período não se sobrepõem; nomes longos são abreviados no navegador, mas o contexto completo permanece no cabeçalho da Home.

A matriz informa explicitamente que é uma representação operacional, não cartográfica. Exibe nome, código quando disponível, ocupação e estado inativo quando suportado. Não há geometria geográfica inventada. A revisão não encontrou excesso material de ícones decorativos ou blocos numéricos isolados.

## CSS e implementação

- Antes: CSS da Home em aproximadamente **9,99 kB**, acima do budget de **8 kB**.
- Depois: CSS local da Home em **7.513 bytes**; estilos do território foram isolados no componente `TerritoryOverviewComponent` (**3.429 bytes**). A build de produção passou **sem aviso de budget**. O limite em `angular.json` não foi aumentado e seu diff preexistente permaneceu intocado.
- A Home mantém Overview/Activity separados de Attention/Agenda/Paddocks na troca de período. Cancelamento e geração por seção impedem que resposta tardia da fazenda ou do período anterior substitua a atual. Testes cobrem as duas corridas, falha parcial e retry.
- Controles de período e fila usam estado acessível; o gráfico tem descrição e tabela textual. A interação e a transição usam tokens de movimento existentes, inclusive `prefers-reduced-motion`.
- O `contextGuard` agora aguarda `AuthStore.initialize()` antes de iniciar `ContextStore.initialize()`. Os guards podem executar em paralelo: antes da correção, requisições sem bearer recebiam 401 durante o refresh e o interceptor encerrava uma sessão válida. A prova autenticada repetida confirmou refresh sem 401, manutenção da Home e troca de Fazenda Norte para Fazenda Sul com novo `X-Farm-Id` e rebanho atualizado.

## Integração local real

- Configuração resolvida a partir de `../gr-service/supabase/config.toml`, `application-local.yml`, `supabase/README.md`, `scripts/smoke-auth-local.ps1` e status estruturado da CLI Supabase. Auth e readiness do backend responderam 200. A chave publicável ativa coincidiu com `environment.local.ts`; nenhum `service_role`, segredo JWT ou senha do banco foi colocado no frontend.
- Uma conta de teste nova foi criada exclusivamente no Supabase de `127.0.0.1:54321`; duas organizações, três fazendas, piquetes e animais de desenvolvimento foram inseridos no PostgreSQL local existente sem resetar dados anteriores. A configuração foi gravada em `.env.smoke.local`, ignorado pelo Git, com a senha entre aspas para preservar o caractere `#` na leitura do Node. Nenhum valor secreto foi registrado aqui.
- `npm run smoke:local` passou com login, sessão, restauração, refresh, JWT, logout/cleanup, `GET /api/v1/me`, `/me/organizations`, `/me/organizations/{id}/farms`, `/context`, `/farms/current`, `/herd/dashboard/overview`, `/herd/dashboard/attention`, `/herd/dashboard/activity`, `/herd/agenda` e `/herd/paddocks`. Exercitou `TODAY`, `LAST_7_DAYS`, `LAST_30_DAYS` e `CUSTOM`, três contextos e cenários 400/401/404/409 sem fabricar falha 500.
- Na Home real, as cinco leituras usaram bearer e os headers `X-Organization-Id`/`X-Farm-Id`. Payloads reais mostraram snapshot com cinco animais, 30 buckets diários zerados, cinco itens `DERIVED` de atenção, arrays tipados, datas ISO e os seis tipos de insight previstos. A troca de fazenda alterou o header, a contagem e a matriz; não permaneceu dado da fazenda anterior.

## Evidências finais

- `npm run check`: 17 arquivos, 80 testes verdes e build de produção sem aviso de CSS.
- `npx tsc -p tsconfig.app.json --noEmit`: sem erros.
- `npm audit --audit-level=moderate`: 0 vulnerabilidades.
- `git diff --check`: limpo.
- `/dev/dashboard` é somente desenvolvimento; `/visao-geral` usa o serviço real, sem fixtures.

Não iniciar Phase 03 nem fazer merge em `main` antes da aprovação visual do usuário.
