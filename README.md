# BovNex — Portal Web

Portal Angular do BovNex para gestão pecuária. A aplicação reúne a identidade “Território Vivo”, o Design System, autenticação Supabase e contexto de organização/fazenda integrado ao `gr-service`.

## Requisitos

- Node.js 24.0 ou superior (a versão usada nesta entrega foi 24.11.1)
- npm 11 ou superior
- `gr-service` executando localmente para fluxos autenticados
- Supabase local ou projeto Supabase configurado somente para autenticação

O projeto usa Angular 21.2.x. Angular 22.1 era a versão mais recente no início do repositório, mas exigia Node 24.15 ou superior; Angular 21 foi escolhido por ser a versão estável compatível com o ambiente disponível. O builder está fixado em `@angular/build@21.2.13` porque versões posteriores observadas nesta stack imprimiam sucesso e mantinham o processo aberto. Dependências transitivas vulneráveis desse builder foram substituídas por versões seguras via `overrides`; testes, build e `npm audit` foram revalidados.

## Configuração

Os arquivos versionados `src/environments/environment.ts` e `src/environments/environment.production.ts` contêm apenas valores sentinela seguros. A configuração real de desenvolvimento fica em `src/environments/environment.local.ts`, ignorado pelo Git e usado somente por `npm run start:local`.

Para integrar o portal à stack local, copie `src/environments/environment.local.example.ts` para `src/environments/environment.local.ts` e configure:

- `apiBaseUrl`: URL do `gr-service`, sem `/api/v1` no final;
- `supabaseUrl`: URL pública do projeto Supabase;
- `supabaseAnonKey`: chave pública `anon`/publishable.

Use apenas a chave pública `anon`/publishable. Nunca use `service_role`, senha de banco ou segredo de assinatura JWT no frontend. O arquivo local não deve ser versionado.

## Comandos

```bash
npm ci
npm start
npm run start:local
npm test
npm run typecheck:app
npm run typecheck:spec
npm run build
npm run serve:production
npm run check
```

Use `npm ci` em CI e validações de release. `npm start` serve a interface com placeholders seguros; `npm run start:local` usa a configuração local real. `npm run check` executa os dois typechecks, a suíte completa e o build otimizado. O build de produção nunca lê `environment.local.ts`.

## Smoke de integração local

Com Supabase e `gr-service` locais em execução, use uma conta de desenvolvimento com duas organizações acessíveis e ao menos duas fazendas em uma delas. Se ainda não houver `.env.smoke.local`, `node scripts/provision-local-smoke.mjs` cria uma conta e contextos descartáveis somente na stack local, sem resetar dados existentes. Confirme que o arquivo é ignorado pelo Git; não versione nem compartilhe a senha. Também é possível definir as variáveis abaixo no processo antes de executar `npm run smoke:local`:

| Variável | Conteúdo |
| --- | --- |
| `GR_SMOKE_SUPABASE_URL` | URL do Supabase Auth local |
| `GR_SMOKE_SUPABASE_PUBLIC_KEY` | Chave pública local |
| `GR_SMOKE_API_URL` | URL base do `gr-service` |
| `GR_SMOKE_EMAIL`, `GR_SMOKE_PASSWORD` | Conta local de desenvolvimento |
| `GR_SMOKE_VIEWER_EMAIL`, `GR_SMOKE_VIEWER_PASSWORD` | Conta opcional com papel `VIEWER` para provar HTTP 403 |

O smoke não imprime tokens nem senhas. Ele verifica login, restauração, refresh, logout, leitura real, troca de contexto e cenários 400, 401, 404, 409 e backend indisponível; com a conta opcional, também verifica 403. Falhas 500/503 são cobertas pelo modelo de erro sem derrubar o banco local.

O catálogo interno do Design System fica em `/dev/design-system` e só é incluído no roteamento de desenvolvimento.

## Arquitetura

- `core/auth`: sessão Supabase, restauração, refresh e logout;
- `core/api`: cliente tipado, interceptors e erro normalizado;
- `core/context`: seleção e revalidação de organização/fazenda;
- `core/permissions`: capacidades derivadas dos papéis do backend;
- `design-system`: primitives, surfaces, feedback, navigation e data-display;
- `layout`: shell responsivo autenticado;
- `features`: páginas lazy-loaded por área de produto.

Signals armazenam estado local e contextual; RxJS permanece no transporte HTTP. O backend é a única fonte de verdade para domínio e autorização.

## Documentação

- [Fundação do portal](docs/architecture/portal-foundation.md)
- [Design System v1](docs/design-system/design-system-v1.md)
- [Integração com o backend](docs/integration/backend-api.md)
- [Auditoria da Phase 01](docs/phase-01-audit.md)
- [Portal MVP Readiness, runbook e checklist de release](docs/portal-mvp-readiness.md)
