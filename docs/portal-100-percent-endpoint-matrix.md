# Matriz final de endpoints públicos e operação no portal

Auditoria do código público do `gr-service` em `main` (`0be90a0`) contra a branch `feature/portal-100-percent` do `gr-web`. São **122 endpoints**, todos classificados como **FULL** para operação via navegador. O inventário exclui primitivas internas e recursos exclusivos de aparelho; declarações oficiais GEDAVE dependem de validação regulatória e não possuem contrato público de envio.

Cada linha identifica o ponto de entrada da interface. A coluna de controle descreve a ação humana; os detalhes de payload, limites e semântica estão nos contratos Java e em [`bovnex-backend-web-parity.md`](bovnex-backend-web-parity.md). Leituras e mutações usam o contexto autenticado de organização e fazenda; a API valida permissões e escopo. `FULL` exige controle navegável, dados reais, estados de carregamento/erro, autorização e fluxo de confirmação para escrita.

| Nº | Método e endpoint | Tela | Controle e consulta/comando | Papel de escrita ou leitura | Estado |
| ---: | --- | --- | --- | --- | --- |
| 1 | `GET /api/v1/farms/current` | `/administracao/fazenda-atual` | Perfil da fazenda; Consulta contextual, filtros e detalhes | Todos os cinco papéis | **FULL** |
| 2 | `PATCH /api/v1/farms/current` | `/administracao/fazenda-atual` | Perfil da fazenda; Formulário contextual, validação e confirmação | Proprietário e Administrador | **FULL** |
| 3 | `POST /api/v1/finance/categories` | `/gestao/financeiro` | Categorias financeiras; Formulário contextual, validação e confirmação | Proprietário, Administrador e Gerente | **FULL** |
| 4 | `GET /api/v1/finance/categories` | `/gestao/financeiro` | Categorias financeiras; Consulta contextual, filtros e detalhes | Todos os cinco papéis | **FULL** |
| 5 | `GET /api/v1/finance/categories/{id}` | `/gestao/financeiro` | Categorias financeiras; Consulta contextual, filtros e detalhes | Todos os cinco papéis | **FULL** |
| 6 | `PATCH /api/v1/finance/categories/{id}` | `/gestao/financeiro` | Categorias financeiras; Formulário contextual, validação e confirmação | Proprietário, Administrador e Gerente | **FULL** |
| 7 | `POST /api/v1/finance/entries` | `/gestao/financeiro` | Lançamentos financeiros; Valores exatos, data, categoria e confirmação | Proprietário, Administrador, Gerente e Operador | **FULL** |
| 8 | `GET /api/v1/finance/entries` | `/gestao/financeiro` | Lançamentos financeiros; Busca, período, situação, categoria e paginação | Todos os cinco papéis | **FULL** |
| 9 | `GET /api/v1/finance/entries/{id}` | `/gestao/financeiro` | Lançamentos financeiros; Busca, período, situação, categoria e paginação | Todos os cinco papéis | **FULL** |
| 10 | `PATCH /api/v1/finance/entries/{id}` | `/gestao/financeiro` | Lançamentos financeiros; Valores exatos, data, categoria e confirmação | Proprietário, Administrador, Gerente e Operador | **FULL** |
| 11 | `POST /api/v1/finance/entries/{id}/settlement` | `/gestao/financeiro` | Lançamentos financeiros; Valores exatos, data, categoria e confirmação | Proprietário, Administrador, Gerente e Operador | **FULL** |
| 12 | `POST /api/v1/finance/entries/{id}/cancellation` | `/gestao/financeiro` | Lançamentos financeiros; Valores exatos, data, categoria e confirmação | Proprietário, Administrador, Gerente e Operador | **FULL** |
| 13 | `GET /api/v1/finance/entries/{id}/history` | `/gestao/financeiro` | Lançamentos financeiros; Busca, período, situação, categoria e paginação | Todos os cinco papéis | **FULL** |
| 14 | `GET /api/v1/finance/summary` | `/gestao/financeiro` | Resumo financeiro; Consulta contextual, filtros e detalhes | Todos os cinco papéis | **FULL** |
| 15 | `GET /api/v1/finance/summary/by-category` | `/gestao/financeiro` | Resumo financeiro; Consulta contextual, filtros e detalhes | Todos os cinco papéis | **FULL** |
| 16 | `GET /api/v1/herd/agenda` | `/rebanho/agenda` | Agenda unificada; Consulta contextual, filtros e detalhes | Todos os cinco papéis | **FULL** |
| 17 | `GET /api/v1/herd/animals` | `/rebanho/animais` | Lista, cadastro e perfil; Busca, filtros, paginação e histórico | Todos os cinco papéis | **FULL** |
| 18 | `POST /api/v1/herd/animals` | `/rebanho/animais/novo` | Lista, cadastro e perfil; Formulário, versão atual e confirmação | Proprietário, Administrador, Gerente e Operador | **FULL** |
| 19 | `GET /api/v1/herd/animals/{id}` | `/rebanho/animais/:animalId` | Lista, cadastro e perfil; Busca, filtros, paginação e histórico | Todos os cinco papéis | **FULL** |
| 20 | `PATCH /api/v1/herd/animals/{id}` | `/rebanho/animais/:animalId` | Lista, cadastro e perfil; Formulário, versão atual e confirmação | Proprietário, Administrador, Gerente e Operador | **FULL** |
| 21 | `POST /api/v1/herd/animals/{id}/sale` | `/rebanho/animais/:animalId` | Lista, cadastro e perfil; Canal, comprador e valor decimal; revisão | Proprietário, Administrador e Gerente | **FULL** |
| 22 | `POST /api/v1/herd/animals/{id}/death` | `/rebanho/animais/:animalId` | Lista, cadastro e perfil; Data, motivo e revisão | Proprietário, Administrador, Gerente e Operador | **FULL** |
| 23 | `GET /api/v1/herd/animals/{id}/history` | `/rebanho/animais/:animalId` | Lista, cadastro e perfil; Busca, filtros, paginação e histórico | Todos os cinco papéis | **FULL** |
| 24 | `POST /api/v1/herd/animals/imports` | `/rebanho/animais/importar` | Importar CSV com prévia; CSV: prévia, validação, confirmação e recibo | Proprietário, Administrador, Gerente e Operador | **FULL** |
| 25 | `POST /api/v1/herd/animals/{id}/notes` | `/rebanho/animais/:animalId` | Adicionar observação; Formulário, versão atual e confirmação | Proprietário, Administrador, Gerente e Operador | **FULL** |
| 26 | `POST /api/v1/herd/breedings/batch` | `/rebanho/reproducao` | Serviço reprodutivo em lote; Seleção paginada, serviço, revisão e recibo | Proprietário, Administrador, Gerente e Operador | **FULL** |
| 27 | `GET /api/v1/herd/dashboard/overview` | `/visao-geral` | Indicadores e atividades; Consulta contextual, filtros e detalhes | Todos os cinco papéis | **FULL** |
| 28 | `GET /api/v1/herd/dashboard/activity` | `/visao-geral` | Indicadores e atividades; Consulta contextual, filtros e detalhes | Todos os cinco papéis | **FULL** |
| 29 | `GET /api/v1/herd/dashboard/attention` | `/visao-geral` | Indicadores e atividades; Consulta contextual, filtros e detalhes | Todos os cinco papéis | **FULL** |
| 30 | `POST /api/v1/herd/groups` | `/rebanho/grupos` | Grupos e membros; Regras ou membros, versão e confirmação | Proprietário, Administrador e Gerente | **FULL** |
| 31 | `GET /api/v1/herd/groups` | `/rebanho/grupos` | Grupos e membros; Busca, filtros, regras, membros e paginação | Todos os cinco papéis | **FULL** |
| 32 | `GET /api/v1/herd/groups/{id}` | `/rebanho/grupos` | Grupos e membros; Busca, filtros, regras, membros e paginação | Todos os cinco papéis | **FULL** |
| 33 | `PUT /api/v1/herd/groups/{id}` | `/rebanho/grupos` | Grupos e membros; Regras ou membros, versão e confirmação | Proprietário, Administrador e Gerente | **FULL** |
| 34 | `POST /api/v1/herd/groups/{id}/archive` | `/rebanho/grupos` | Grupos e membros; Regras ou membros, versão e confirmação | Proprietário, Administrador e Gerente | **FULL** |
| 35 | `PUT /api/v1/herd/groups/{id}/animals/{animalId}` | `/rebanho/grupos` | Grupos e membros; Regras ou membros, versão e confirmação | Proprietário, Administrador e Gerente | **FULL** |
| 36 | `DELETE /api/v1/herd/groups/{id}/animals/{animalId}` | `/rebanho/grupos` | Grupos e membros; Regras ou membros, versão e confirmação | Proprietário, Administrador e Gerente | **FULL** |
| 37 | `GET /api/v1/herd/groups/{id}/animals` | `/rebanho/grupos` | Grupos e membros; Busca, filtros, regras, membros e paginação | Todos os cinco papéis | **FULL** |
| 38 | `GET /api/v1/herd/pending-work` | `/rebanho/agenda` | Pendências por tipo e animal; Consulta contextual, filtros e detalhes | Todos os cinco papéis | **FULL** |
| 39 | `GET /api/v1/herd/animals/{id}/weights` | `/rebanho/animais/:animalId` | Pesagens individuais e em lote; Busca, filtros, paginação e histórico | Todos os cinco papéis | **FULL** |
| 40 | `GET /api/v1/herd/animals/{id}/health-treatments` | `/rebanho/saude` | Tratamentos individuais e em lote; Busca, filtros, paginação e histórico | Todos os cinco papéis | **FULL** |
| 41 | `POST /api/v1/herd/animals/{id}/weights` | `/rebanho/animais/:animalId` | Pesagens individuais e em lote; Formulário, versão atual e confirmação | Proprietário, Administrador, Gerente e Operador | **FULL** |
| 42 | `POST /api/v1/herd/weights/batch` | `/rebanho/animais/:animalId` | Pesagens individuais e em lote; Formulário contextual, validação e confirmação | Proprietário, Administrador, Gerente e Operador | **FULL** |
| 43 | `POST /api/v1/herd/animals/{id}/health-treatments` | `/rebanho/saude` | Tratamentos individuais e em lote; Formulário, versão atual e confirmação | Proprietário, Administrador, Gerente e Operador | **FULL** |
| 44 | `POST /api/v1/herd/health-treatments/batch` | `/rebanho/saude` | Tratamentos individuais e em lote; Formulário contextual, validação e confirmação | Proprietário, Administrador, Gerente e Operador | **FULL** |
| 45 | `PUT /api/v1/herd/animals/{id}/mother` | `/rebanho/animais/:animalId` | Vínculo materno; Formulário, versão atual e confirmação | Proprietário, Administrador, Gerente e Operador | **FULL** |
| 46 | `POST /api/v1/herd/animals/{id}/movements` | `/rebanho/animais` | Movimentação individual e lote; Formulário, versão atual e confirmação | Proprietário, Administrador, Gerente e Operador | **FULL** |
| 47 | `POST /api/v1/herd/movements/batch` | `/rebanho/animais` | Movimentação individual e lote; Formulário contextual, validação e confirmação | Proprietário, Administrador, Gerente e Operador | **FULL** |
| 48 | `POST /api/v1/herd/planner-items` | `/rebanho/agenda` | Atividades planejadas; Data, vínculo, situação e confirmação | Proprietário, Administrador, Gerente e Operador | **FULL** |
| 49 | `PATCH /api/v1/herd/planner-items/{id}` | `/rebanho/agenda` | Atividades planejadas; Data, vínculo, situação e confirmação | Proprietário, Administrador, Gerente e Operador | **FULL** |
| 50 | `POST /api/v1/herd/planner-items/{id}/completion` | `/rebanho/agenda` | Atividades planejadas; Data, vínculo, situação e confirmação | Proprietário, Administrador, Gerente e Operador | **FULL** |
| 51 | `POST /api/v1/herd/planner-items/{id}/cancellation` | `/rebanho/agenda` | Atividades planejadas; Data, vínculo, situação e confirmação | Proprietário, Administrador, Gerente e Operador | **FULL** |
| 52 | `GET /api/v1/herd/planner-items/{id}` | `/rebanho/agenda` | Atividades planejadas; Tipo, estado, data, animal, grupo e paginação | Todos os cinco papéis | **FULL** |
| 53 | `GET /api/v1/herd/planner-items` | `/rebanho/agenda` | Atividades planejadas; Tipo, estado, data, animal, grupo e paginação | Todos os cinco papéis | **FULL** |
| 54 | `GET /api/v1/herd/reports/current-age-sex-balance` | `/relatorios/quadros` | Quadros de saldo, fluxo e saúde; Filtros de período, animal e tipo quando aplicáveis | Todos os cinco papéis | **FULL** |
| 55 | `GET /api/v1/herd/reports/period-reconciliation` | `/relatorios/quadros` | Quadros de saldo, fluxo e saúde; Filtros de período, animal e tipo quando aplicáveis | Todos os cinco papéis | **FULL** |
| 56 | `GET /api/v1/herd/reports/historical-age-sex-balance` | `/relatorios/quadros` | Quadros de saldo, fluxo e saúde; Filtros de período, animal e tipo quando aplicáveis | Todos os cinco papéis | **FULL** |
| 57 | `GET /api/v1/herd/reports/current-procedure-coverage` | `/relatorios/quadros` | Quadros de saldo, fluxo e saúde; Filtros de período, animal e tipo quando aplicáveis | Todos os cinco papéis | **FULL** |
| 58 | `GET /api/v1/herd/reports/herd-position` | `/relatorios` | Relatórios e quadros; Filtros de período, animal e tipo quando aplicáveis | Todos os cinco papéis | **FULL** |
| 59 | `GET /api/v1/herd/reports/lifecycle` | `/relatorios` | Relatórios e quadros; Filtros de período, animal e tipo quando aplicáveis | Todos os cinco papéis | **FULL** |
| 60 | `GET /api/v1/herd/reports/movements` | `/relatorios` | Relatórios e quadros; Filtros de período, animal e tipo quando aplicáveis | Todos os cinco papéis | **FULL** |
| 61 | `GET /api/v1/herd/reports/transfers` | `/relatorios` | Relatórios e quadros; Filtros de período, animal e tipo quando aplicáveis | Todos os cinco papéis | **FULL** |
| 62 | `GET /api/v1/herd/reports/weights` | `/relatorios` | Relatórios e quadros; Filtros de período, animal e tipo quando aplicáveis | Todos os cinco papéis | **FULL** |
| 63 | `GET /api/v1/herd/reports/health` | `/relatorios` | Relatórios e quadros; Filtros de período, animal e tipo quando aplicáveis | Todos os cinco papéis | **FULL** |
| 64 | `GET /api/v1/herd/reports/reproduction` | `/relatorios` | Relatórios e quadros; Filtros de período, animal e tipo quando aplicáveis | Todos os cinco papéis | **FULL** |
| 65 | `GET /api/v1/herd/reports/planner` | `/relatorios` | Relatórios e quadros; Filtros de período, animal e tipo quando aplicáveis | Todos os cinco papéis | **FULL** |
| 66 | `POST /api/v1/herd/animals/{motherId}/breedings` | `/rebanho/reproducao` | Gestação e parto; Formulário, versão atual e confirmação | Proprietário, Administrador e Gerente | **FULL** |
| 67 | `POST /api/v1/herd/animals/{motherId}/calvings` | `/rebanho/reproducao` | Gestação e parto; Formulário, versão atual e confirmação | Proprietário, Administrador e Gerente | **FULL** |
| 68 | `POST /api/v1/herd/pregnancies/{id}/confirmation` | `/rebanho/reproducao` | Gestação e parto; Formulário contextual, validação e confirmação | Proprietário, Administrador, Gerente e Operador | **FULL** |
| 69 | `POST /api/v1/herd/pregnancies/{id}/termination` | `/rebanho/reproducao` | Gestação e parto; Formulário contextual, validação e confirmação | Proprietário, Administrador e Gerente | **FULL** |
| 70 | `GET /api/v1/herd/pregnancies/{id}` | `/rebanho/reproducao` | Gestação e parto; Consulta contextual, filtros e detalhes | Todos os cinco papéis | **FULL** |
| 71 | `GET /api/v1/herd/animals/{motherId}/pregnancies` | `/rebanho/reproducao` | Gestação e parto; Busca, filtros, paginação e histórico | Todos os cinco papéis | **FULL** |
| 72 | `GET /api/v1/herd/animals/{motherId}/calves` | `/rebanho/reproducao` | Gestação e parto; Busca, filtros, paginação e histórico | Todos os cinco papéis | **FULL** |
| 73 | `GET /api/v1/herd/animals/{calfId}/mother` | `/rebanho/reproducao` | Gestação e parto; Busca, filtros, paginação e histórico | Todos os cinco papéis | **FULL** |
| 74 | `POST /api/v1/herd/animals/{id}/transfers` | `/rebanho/transferencias` | Transferências e histórico; Formulário, versão atual e confirmação | Proprietário, Administrador e Gerente | **FULL** |
| 75 | `POST /api/v1/herd/transfers/batch` | `/rebanho/transferencias` | Transferências e histórico; Formulário contextual, validação e confirmação | Proprietário, Administrador e Gerente | **FULL** |
| 76 | `GET /api/v1/herd/transfers` | `/rebanho/transferencias` | Transferências e histórico; Consulta contextual, filtros e detalhes | Todos os cinco papéis | **FULL** |
| 77 | `GET /api/v1/herd/transfers/{id}` | `/rebanho/transferencias` | Transferências e histórico; Consulta contextual, filtros e detalhes | Todos os cinco papéis | **FULL** |
| 78 | `POST /api/v1/herd/animals/{id}/milk-records` | `/rebanho/animais/:animalId` | Leite e resumo; Formulário, versão atual e confirmação | Proprietário, Administrador, Gerente e Operador | **FULL** |
| 79 | `GET /api/v1/herd/animals/{id}/milk-records` | `/rebanho/animais/:animalId` | Leite e resumo; Busca, filtros, paginação e histórico | Todos os cinco papéis | **FULL** |
| 80 | `GET /api/v1/herd/milk/overview` | `/relatorios/quadros` | Leite e resumo; Período, registros e resumo | Todos os cinco papéis | **FULL** |
| 81 | `GET /api/v1/herd/animals/{id}/milk-summary` | `/rebanho/animais/:animalId` | Leite e resumo; Busca, filtros, paginação e histórico | Todos os cinco papéis | **FULL** |
| 82 | `POST /api/v1/herd/paddocks` | `/rebanho/piquetes` | Piquetes e lotação; Cadastro, capacidade, versão e revisão | Proprietário, Administrador e Gerente | **FULL** |
| 83 | `GET /api/v1/herd/paddocks` | `/rebanho/piquetes` | Piquetes e lotação; Busca, situação, ocupação e histórico | Todos os cinco papéis | **FULL** |
| 84 | `GET /api/v1/herd/paddocks/{id}` | `/rebanho/piquetes` | Piquetes e lotação; Busca, situação, ocupação e histórico | Todos os cinco papéis | **FULL** |
| 85 | `PATCH /api/v1/herd/paddocks/{id}` | `/rebanho/piquetes` | Piquetes e lotação; Cadastro, capacidade, versão e revisão | Proprietário, Administrador e Gerente | **FULL** |
| 86 | `GET /api/v1/herd/paddocks/{id}/occupancy` | `/rebanho/piquetes` | Piquetes e lotação; Busca, situação, ocupação e histórico | Todos os cinco papéis | **FULL** |
| 87 | `GET /api/v1/herd/paddocks/{id}/animals` | `/rebanho/piquetes` | Piquetes e lotação; Busca, filtros, paginação e histórico | Todos os cinco papéis | **FULL** |
| 88 | `GET /api/v1/herd/paddocks/{id}/movements` | `/rebanho/piquetes` | Histórico do piquete; Busca, situação, ocupação e histórico | Todos os cinco papéis | **FULL** |
| 89 | `GET /api/v1/me` | `/visao-geral` | Identidade autenticada; Consulta contextual, filtros e detalhes | Conta autenticada | **FULL** |
| 90 | `POST /api/v1/inventory/products` | `/gestao/insumos` | Produtos de insumos; Formulário contextual, validação e confirmação | Proprietário, Administrador e Gerente | **FULL** |
| 91 | `GET /api/v1/inventory/products` | `/gestao/insumos` | Produtos de insumos; Consulta contextual, filtros e detalhes | Todos os cinco papéis | **FULL** |
| 92 | `GET /api/v1/inventory/products/{id}` | `/gestao/insumos` | Produtos de insumos; Consulta contextual, filtros e detalhes | Todos os cinco papéis | **FULL** |
| 93 | `PATCH /api/v1/inventory/products/{id}` | `/gestao/insumos` | Produtos de insumos; Formulário contextual, validação e confirmação | Proprietário, Administrador e Gerente | **FULL** |
| 94 | `POST /api/v1/inventory/locations` | `/gestao/insumos` | Depósitos; Formulário contextual, validação e confirmação | Proprietário, Administrador e Gerente | **FULL** |
| 95 | `GET /api/v1/inventory/locations` | `/gestao/insumos` | Depósitos; Consulta contextual, filtros e detalhes | Todos os cinco papéis | **FULL** |
| 96 | `GET /api/v1/inventory/locations/{id}` | `/gestao/insumos` | Depósitos; Consulta contextual, filtros e detalhes | Todos os cinco papéis | **FULL** |
| 97 | `PATCH /api/v1/inventory/locations/{id}` | `/gestao/insumos` | Depósitos; Formulário contextual, validação e confirmação | Proprietário, Administrador e Gerente | **FULL** |
| 98 | `POST /api/v1/inventory/movements` | `/gestao/insumos` | Movimentações de insumos; Produto, depósito, tipo e quantidade decimal | Proprietário, Administrador, Gerente e Operador | **FULL** |
| 99 | `GET /api/v1/inventory/stock` | `/gestao/insumos` | Posição do estoque; Consulta contextual, filtros e detalhes | Todos os cinco papéis | **FULL** |
| 100 | `GET /api/v1/inventory/locations/{id}/stock` | `/gestao/insumos` | Depósitos; Consulta contextual, filtros e detalhes | Todos os cinco papéis | **FULL** |
| 101 | `GET /api/v1/inventory/movements` | `/gestao/insumos` | Movimentações de insumos; Produto, depósito, tipo, período e paginação | Todos os cinco papéis | **FULL** |
| 102 | `GET /api/v1/inventory/movements/{id}` | `/gestao/insumos` | Movimentações de insumos; Produto, depósito, tipo, período e paginação | Todos os cinco papéis | **FULL** |
| 103 | `GET /api/v1/me/organizations` | `/administracao/organizacoes` | Organizações e fazendas acessíveis; Consulta contextual, filtros e detalhes | Conta autenticada | **FULL** |
| 104 | `GET /api/v1/me/organizations/{organizationId}/farms` | `/administracao/organizacoes` | Organizações e fazendas acessíveis; Consulta contextual, filtros e detalhes | Conta autenticada | **FULL** |
| 105 | `GET /api/v1/context` | `/visao-geral` | Contexto operacional; Consulta contextual, filtros e detalhes | Conta autenticada | **FULL** |
| 106 | `GET /api/v1/me/administrative-organizations` | `/administracao/organizacoes` | Organização, fazendas, pessoas e auditoria; Consulta contextual, filtros e detalhes | Conta autenticada | **FULL** |
| 107 | `POST /api/v1/organizations` | `/administracao/organizacoes` | Organização, fazendas, pessoas e auditoria; Formulário contextual, validação e confirmação | Conta autenticada | **FULL** |
| 108 | `GET /api/v1/organizations/{organizationId}` | `/administracao/organizacoes` | Organização, fazendas, pessoas e auditoria; Consulta contextual, filtros e detalhes | Todos os cinco papéis | **FULL** |
| 109 | `PATCH /api/v1/organizations/{organizationId}` | `/administracao/organizacoes` | Organização, fazendas, pessoas e auditoria; Formulário contextual, validação e confirmação | Proprietário | **FULL** |
| 110 | `GET /api/v1/organizations/{organizationId}/farms` | `/administracao/fazendas` | Organização, fazendas, pessoas e auditoria; Consulta contextual, filtros e detalhes | Todos os cinco papéis | **FULL** |
| 111 | `POST /api/v1/organizations/{organizationId}/farms` | `/administracao/fazendas` | Organização, fazendas, pessoas e auditoria; Formulário contextual, validação e confirmação | Proprietário e Administrador | **FULL** |
| 112 | `GET /api/v1/organizations/{organizationId}/farms/{farmId}` | `/administracao/fazendas` | Organização, fazendas, pessoas e auditoria; Consulta contextual, filtros e detalhes | Todos os cinco papéis | **FULL** |
| 113 | `PATCH /api/v1/organizations/{organizationId}/farms/{farmId}` | `/administracao/fazendas` | Organização, fazendas, pessoas e auditoria; Formulário contextual, validação e confirmação | Proprietário e Administrador | **FULL** |
| 114 | `GET /api/v1/organizations/{organizationId}/members` | `/administracao/pessoas` | Organização, fazendas, pessoas e auditoria; Lista, escopo, papel, status e histórico | Todos os cinco papéis | **FULL** |
| 115 | `POST /api/v1/organizations/{organizationId}/members` | `/administracao/pessoas` | Organização, fazendas, pessoas e auditoria; Papel, escopo, versão e confirmação | Proprietário e Administrador | **FULL** |
| 116 | `PATCH /api/v1/organizations/{organizationId}/members/{membershipId}` | `/administracao/pessoas` | Organização, fazendas, pessoas e auditoria; Papel, escopo, versão e confirmação | Proprietário e Administrador | **FULL** |
| 117 | `DELETE /api/v1/organizations/{organizationId}/members/{membershipId}` | `/administracao/pessoas` | Organização, fazendas, pessoas e auditoria; Papel, escopo, versão e confirmação | Proprietário e Administrador | **FULL** |
| 118 | `POST /api/v1/organizations/{organizationId}/invitations` | `/administracao/pessoas` | Organização, fazendas, pessoas e auditoria; e-mail, papel, escopo e confirmação | Proprietário e Administrador | **FULL** |
| 119 | `GET /api/v1/organizations/{organizationId}/invitations` | `/administracao/pessoas` | Organização, fazendas, pessoas e auditoria; Lista, escopo, papel, status e histórico | Proprietário e Administrador | **FULL** |
| 120 | `POST /api/v1/organizations/{organizationId}/invitations/{invitationId}/revocation` | `/administracao/pessoas` | Organização, fazendas, pessoas e auditoria; Papel, escopo, versão e confirmação | Proprietário e Administrador | **FULL** |
| 121 | `POST /api/v1/invitations/{token}/accept` | `/convites/:token` | Aceitar convite; identidade, escopo e confirmação | Conta autenticada | **FULL** |
| 122 | `GET /api/v1/organizations/{organizationId}/audit` | `/administracao/auditoria` | Organização, fazendas, pessoas e auditoria; Consulta contextual, filtros e detalhes | Proprietário e Administrador | **FULL** |

