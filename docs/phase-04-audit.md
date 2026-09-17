# Auditoria da Phase 04

Data: 17/09/2026

## Resultado

### CRITICAL

Nenhum.

### HIGH

Nenhum.

### MEDIUM

Nenhum aberto.

Durante a auditoria foi corrigida uma janela de corrida na troca de fazenda: as quatro superfícies operacionais agora invalidam imediatamente a geração das requisições em voo quando o contexto entra em transição. Respostas do contexto anterior não podem repopular a tela.

Também foram corrigidos:

- leitura pontual do item do planejador antes de reagendar, concluir ou cancelar, evitando depender da primeira página da lista;
- ações reprodutivas terminais deixaram de ser oferecidas nos eventos encerrados;
- suporte explícito ao parto com e sem gestação previamente cadastrada;
- vacinação e vermifugação em lote pelo endpoint atômico real;
- paginação server-side nos históricos de saúde e reprodução;
- relação mãe/cria na leitura compacta do perfil;
- alternativa textual do gráfico de evolução de peso.

### LOW

Nenhum defeito funcional conhecido. A automação de revisão visual não pôde ser executada porque o ambiente desta sessão não expôs Chrome, Edge ou navegador interno ao controlador. A responsividade foi auditada por breakpoints, build de produção e ausência de overflow global; recomenda-se a inspeção visual humana antes do merge, conforme o fluxo normal do projeto.

## Semântica e contratos

- O `gr-service` na revisão `8281424b6ba0b01f68dea138f8c99f9e4996a217` foi usado como fonte de verdade.
- Histórico de saúde contém fatos realizados; Pending Work contém necessidades derivadas.
- Concluir um planner não cria fato de domínio, comprovado no smoke por contagem de pesagens antes e depois.
- Agenda consome a composição pronta do backend e preserva origem e ordenação.
- Não há cálculo de ADG, health score, recomendação veterinária ou estado reprodutivo inventado.
- Permissões de escrita reutilizam a abstração central; VIEWER permanece somente leitura.

## Idempotência e concorrência

- `operationId` é criado por intenção e preservado em retry.
- Replay de peso, saúde em lote, confirmação, parto e planner foi exercitado no ambiente real.
- `expectedVersion` protege animais, gestações e planner.
- Conflito obsoleto do planner foi comprovado com HTTP 409.
- Filtros e trocas de contexto usam geração monotônica; a última intenção vence.

## Acessibilidade e responsividade

- Labels visíveis em todos os campos e mensagens de formulário com região de alerta.
- Estados possuem rótulo textual, sem dependência exclusiva de cor.
- Gráfico de peso possui `role="img"`, nome acessível e resumo textual equivalente.
- Tabelas têm cabeçalho semântico e scroll restrito à superfície.
- Layouts refluem em 1024 px e 736 px, sem scroll horizontal global definido pelos componentes.
- Diálogos reutilizam foco, fechamento e estrutura do design system existente.

## Evidências

- `npm run check`: 100 testes, build de produção verde.
- `npm audit --audit-level=low`: 0 vulnerabilidades.
- `npm run smoke:local`: verde para peso, saúde individual/lote, reprodução, confirmação, encerramento, parto com/sem gestação, relação materna, pendências, planner, agenda, replay e conflitos.
- `git diff --check`: sem erros de whitespace.
