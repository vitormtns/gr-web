# Administração SaaS

## Objetivo e rotas

A área traduz o modelo `organização → fazendas → pessoas → acesso` sem expor detalhes internos como membership ou UUID na navegação normal.

- `/administracao`: contexto, resumo e identidade da organização;
- `/administracao/fazendas`: cadastro, correção e ativação/inativação de fazendas;
- `/administracao/pessoas`: memberships, papéis, escopos e convites para `OWNER` e `ADMIN`;
- `/convites/:token`: aceite autenticado de convite.

O `ContextNavigator` permanece como mecanismo único de troca de organização e fazenda. A administração não mantém um seletor paralelo.

## Contratos confirmados

A implementação foi confrontada com `docs/api/consumer-guide.md`, `docs/api/endpoint-inventory.md`, `PlatformAdministrationController`, `PlatformAdministrationService`, repositório JDBC, migrations e testes de integração do backend no SHA `8281424b6ba0b01f68dea138f8c99f9e4996a217`.

As leituras e mutações usam exclusivamente `/api/v1/organizations/{organizationId}` e sub-recursos validados pelo backend. O identificador da organização vem do contexto autenticado já carregado; não é aceito pela URL do Portal.

## Organização

Qualquer membership autenticada pode ver o resumo administrativo. Somente `OWNER` recebe a ação de correção da organização. A UI altera apenas o nome; suspensão e arquivamento existem no contrato, mas foram omitidos por afetarem todo o tenant e não possuírem um fluxo de recuperação suficientemente claro no MVP.

Correções enviam `expectedVersion`. `PLATFORM_VERSION_CONFLICT` é apresentado como alteração concorrente e orienta recarregar os dados.

## Fazendas

A listagem mostra nome e situação administrativos. `OWNER` e `ADMIN` podem criar, renomear, ativar e inativar. A interface não oferece exclusão nem arquivamento irreversível.

Criação usa UUID gerado no cliente, conforme o contrato. Correção e mudança de situação usam `expectedVersion`. Após qualquer mutação, o bootstrap de contexto é revalidado, evitando manter selecionada uma fazenda recém-inativada e incluindo uma nova fazenda para acessos `ALL_FARMS`.

## Pessoas, papéis e escopos

Papéis fixos e seus rótulos:

| Contrato | Portal |
| --- | --- |
| `OWNER` | Proprietário |
| `ADMIN` | Administrador |
| `MANAGER` | Gerente |
| `OPERATOR` | Operador |
| `VIEWER` | Visualizador |

`OWNER` pode administrar qualquer membership. `ADMIN` não recebe ações para `OWNER` ou `ADMIN` e não pode atribuir esses papéis. Essa antecipação na UI replica uma regra comprovada no serviço; o backend continua sendo a autoridade.

`ALL_FARMS` aparece como “Todas as fazendas” e inclui fazendas atuais e futuras conforme a semântica real. `SELECTED_FARMS` aparece como “Fazendas selecionadas”, exige ao menos uma fazenda ativa e usa uma lista rolável com busca por nome, adequada a organizações maiores. Antes de salvar, a UI apresenta papel e alcance em um resumo único.

Edição de papel e escopo ocorre no mesmo painel. Revogação explica que apenas a participação na organização será removida, sem apagar a conta global. A proteção do último proprietário e conflitos hierárquicos retornados pelo backend são tratados como conflito de negócio.

## Convites

Como não existe busca oficial de usuários, o Portal não enumera contas nem consulta o Supabase diretamente. Novos acessos usam o fluxo oficial de convite por e-mail.

O convite define papel e escopo. O token de uso único é exibido uma única vez, para compartilhamento seguro, e pode ser aceito em `/convites/:token` por uma conta autenticada. Convites pendentes podem ser cancelados. Reenvio não foi implementado porque não há endpoint correspondente.

O contrato de listagem não retorna os IDs das fazendas selecionadas do convite. Por isso, convites pendentes mostram “Fazendas selecionadas”, sem inventar nomes; o resumo exato é mostrado durante a criação.

## Permissões e consequências para o usuário atual

As capabilities ficam centralizadas em `PermissionService`:

- `viewAdministration`: qualquer membership ativa;
- `manageOrganization`: somente `OWNER`;
- `manageFarms` e `manageUsers`: `OWNER` e `ADMIN`.

`/administracao/pessoas` usa guard de rota e ações condicionadas por capability e hierarquia real. Respostas `403` permanecem tratadas pelo normalizador global.

Se a própria pessoa autenticada tiver papel, escopo ou membership alterados, o Portal recarrega usuário, organizações, fazendas e confirmação de contexto. Se a fazenda anterior deixar de ser acessível, a primeira fazenda autorizada passa a ser usada. A pessoa sai da tela de administração de acessos antes de continuar.

## Concorrência, corridas e isolamento

- respostas de página carregadas antes de uma troca de organização são descartadas por uma geração monotônica;
- cada troca de organização incrementa `contextVersion` e força novas leituras;
- caches administrativos vivem apenas nos componentes da rota e nunca são compartilhados entre tenants;
- `expectedVersion` protege organização, fazenda e membership;
- convites e criações administrativas não usam `operationId`, pois o contrato não o exige;
- aceite de convite é atômico e concorrente no backend;
- nenhuma consulta de administração usa headers de fazenda ou acesso direto ao banco/Supabase.

## Estados, responsividade e acessibilidade

As três áreas possuem carregamento contextual, vazio e erro. Diálogos e drawer usam elementos `dialog`, fechamento por `Escape`, retorno de foco do componente base e controles nativos de teclado. Confirmações destrutivas exigem revisão explícita.

A grade da visão geral refluí em 1024 px; linhas de pessoas reduzem colunas sem rolagem global; no mobile, identidade e escopo ocupam linhas completas. O seletor de fazendas limita a altura e mantém busca e navegação por teclado.

## Limitações conhecidas

- a API de membros retorna lista paginada sem `totalElements`; a UI usa navegação anterior/próxima e detecta a próxima página pelo tamanho retornado;
- a API de fazendas administrativas não é paginada;
- o Portal não cria membership diretamente por UUID, embora o backend possua esse endpoint, porque não existe descoberta segura de usuários e o fluxo de produto é convite;
- não há reenvio de convite;
- não há edição de escopo de convite pendente;
- auditoria administrativa existe no backend, mas uma plataforma genérica de auditoria está fora do escopo desta fase.
