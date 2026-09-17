# Inteligência e operações do rebanho

## Escopo

A Phase 04 estende o núcleo do rebanho sem substituir a identidade, o estado, o território e a trajetória construídos na Phase 03. A experiência se distribui entre Saúde, Reprodução, Agenda e a leitura operacional compacta no perfil do animal.

## Contratos e fonte dos dados

O frontend usa exclusivamente o `gr-service` para dados de domínio. O Supabase permanece restrito à autenticação. Os contratos foram conferidos na revisão MVP `8281424b6ba0b01f68dea138f8c99f9e4996a217`, incluindo controllers, enums, consumer guide e inventário de endpoints.

- Peso: histórico e criação em `/api/v1/herd/animals/{id}/weights`; o valor é enviado como string decimal em `weightKg`, preservando até três casas decimais.
- Saúde: histórico individual e relatório operacional; `VACCINATION` e `DEWORMING` são os únicos tipos aceitos. O backend também suporta o endpoint atômico em lote.
- Reprodução: `INSEMINATION` e `NATURAL_SERVICE`; gestações usam `POSSIBLE`, `CONFIRMED`, `CALVED` e `TERMINATED`.
- Parto: aceita gestação vinculada e criação inline da cria. A relação mãe/cria é lida pelos endpoints `/calves` e `/mother`.
- Pendências: `/api/v1/herd/pending-work` representa condições derivadas. Não há ação manual de conclusão.
- Planejador: `/api/v1/herd/planner-items` representa intenção humana persistida, com estados `OPEN`, `COMPLETED` e `CANCELLED`.
- Agenda: `/api/v1/herd/agenda` já combina itens `MANUAL` e `DERIVED`; o frontend preserva a ordenação recebida e não deduplica itens.

## Pesagens e evolução

O perfil mostra a última pesagem, o histórico paginado e uma linha de evolução quando existem ao menos duas medições. O resumo textual informa primeira medida, última medida e delta, sendo a alternativa acessível ao gráfico. Não são calculados ganho médio diário, escore ou unidade diferente de quilogramas, pois o contrato expõe `weightKg`.

O diálogo de registro mantém o mesmo `operationId` durante tentativas da mesma intenção. Replay é tratado como sucesso. O `expectedVersion` atual do animal protege contra atualização obsoleta.

## Saúde

O workspace de Saúde apresenta apenas cuidados realizados. Vacinação e vermifugação exibem animal, data, produto, protocolo e próxima aplicação quando disponíveis. A próxima data é uma propriedade do fato realizado; necessidades vencidas continuam em Pending Work e na Agenda.

Usuários com papel `VIEWER` não recebem ações de escrita. OWNER, ADMIN, MANAGER e OPERATOR usam a abstração central de permissões.

## Reprodução, gestação e parto

O workspace organiza o processo por eventos: serviço, possível gestação, confirmação, encerramento e parto. A interface não cria estados além dos fornecidos pelo backend.

Confirmação, encerramento e parto usam `expectedVersion`. Conflitos HTTP 409 pedem recarga e reconciliação em vez de sobrescrever o estado. Encerramento usa somente os motivos suportados pelo contrato. O parto explicita a relação mãe → parto → cria e envia apenas os campos aceitos.

## Pendências, planejador e agenda

Pending Work é uma leitura derivada do estado real: vacinação, vermifugação, pesagem e parto. Não possui checkbox nem mutation própria; desaparece quando os fatos do domínio mudam.

O planejador é uma intenção humana. Criar, reagendar, concluir ou cancelar um item não registra pesagem, tratamento, movimento ou parto. A cópia da interface reforça essa separação. Estados terminais não oferecem reabertura.

A Agenda usa a paginação e os filtros server-side de origem, tipo, animal e período. Itens planejados e derivados do mesmo animal coexistem. A apresentação é temporal, com identificação textual da origem.

## Perfil e timeline

A seção “Leitura do animal” carrega peso, pendências e reprodução de forma independente do núcleo do perfil. Uma falha nessa leitura não derruba identidade ou histórico. A timeline reconhece `WEIGHED`, `HEALTH_TREATMENT`, `BREEDING_RECORDED`, `PREGNANCY_CONFIRMED`, `PREGNANCY_ENDED`, `CALVED` e `BORN`.

## Idempotência, concorrência e contexto

Cada nova intenção gera um UUID uma única vez. Retry preserva o UUID; sucesso ou replay encerra a intenção. Mutações versionadas enviam `expectedVersion`, e conflitos nunca são reenviados automaticamente.

As páginas observam a versão do contexto e usam uma geração monotônica para ignorar respostas antigas após troca de fazenda ou alteração de filtros. As listas usam paginação do servidor e não fazem chamadas por item.

## Acessibilidade e responsividade

Os formulários têm labels visíveis, mensagens com `role="alert"`, botões nativos e diálogos do design system. Estados possuem texto além de cor. O gráfico de peso expõe descrição textual. A hierarquia reflui em 1024 px e em telas menores sem scroll horizontal global; tabelas mantêm scroll apenas na superfície quando necessário.

## Matriz de permissões

| Operação | OWNER | ADMIN | MANAGER | OPERATOR | VIEWER |
| --- | --- | --- | --- | --- | --- |
| Consultar inteligência | Sim | Sim | Sim | Sim | Sim |
| Registrar manejo | Sim | Sim | Sim | Sim | Não |
| Alterar planejador | Sim | Sim | Sim | Sim | Não |

O backend permanece a autoridade final e aplica isolamento por tenant/fazenda e não enumeração.
