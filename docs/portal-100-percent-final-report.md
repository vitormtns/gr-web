# Consolidação do portal operacional eBov

### Mission status

**PORTAL_COMPLETE_WITH_REGULATORY_EXCEPTIONS.** O portal cobre as capacidades públicas do backend que fazem sentido no navegador. Declaração, arquivo e envio oficial GEDAVE continuam bloqueados por validação regulatória.

### Portal completeness percentage

**100% dos 122 endpoints públicos auditados** têm operação correspondente no portal. A classificação refere-se à cobertura funcional do contrato, não a 122 escritas individuais executadas no smoke.

### Backend endpoints audited

122 rotas de todos os controllers públicos da `main` de `gr-service`, incluindo identidade, administração, rebanho, saúde, reprodução, leite, planejamento, relatórios, insumos e financeiro. A [matriz completa](portal-100-percent-endpoint-matrix.md) registra método, rota, tela, controle e papel.

### Browser-relevant capabilities

Consulta, filtros, paginação, cadastro, correção, ações versionadas, confirmação, revisão, histórico, permissões e troca de contexto nas áreas cobertas pela API. O backend permanece autoridade para autorização e isolamento.

### Capabilities already complete

Autenticação, contexto operacional, cadastro e perfil básicos do rebanho, parte dos manejos, dashboard e relatórios iniciais estavam disponíveis na base `f9c82d8`.

### Capabilities completed during mission

Insumos, financeiro, piquetes, administração SaaS, grupos, importação, manejos individuais e em lote, reprodução, saúde, agenda, quadros e relatórios operacionais. Ações sensíveis receberam revisão com valores e versões atuais; leituras antigas são invalidadas ao trocar fazenda.

### Navigation changes

Sidebar por intenção, com Rebanho, Análises, Gestão e Administração. Abas e ações contextuais expõem as operações sem exigir URLs conhecidas.

### Home / command center

Indicadores e atividades reais, pendências com acesso à agenda e card de localização que abre animais já filtrados por vínculo com piquete. A lista usa filtro e total calculados no servidor.

### Herd

Cadastro, perfil, busca, importação CSV com prévia, correção, notas, grupos manuais/inteligentes, piquetes, movimentação, transferência, venda e morte, com histórico e revisões apropriadas.

### Health

Tratamento individual e em lote, tipos e procedimento histórico de aftosa, registros, filtros, seleção paginada e indicadores sanitários. O quadro não afirma imunidade nem conformidade oficial.

### Reproduction

Serviço individual e em lote, gestação, confirmação, encerramento, parto, vínculos maternos, seleção paginada, histórico e confirmação com versão atual.

### Weight

Pesagem individual e em lote, precisão decimal, histórico, evolução e relatório com métricas do backend.

### Milk

Registro por turno, litros com precisão decimal, histórico e resumo por animal e por fazenda.

### Planning

Agenda, pendências, tarefas vinculadas a animais ou grupos, reagendamento, conclusão, cancelamento, filtros, prioridades e histórico.

### Inventory

Produtos, depósitos, entradas, saídas, ajustes, consumo, posição e histórico de estoque. Quantidades decimais permanecem exatas e não são inferidas de lançamentos financeiros.

### Finance

Categorias, receitas e despesas, liquidação, cancelamento, filtros, resumos e histórico. Valores decimais permanecem exatos; uma venda do rebanho não vira receita liquidada automaticamente.

### Reports

Oito relatórios operacionais e cinco quadros gerenciais, com filtros, paginação e totais fornecidos pelo backend. Valor de venda de R$ 0,01 foi conferido no ciclo de vida e renderizado sem arredondamento indevido.

### Administration

Organizações e fazendas, estados, nomes, perfil da fazenda atual, diretório administrativo, pessoas, convites e auditoria. Escritas exigem papel compatível e versão quando o contrato prevê.

### Users / roles / farm scopes

OWNER, ADMIN, MANAGER, OPERATOR e VIEWER testados com conta local fictícia; escopo somente da Fazenda Norte ocultou a Sul e bloqueou acesso cruzado. Convite aceito por segunda conta fictícia e depois revogado; acesso voltou a zero.

### Audit/history

Histórico por animal, transferência, estoque, financeiro e eventos administrativos exibidos em contexto. Recibos de operações são apresentados nos fluxos humanos correspondentes.

### Tenant/farm context hardening

