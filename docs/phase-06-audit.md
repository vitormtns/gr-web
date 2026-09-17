# Auditoria da Phase 06

## Resultado

| Severidade | Pendências |
| --- | --- |
| CRITICAL | nenhuma |
| HIGH | nenhuma |
| MEDIUM | nenhuma |
| LOW | listagem de membros não informa total; convites pendentes não retornam as fazendas selecionadas |

## Verificações

- Isolamento entre tenants: toda leitura usa o `organizationId` selecionado no bootstrap autenticado; respostas antigas são descartadas e não há cache global de memberships.
- Autorização: capabilities centralizadas, guard para pessoas e backend preservado como autoridade para `403`.
- Não enumeração: entrada de pessoa somente por convite; nenhuma busca de e-mail no Supabase ou em endpoint não oficial.
- Semântica de membership: revogação nunca é apresentada como exclusão de conta.
- Escopo de fazenda: `ALL_FARMS` e `SELECTED_FARMS` possuem apresentação, validação e payload distintos.
- Proprietários: último `OWNER`, hierarquia de `ADMIN` e conflitos permanecem protegidos no backend; a UI antecipa apenas regras comprovadas.
- Ações sobre si: papel, escopo, organizations, farms e contexto são revalidados antes de continuar.
- Concorrência: `expectedVersion` e mensagem específica para `PLATFORM_VERSION_CONFLICT`.
- Ações sensíveis: inativação, revogação de membership e cancelamento de convite apresentam consequência e confirmação.
- Escala: membros paginados no servidor; seletor de fazendas pesquisável e rolável.
- Responsividade: layouts definidos para desktop, 1024 px e degradação móvel.
- Acessibilidade: landmarks, labels, `dialog`, foco visível, teclado, estados e mensagens com `role` apropriado.
- Cheiro de painel genérico: navegação reduzida a uma entrada e estrutura interna baseada em organização, fazendas e acessos.
