# Gerenciador Rural — Portal Web

Portal Angular do Gerenciador Rural. Esta entrega estabelece a Phase 01: arquitetura, identidade “Território Vivo”, Design System v1, autenticação Supabase e contexto de organização/fazenda integrado ao `gr-service`.

## Requisitos

- Node.js 24.0 ou superior (a versão usada nesta entrega foi 24.11.1)
- npm 11 ou superior
- `gr-service` executando localmente para fluxos autenticados
- Supabase local ou projeto Supabase configurado somente para autenticação

O projeto usa Angular 21.2.24. Angular 22.1 era a versão mais recente no início do repositório, mas exigia Node 24.15 ou superior; Angular 21 foi escolhido por ser a versão estável compatível com o ambiente disponível.

## Configuração

Os valores de desenvolvimento ficam em `src/environments/environment.ts`; produção usa `src/environments/environment.production.ts` por substituição de build.

Configure antes de executar:

- `apiBaseUrl`: URL do `gr-service`, sem `/api/v1` no final;
- `supabaseUrl`: URL pública do projeto Supabase;
- `supabaseAnonKey`: chave pública `anon`/publishable.

Nunca use a `service_role` no frontend. Nenhum segredo real deve ser versionado.

## Comandos

```bash
npm install
npm start
npm test
npm run build
npm run check
```

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