Troca de organização ou fazenda fecha editores, limpa seleções e filtros dependentes, cancela ou invalida respostas antigas e exige contexto autorizado. Listas e contagens são obtidas do servidor no contexto selecionado.

### Permissions

A interface oculta ou bloqueia ações conforme o papel; o backend rejeita operações fora do escopo. O teste real verificou acesso de Visualizador, Operador, Gerente, Administrador e Proprietário.

### UX/accessibility

Textos visíveis revisados em pt-BR; estados vazios, carregamento, erro, retry, validação e feedback nas áreas operacionais. A saída de cadastro incompleto agora usa diálogo acessível do portal, com opções de continuar e descartar.

### Responsive/browser validation

Navegação real por todos os destinos da sidebar e rotas secundárias em **1440 × 900**, **1366 × 768** e **1024 × 768**. O passe final não registrou estouro horizontal, exceção JavaScript ou 5xx inesperado. Capturas e resultados estão em `portal-100-evidence/` no workspace local.

### Real backend smoke

`gr-web` em navegador Chrome isolado contra `gr-service/main` na porta local 8081 e Supabase exclusivamente local, com 36 migrations. A instância preexistente da porta 8080 e bancos remotos não foram alterados.

### Write smoke

Dados fictícios exercitaram cadastro/importação, pesagem, saúde, reprodução, leite, notas, venda, morte, grupos, agenda, piquetes, inventário, financeiro, fazendas, papéis e convites. Grupos de teste foram arquivados, convites de teste revogados e acessos temporários removidos pela própria aplicação.

### Bugs discovered

Lacunas de UI para domínios inteiros, consultas administrativas ambíguas, perda de precisão decimal, versões antigas em revisão, resposta tardia após troca de contexto, filtro de animais sem piquete ausente no backend e confirmação nativa ao descartar cadastro.

### Backend fixes, if any

Correções mínimas em branches próprias, verificadas e integradas à `main`: precisão de estoque; resumos e paginação financeira; perfil da fazenda; diretório e consultas administrativas; limites de medições; filtro de localização animal. `gr-service/main` está em `0be90a0` e foi publicado.

### Web tests

`npm run check` aprovado: tipos de aplicação e especificações, **469 testes em 62 arquivos** e build de produção. `git diff --check` aprovado. O diálogo de descarte também foi exercitado no navegador real.

### Backend tests, if changed

`mvnw.cmd verify` aprovado após a última alteração do backend: **609 testes** e **oito regras ArchUnit**.

### Bundle impact

Bundle inicial de **679,86 kB** (transferência estimada de **142,75 kB**). O orçamento preexistente de 650 kB emite aviso por **29,86 kB**; o limite não foi aumentado.

### Commits created

No web: `2514972`, `b331df6`, `65ea6d5`, `f277c82`, `d3ba24e`, `41eb453`, `1a52e1c`, `f100aa1`, `7828ed1`, `85abfe8`, `8373647`, `8fc4c2b`, `c6884c0` e o commit final de auditoria e UX. No backend, `b87d6fe`, `6b8feef`, `4a3841f`, `7be5d61`, `8ec914f`, `724868f` e `0be90a0`.

### Branch pushed

`feature/portal-100-percent` publicada para revisão. **Sem merge da branch web na `main` e sem deploy.**

### Remaining INTERNAL_ONLY capabilities

Primitivas de persistência, locks, hashes de idempotência, migrações e infraestrutura de autenticação não são ações humanas do portal.

### Remaining DEVICE_ONLY capabilities

Fila offline, armazenamento e notificações do dispositivo, sensores e mídia local não têm operação equivalente por navegador ou endpoint público do backend.

### Remaining REGULATORY_BLOCKED capabilities

Declaração, arquivo e envio oficial GEDAVE dependem de contrato e validação regulatória. Quadros gerenciais existentes são apoio à gestão e não representam documento oficial.

### Final complete endpoint ↔ portal matrix

[Matriz dos 122 contratos públicos](portal-100-percent-endpoint-matrix.md), todos **FULL** no escopo de navegador. Inventário estruturado e evidências de execução permanecem no workspace local.

### Final answer to: "Can eBov currently be fully operated through the portal without the mobile app?"

**Sim**, para as operações oferecidas pelo backend que podem ser legitimamente feitas em navegador. Funcionalidades intrínsecas de dispositivo e o fluxo oficial GEDAVE são as exceções declaradas.
