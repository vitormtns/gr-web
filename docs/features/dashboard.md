# Dashboard operacional — Phase 02

## Dados e contratos

A Home lê exclusivamente o `gr-service`, com JWT do Supabase Auth e headers `X-Organization-Id` e `X-Farm-Id`. Contrato inspecionado no backend MVP `8281424b6ba0b01f68dea138f8c99f9e4996a217`:

- `GET /api/v1/herd/dashboard/overview`: snapshot atual, totais do período, atenção resumida e seis insights determinísticos.
- `GET /api/v1/herd/dashboard/attention?previewSize=5`: fila ordenada pelo backend, com `MANUAL` e `DERIVED` preservados.
- `GET /api/v1/herd/dashboard/activity`: buckets diários completos, inclusive zeros.
- `GET /api/v1/herd/agenda?from=<hoje>&page=0&size=5`: próximos itens, sem reproduzir regra de vencimento no frontend.
- `GET /api/v1/herd/paddocks?page=<n>&size=100`: leitura paginada de piquetes e ocupação.

O período inicial é `LAST_30_DAYS`. `TODAY`, `LAST_7_DAYS` e `LAST_30_DAYS` enviam apenas `period`; `CUSTOM` envia `period`, `from` e `to` em ISO. O máximo de 366 dias é inclusivo: diferença entre as datas inferior a 366. A escolha dura enquanto o serviço estiver ativo na sessão; não é persistida na URL.

## Estado e experiência

`DashboardApiClient` encapsula as leituras, `DashboardStore` mantém Signals por seção e o componente apresenta os dados tipados. Overview e Activity são invalidados ao trocar período; Attention, Agenda e Paddocks não são refeitos sem mudança de contexto. Ao trocar fazenda/organização, a versão de contexto invalida e cancela todas as leituras; um contador por seção também rejeita respostas tardias, mesmo se o transporte ignorar o cancelamento. A shell oculta o conteúdo durante a confirmação do novo contexto.

Falhas e retry são locais à seção. Overview indisponível não remove Attention, Agenda ou Activity. Skeletons preservam a geometria de cada bloco. Fazenda vazia mantém zeros, piquetes ausentes mostram uma mensagem específica e atividade zerada continua fiel aos buckets do backend.

O backend não fornece coordenadas nem polígonos. O território é uma matriz operacional **não cartográfica** de piquetes, ocupação e rebanho atual; não sugere posição geográfica real. A fila preserva a ordem recebida e permite expansão por botão acessível, sem links para páginas de domínio ainda não prontas. O gráfico SVG usa séries selecionáveis, cor e traços distintos, foco com setas e tabela textual acessível. Insights são statements tipados, sem promessas de IA ou scores calculados no navegador.

O layout usa território/atenção lado a lado em notebook amplo; empilha quando a área real de conteúdo se estreita, inclusive com a barra lateral aberta. O território possui componente e CSS próprios, mantendo a Home abaixo do budget original de 8 kB sem alterar `angular.json`. O gráfico mantém a coluna de resumo até o limite móvel. A transição de período mantém a shell e carrega apenas Overview/Activity; movimentos herdam os tokens globais e respeitam `prefers-reduced-motion`.

## Revisão e limitações

`/dev/dashboard` é uma vitrine visual somente em desenvolvimento: `?estado=vazio` e `?estado=falha` exercitam cenários isolados. Servida na configuração de produção, a rota redirecionou para `/entrar`. A rota real `/visao-geral` nunca usa fixtures. A agenda completa ainda é placeholder da Phase 01; o link aponta para a rota existente, não para um endpoint inventado. Não há busca global, clima, notificações ou mapas externos.

O smoke real foi executado contra Supabase Auth e `gr-service` locais com os quatro períodos e as cinco leituras. A configuração de teste fica em `.env.smoke.local`, ignorado pelo Git. Uma conta e contextos descartáveis podem ser provisionados por `node scripts/provision-local-smoke.mjs` quando a stack local estiver saudável; o script usa somente a chave publicável e não imprime credenciais. A vitrine foi revisada em 1440, 1280 e 1024 px, e a rota `/visao-geral` autenticada foi inspecionada em 1280 px com sidebar visível. O contexto aguarda a restauração do JWT antes de carregar a API, evitando 401 transitório no refresh.
