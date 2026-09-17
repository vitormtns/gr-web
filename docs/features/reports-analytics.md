# Relatórios e análises

## Arquitetura

A Phase 05 concentra as leituras pecuárias em `/relatorios`, carregada de forma lazy. `ReportsApi` mapeia filtros tipados para oito endpoints explícitos do `gr-service`; o componente mantém somente o relatório ativo em memória. O backend continua sendo a fonte de verdade para resumos, autorização, isolamento por tenant/fazenda e semântica histórica.

Cada resposta usa o envelope `summary`, `items`, `page`, `size`, `totalElements` e `totalPages`. O resumo representa todo o conjunto filtrado e nunca é recalculado a partir da página visível. Não há chamadas por linha nem busca de perfis para complementar resultados.

## Relatórios

| Leitura no produto | Endpoint | Representação principal |
| --- | --- | --- |
| Posição do rebanho | `/api/v1/herd/reports/herd-position` | composição atual por sexo e piquete |
| Ciclo do rebanho | `/api/v1/herd/reports/lifecycle` | contagem de eventos e detalhe temporal |
| Movimentações | `/api/v1/herd/reports/movements` | fluxo interno origem → destino |
| Transferências | `/api/v1/herd/reports/transfers` | entradas e saídas entre fazendas |
| Pesagens | `/api/v1/herd/reports/weights` | amplitude agregada e medições |
| Saúde | `/api/v1/herd/reports/health` | tratamentos efetivamente realizados |
| Reprodução | `/api/v1/herd/reports/reproduction` | sequência factual do processo reprodutivo |
| Execução do planejamento | `/api/v1/herd/reports/planner` | estados dos itens planejados |

Não existem rotas paralelas por endpoint. A trilha analítica dentro do workspace mantém descoberta rápida, enquanto a sidebar expõe apenas “Relatórios”. Links de animais reutilizam `/rebanho/animais/{id}` e respeitam a não enumeração aplicada pelo backend.

## Filtros, período e paginação

Datas são inclusivas. Relatórios históricos aceitam `from` e `to`; a interface inicia em 30 dias, oferece atalhos de 7 dias, 30 dias e 12 meses e valida o limite real de 3.650 dias antes da requisição. Posição do rebanho é um snapshot e não recebe período.

Filtros específicos são enviados somente ao endpoint que os suporta. Página e tamanho usam paginação server-side. Estado estável — relatório, período, filtros e página — fica na query string, permitindo refresh, voltar e avançar. Parâmetros desconhecidos, enums inválidos e UUIDs malformados são descartados na leitura da URL.

## Concorrência e contexto

Cada carregamento recebe uma geração monotônica. Respostas anteriores são ignoradas depois de troca de relatório, período, filtro, página ou fazenda. A alteração do contexto invalida imediatamente o resultado atual e impede que dados da fazenda anterior reapareçam. O transporte HTTP também é encerrado com a destruição do componente.

## Semântica e privacidade

- Movimentação é deslocamento interno entre piquetes; transferência é mudança de custódia entre fazendas.
- Transferências exibem somente `sourceFarm`, `destinationFarm` e `destinationPaddock` retornados pelo report. Nenhum cache é combinado para reconstruir informação sanitizada.
- Saúde mostra o que foi realizado. Necessidades derivadas continuam em Pending Work e na Agenda.
- Concluir um item planejado registra a execução do planejamento, não cria um fato de peso, saúde, reprodução ou movimento.
- O processo reprodutivo mostra contagens, sem inferir percentuais ou conversões.
- Pesos permanecem strings decimais no contrato tipado e são convertidos apenas para formatação em pt-BR.

## Permissões e erros

OWNER, ADMIN, MANAGER, OPERATOR e VIEWER podem ler os relatórios. O backend retorna `HERD_QUERY_INVALID` (400), `HERD_REPORT_FORBIDDEN` (403) e `HERD_PERSISTENCE_UNAVAILABLE` (503); autenticação e contexto preservam seus contratos globais. A interface não mostra detalhes internos e apresenta a referência de correlação quando disponível.

## Visualizações e acessibilidade

Composição, fluxo, amplitude e processo usam representações visuais contidas na paleta “Território Vivo”. Toda informação material também aparece em texto ou tabela; nenhuma leitura depende de hover ou apenas de cor. Navegação e filtros usam controles nativos, foco visível e nomes acessíveis. Em 1024 px os blocos refluem; tabelas densas rolam somente dentro da própria superfície, sem scroll horizontal global.

## Limitações conhecidas

O backend não oferece exportação de relatórios; por isso não existe exportação CSV ou PDF criada no cliente. Não há ordenação ou busca textual nos contratos atuais. A categoria disponível é somente `UNCLASSIFIED`, portanto a interface não apresenta uma taxonomia inexistente. O workspace não é um construtor de BI e não calcula insights ou métricas novas.
