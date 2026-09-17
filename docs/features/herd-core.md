# Herd Core

## Rotas

- `/rebanho/animais`: lista operacional, busca, filtros, paginação e seleção para movimentação em lote.
- `/rebanho/animais/novo`: cadastro focado de animal.
- `/rebanho/animais/:animalId`: identidade, estado, território, timeline e ações contextuais.
- `/rebanho/movimentacoes`: histórico paginado de movimentos internos.

## Contratos do backend

O Portal consome exclusivamente o `gr-service`, sempre com o contexto autorizado nos headers `X-Organization-Id` e `X-Farm-Id`. Os endpoints usados são:

- `GET/POST /api/v1/herd/animals`;
- `GET/PATCH /api/v1/herd/animals/{id}`;
- `GET /api/v1/herd/animals/{id}/history`;
- `GET /api/v1/herd/paddocks?status=ACTIVE`;
- `POST /api/v1/herd/animals/{id}/movements`;
- `POST /api/v1/herd/movements/batch`;
- `POST /api/v1/herd/animals/{id}/transfers`;
- `GET /api/v1/herd/reports/movements`;
- `GET /api/v1/me/organizations/{organizationId}/farms` para destinos que o usuário já pode acessar.

## Lista, busca e filtros

A busca cobre identificação e nome conforme o contrato. Sexo e estado são os únicos filtros adicionais expostos. Página, tamanho e filtros são enviados ao backend; não há filtragem local sobre página parcial. A busca usa debounce de 320 ms e o estado é refletido na query string. Parâmetros inválidos voltam a valores seguros. O backend não aceita parâmetro de ordenação na lista, por isso a interface informa apenas a ordem operacional estável fornecida pela API.

Cada requisição recebe uma geração local. Respostas de uma intenção anterior ou de outro contexto são descartadas. A troca de fazenda limpa a seleção e inicia uma nova leitura.

## Perfil, território e timeline

O cabeçalho prioriza a identificação e expõe apenas ações compatíveis com o estado atual e a permissão. Estado, sexo, nascimento, fazenda e piquete aparecem como uma única leitura territorial. Animais sem piquete usam o estado neutro “Sem piquete definido”.

A timeline usa eventos reais e mostra apenas o núcleo desta fase: `CREATED`, `BORN`, `CORRECTED`, `MOVED`, `TRANSFERRED_IN`, `TRANSFERRED_OUT`, `SOLD` e `DECEASED`. Detalhes são traduzidos para linguagem humana; nenhum payload JSON é exibido. Nomes de origem ou destino sanitizados pelo backend nunca são reconstruídos no cliente.

Um `404` usa a mensagem não enumerável “Animal não encontrado ou indisponível neste contexto”. Respostas antigas de um perfil deixam de ser aceitas depois da troca de contexto.

## Cadastro e idempotência

O UUID do animal é gerado uma vez quando a página de cadastro nasce e identifica a intenção idempotente. Reenvios preservam o mesmo UUID e payload. Um replay do backend é tratado como sucesso porque a resposta retorna o animal existente com `200`. Após a confirmação, a navegação usa o ID retornado. Há confirmação proporcional para abandonar um formulário preenchido.

## Correção e concorrência otimista

A correção se limita a `identification`, `name`, `sex` e `birthDate`, os quatro campos permitidos pelo backend. O comando sempre inclui `expectedVersion`. `HERD_VERSION_CONFLICT` fecha a edição, preserva o estado visível e oferece recarregamento explícito; a mutação nunca é repetida automaticamente com uma versão nova. Conflitos de identificação e idempotência recebem mensagens distintas.

## Movimentações

O movimento individual comunica origem e destino, exclui o piquete atual das opções e envia data, observações, versão esperada e um `operationId` estável durante retries. O sucesso recarrega perfil e timeline.

O movimento em lote usa o endpoint atômico real, envia no máximo os animais selecionados na página atual e preserva um único `operationId` enquanto o diálogo permanecer aberto. Não há simulação por várias chamadas individuais. O limite visual natural é 20 itens por página, abaixo do máximo de 100 aceito pelo backend.

## Transferência e cadeia de custódia

Transferências são individuais e mostram origem, destino e efeito de custódia antes da confirmação. A lista de destinos vem das fazendas acessíveis da organização e exclui a fazenda atual. O destino sem piquete é suportado pelo contrato. Após sucesso, o Portal volta à lista sem tentar buscar novamente um perfil que pode ter deixado de ser acessível.

A cadeia de custódia aparece pelos eventos sanitizados `TRANSFERRED_IN` e `TRANSFERRED_OUT` da timeline. A interface não cruza caches ou outras APIs para completar dados omitidos.

## Permissões

- Leitura: todos os papéis ativos.
- Cadastro, correção e movimento: `OWNER`, `ADMIN`, `MANAGER` e `OPERATOR`.
- Transferência: `OWNER`, `ADMIN` e `MANAGER`.
- `VIEWER`: somente leitura.

As decisões ficam na abstração `PermissionService`; o backend continua sendo a autoridade final.

## Estados e acessibilidade

Lista e perfil têm skeletons sem bloquear o shell. Estados vazio da fazenda e vazio por filtro têm textos e ações distintos. Erros preservam referência curta quando o backend fornece `requestId`. Status combinam texto e indicador, sem depender apenas de cor. Tabelas mantêm navegação por teclado, formulários têm labels explícitos e diálogos nativos preservam foco e fechamento por Escape.

## Limitações conhecidas

- O backend não oferece ordenação configurável em `GET /herd/animals`.
- Não há endpoint global dedicado ao log simples de movimentos; a visão histórica usa o endpoint paginado de relatório de movimentos, sem incorporar recursos analíticos da Phase 04.
- O contrato de transferência não fornece opções de piquete da fazenda destino sem mudar o contexto; por segurança, a transferência desta fase envia `destinationPaddockId: null`.
- Pesagens, saúde, reprodução, agenda e planejamento permanecem fora desta fase.
