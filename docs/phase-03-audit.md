# Auditoria da Phase 03 — Herd Core

## Resultado

- CRITICAL: nenhum.
- HIGH: nenhum.
- MEDIUM: nenhum.
- LOW: aprovação visual final do usuário antes de qualquer merge.

## Ambiente local

- Docker Desktop iniciado e validado localmente.
- Supabase iniciado pelo fluxo oficial do `gr-service`, com Auth em `54321` e PostgreSQL em `54322`.
- Migrações locais aplicadas pelo script oficial do backend.
- `gr-service` iniciado com o perfil local e readiness confirmado em `8080`.
- Usuário e dados de teste criados somente no ambiente local; nenhuma credencial foi versionada ou registrada neste documento.
- Smoke oficial de autenticação do `gr-service` concluído com sucesso antes do smoke do portal.

## Smoke real autenticado

O comando `npm run smoke:local` foi executado contra Supabase e `gr-service` reais. Foram comprovados:

- login, restauração e renovação de sessão, logout e carregamento de `/api/v1/me`;
- seleção de organização e fazenda, dashboard e troca de contexto;
- listagem paginada, busca, filtros e perfil de animal;
- cadastro com repetição do mesmo `operationId`, retorno de replay e ausência de duplicidade;
- correção com `expectedVersion` real e conflito stale `409 HERD_VERSION_CONFLICT`;
- movimentação individual e repetição idempotente;
- movimentação atômica em lote e repetição idempotente;
- transferência entre fazendas, remoção do acesso no contexto de origem, acesso no destino e evento `TRANSFERRED_IN`;
- relatório de movimentações e cenários negativos `400`, `401`, `404`, `409` e serviço indisponível.

## Revisão visual

A revisão foi executada em Chrome local headless por automação via Chrome DevTools Protocol, após autenticação real. Foram avaliados:

- lista em 1440, 1280 e 1024 px;
- perfil ativo em 1440, 1280 e 1024 px;
- perfil terminal em 1440 px;
- cadastro em 1440 e 1280 px;
- diálogos de movimentação e transferência em 1440 px;
- timeline real e estado vazio filtrado no showcase.

A lista mantém identidade, território e estado como informações dominantes e não apresenta aparência de tabela administrativa genérica. O perfil comunica identidade, estado, território, histórico e ações nessa ordem. Em 1024 px, sidebar, filtros, tabela, perfil e ações fazem reflow sem rolagem horizontal global.

## Correções feitas durante os gates

- Corrigido o payload de movimentação em lote para enviar `animalId`, conforme o DTO real do backend.
- Ampliado o smoke real para cobrir cadastro, replay, correção, conflito, movimentos, lote, transferência e custódia.
- Adicionado estado informativo para timeline sem eventos, evitando um painel vazio no perfil terminal.
- A data da timeline agora usa `recordedAt` quando `occurredOn` não está disponível.
- As telas de rebanho agora aguardam a conclusão da troca de contexto antes de consultar a API, evitando requisições sem fazenda e respostas `400` transitórias.

## Itens auditados

- Hierarquia visual, densidade, estados vazio/carregamento/erro e ausência de cheiro de CRUD genérico.
- Contratos reais do `gr-service`, paginação server-side, IDs de piquete e fazenda e custódia.
- Permissões, não enumeração e histórico sanitizado.
- Idempotência, concorrência otimista e ausência de retry automático após conflito.
- Descarte de respostas antigas e invalidação na troca de contexto.
- Responsividade, foco visível, labels, semântica de tabela, status e timeline.
- Ausência de `innerHTML`, acesso direto ao Supabase e IDs de tenant enviados pelo cliente.

## Gate restante

Somente a aprovação visual final do usuário. Nenhum defeito CRITICAL, HIGH ou MEDIUM permanece aberto.
