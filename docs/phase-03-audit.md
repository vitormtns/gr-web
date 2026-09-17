# Auditoria da Phase 03 — Herd Core

## Resultado

- CRITICAL: nenhum.
- HIGH: nenhum.
- MEDIUM: nenhum.
- LOW: revisão visual manual com dados reais ainda recomendada antes do merge.

## Itens auditados

- Hierarquia centrada em identidade, estado, localização, histórico e ação.
- Contratos do `gr-service`, paginação server-side e ausência de filtros inventados.
- Permissões de leitura, mutação e transferência.
- Não enumeração de animais inacessíveis.
- Idempotência de cadastro, movimento, lote e transferência.
- Concorrência otimista sem retry automático.
- Descarte de respostas antigas após nova intenção ou troca de contexto.
- Semântica de custódia e histórico sanitizado.
- Estados vazio, carregamento e erro.
- Layout em 1440, 1280 e 1024 px por regras responsivas.
- Labels, foco visível, semântica de tabela, status e timeline.
- Limite natural de renderização por paginação e `track` por ID.
- Ausência de `innerHTML`, acesso direto ao Supabase e IDs de tenant enviados pelo cliente.

## Correções feitas durante a auditoria

- O `operationId` do movimento em lote passou a ser criado ao abrir a intenção e preservado em retries.
- A permissão de transferência foi separada da permissão geral de mutação para excluir `OPERATOR`.
- O CSS compartilhado saiu dos bundles de componente, eliminando o warning de orçamento.
