# Auditoria parcial — Phase 02

Esta auditoria registra o estado do checkpoint `4a973b9`; não representa o gate final de revisão visual.

## CRITICAL

Nenhum defeito crítico identificado nos contratos e testes executados.

## HIGH

- Integração autenticada do dashboard ainda não provada nesta sessão: `GR_SMOKE_*` não está definido e não há `.env.smoke.local` no `gr-web`. O script `npm run smoke:local` foi ampliado, porém precisa de configuração local para rodar contra Supabase Auth e `gr-service`.
- Revisão visual nos viewports específicos de 1440, 1280 e 1024 px ainda não capturada. O navegador conectado exibiu a vitrine em largura maior; a ferramenta disponível não expôs override de viewport. A responsividade foi inspecionada estaticamente no CSS e depende de validação visual.

## MEDIUM

Nenhum defeito médio identificado nos cenários cobertos. A ausência das duas provas acima impede declarar a fase concluída, independentemente dos testes verdes.

## LOW

- A build emite aviso de orçamento do CSS do componente Home: 9,99 kB contra 8 kB. A build conclui e o bundle da Home permanece lazy; vale separar estilos por componentes quando a composição for refinada após a revisão manual.
- O período não está na URL; a escolha persiste apenas enquanto o serviço estiver ativo.
- A rota de agenda completa ainda é placeholder da Phase 01; o link aponta para a rota real já cadastrada.

## Evidências

- Contratos checados em `gr-service`: `ReadHerdDashboard`, `HerdDashboardRepository`, `HerdAgendaController`, `ReadHerdAgenda` e `PaddockController`.
- `npm run check`: 17 arquivos de teste e 78 testes verdes; build de produção verde com aviso LOW acima.
- `npx tsc -p tsconfig.app.json --noEmit`: verde.
- `npm audit --audit-level=moderate`: 0 vulnerabilidades.
- `git diff --check` e `git diff --cached --check`: verdes.
- Vitrine `/dev/dashboard` revisada em estados preenchido, vazio, erro parcial e período personalizado. `/dev/dashboard` não ficou acessível ao servir a configuração de produção; redirecionou a `/entrar`.
- Corridas de fazenda e período, falhas parciais, retry, validação de datas, navegação por teclado e tabela textual do gráfico cobertos por testes.