## Serviços e origem

As chamadas acima são feitas por `src/app/features/administration/administration-api.service.ts`, `src/app/features/finance/finance-api.service.ts`, `src/app/features/herd/herd-api.service.ts`, `src/app/features/herd/parity-api.service.ts`, `src/app/features/home/dashboard-api.service.ts`, `src/app/features/reports/reports-api.service.ts`, `src/app/features/paddocks/paddocks-api.service.ts`, `src/app/features/core/context/context.store.ts`, `src/app/features/inventory/inventory-api.service.ts`. A origem exata de cada rota foi extraída dos controllers de `gr-service/src/main/java/com/gerenciadorrural/modules/`; o inventário legível por máquina acompanha a evidência local `portal-backend-inventory.json`.

## Verificação

O smoke real usou somente Supabase local e dados fictícios. Exercitou os cinco papéis, escopos de fazenda, convite com aceite e revogação, CRUDs, versionamento, registros e relatórios. O passe final navegou as rotas principais e secundárias em 1440 × 900, 1366 × 768 e 1024 × 768, sem estouro horizontal, erro JavaScript ou 5xx inesperado. Evidências locais: `portal-100-evidence/final-sidebar-qa.json`, `final-secondary-qa.json`, `final-visual-qa.json`, `role-matrix-local.json` e `invitation-acceptance-local.json`. O teste web concluiu 468 casos em 61 arquivos e build de produção; `mvnw verify` concluiu 609 testes e oito regras ArchUnit no backend.

Limites de produto: fila offline, notificações do aparelho e fotografias locais são capacidades exclusivas do dispositivo. Declarações e envio GEDAVE não são apresentados como oficiais sem contrato e validação regulatória.
