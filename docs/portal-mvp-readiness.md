# Portal MVP Readiness

Este documento é o checklist operacional do Portal BovNex. Ele complementa a documentação de cada feature e deve ser usado antes de promover um artefato para produção.

## Escopo do MVP

O Portal inclui autenticação, visão geral, animais, movimentações, saúde, reprodução, agenda, relatórios, administração de organização/fazendas/pessoas e aceitação de convites. Estoque/insumos, Financeiro genérico, branding definitivo e o Premium Experience Pass não fazem parte deste MVP.

## Arquitetura e inventário

- Rotas públicas: `/entrar`, `/convites/:token` autenticada e a página curinga 404.
- Rotas privadas sob o shell: `/visao-geral`, `/rebanho/animais`, perfil/cadastro de animal, movimentações, saúde, reprodução, agenda, relatórios e administração.
- Guards: restauração de sessão, bootstrap de contexto e capabilities derivadas de `OWNER`, `ADMIN`, `MANAGER`, `OPERATOR` e `VIEWER`.
- Sessão: Supabase somente para Auth; o Portal não acessa Database ou Storage diretamente.
- API: `ApiClient` e interceptors adicionam bearer e contexto somente ao host configurado do `gr-service`.
- Contexto: `ContextStore` revalida organização/fazenda, persiste apenas IDs não sensíveis e incrementa `contextVersion` para invalidar leituras antigas.
- Estado: Signals locais; RxJS no transporte. Respostas obsoletas são descartadas por geração ou cancelamento.
- Erros: envelope normalizado para 400, 401, 403, 404, 409, 429, 500, 502, 503 e falha de rede, sem exibir payload ou stack trace.
- Rotas `/dev/design-system`, `/dev/dashboard` e `/dev/herd` existem somente em builds que usam `environment.production: false`.

## Configuração e build

Requisitos: Node.js 24+, npm 11+ e configuração real fornecida pelo pipeline antes do build.

```bash
npm ci
npm run check
npm audit --audit-level=low
npm run serve:production
```

O build de produção substitui `environment.ts` por `environment.production.ts`. Antes da compilação, configure no arquivo gerado pelo pipeline:

- `apiBaseUrl`: origem HTTPS do `gr-service`, sem `/api/v1` no final;
- `supabaseUrl`: origem HTTPS do projeto Supabase;
- `supabaseAnonKey`: chave pública `anon`/publishable.

Nunca coloque `service_role`, segredo JWT, senha do banco ou credencial de smoke no bundle. `environment.local.ts` e `.env.smoke.local` são ignorados pelo Git e não entram no build de produção. Source maps ficam desabilitados na configuração de produção atual. O `base href` permanece `/`, portanto o deploy esperado é na raiz de uma origem.

## Hosting SPA e cache

O host deve:

- servir arquivos existentes de `dist/gr-web/browser` normalmente;
- redirecionar internamente rotas sem extensão para `index.html`, preservando a URL e retornando o app shell;
- não aplicar fallback a assets ausentes;
- usar cache longo e `immutable` somente nos assets com hash;
- servir `index.html` com `no-cache` ou revalidação, para evitar shell antigo após deploy;
- comprimir Brotli ou gzip quando disponível.

Headers mínimos recomendados no host, ajustados às origens reais:

```text
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self' https://API_REAL https://SUPABASE_REAL; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
Referrer-Policy: strict-origin-when-cross-origin
X-Content-Type-Options: nosniff
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

Prefira `frame-ancestors 'none'` no CSP. `X-Frame-Options: DENY` pode ser mantido como compatibilidade. HSTS pertence ao terminador TLS e só deve ser habilitado quando toda a origem operar exclusivamente em HTTPS.

## Smoke local repetível

1. Confirme Supabase Auth local e PostgreSQL saudáveis.
2. Inicie `gr-service` com perfil `local`, login runtime dedicado e readiness verde em `/actuator/health/readiness`.
3. Configure `src/environments/environment.local.ts` a partir do exemplo.
4. Mantenha as credenciais descartáveis somente em `.env.smoke.local`.
5. Execute `npm run smoke:local`.

O smoke prova login, sessão, refresh, logout, bootstrap, trocas de organização/fazenda, leituras transversais, criação e replay, locking 409, administração, convite, não enumeração e indisponibilidade de rede. As mutations usam fixtures locais reconhecíveis e nunca produção.

## Diagnóstico rápido

### Falha de autenticação

- Confirme URL/anon key do Supabase e issuer/JWKS do backend.
- Verifique a aba Network sem copiar bearer tokens para tickets ou logs.
- Um 401 durante uso deve limpar dados privados e voltar a `/entrar?motivo=sessao-expirada`, sem repetir mutation.

### Backend indisponível

- Consulte `/actuator/health/readiness` no ambiente da API.
- Diferencie falha de rede/502/503 de 400 de validação.
- No bootstrap, use “Tentar novamente”; nas features, use o retry local oferecido. Não é necessário recarregar toda a página.
- Use o request/correlation ID exibido pela UI quando disponível.

### Contexto inválido

- Confirme membership ativa, escopo da fazenda e estados da organização/fazenda.
- Limpe somente os IDs `gr.context.organization` e `gr.context.farm` se for necessário diagnosticar seleção persistida; nunca manipule tokens.
- Revalidação escolhe o primeiro contexto ainda acessível ou mostra o estado vazio apropriado.

## Checklist de release

- [ ] Branch de release parte da `main` aprovada e o worktree não contém alterações acidentais.
- [ ] `npm ci` conclui a partir do lockfile.
- [ ] `npm run check` passa: typecheck do app, typecheck de specs, testes e build de produção.
- [ ] `npm audit --audit-level=low` retorna zero vulnerabilidades.
- [ ] URLs e chave pública do ambiente foram injetadas; nenhum valor local aparece no bundle.
- [ ] Readiness do backend está verde e migrations aprovadas foram aplicadas.
- [ ] Login, refresh em rota profunda e logout funcionam.
- [ ] Trocas de organização e fazenda não reapresentam dados anteriores.
- [ ] `/visao-geral`, animais/perfil, saúde, reprodução, agenda, relatórios e administração carregam conforme o papel.
- [ ] Convite válido e convite inválido/consumido têm resultado previsível.
- [ ] VIEWER lê e não recebe ações de mutation; OWNER/ADMIN mantêm proteções administrativas.
- [ ] URL inexistente mostra 404; deep links retornam `index.html` pelo fallback SPA.
- [ ] Assets não retornam 404; console não apresenta erro material; Network não mostra duplicidade ou chamada externa inesperada.
- [ ] Viewports de 1440, 1280 e 1024 px e zoom de 200% preservam acesso às ações críticas.
- [ ] Headers de segurança, TLS, CSP e cache foram verificados no ambiente publicado.
- [ ] Smoke pós-deploy usa conta não produtiva controlada e não executa mutations destrutivas.
- [ ] SHA do artefato foi registrado e a versão anterior permanece disponível para rollback.

## Rollback

O Portal não executa migrations. Em incidente restrito ao frontend, restaure o artefato estático anterior e revalide `index.html`, assets, login e uma rota profunda. Não reverta o backend automaticamente: confirme compatibilidade de contrato e estado das migrations. Preserve request IDs e horário do incidente, sem tokens ou dados pessoais.

## Limitações LOW aceitas

| Item | Classificação | Decisão |
| --- | --- | --- |
| Total de membros não é informado pelo contrato paginado | A — aceitável no MVP | A UI informa a página e a presença de próxima página sem inventar total. |
| Convite pendente não retorna IDs das fazendas selecionadas | D — evolução de backend | A criação mostra o resumo exato; a lista posterior usa “Fazendas selecionadas”. |
| Filtros de relatório por UUID dependem de IDs conhecidos | D — evolução de backend | Não existe busca auxiliar no contrato atual; nenhum nome ou acesso é inferido. |
| Período personalizado da Home não persiste na URL | A — aceitável no MVP | Relatórios e lista de animais preservam seus filtros em URL; a Home mantém estado da sessão da feature. |
| Marca e acabamento visual detalhado permanecem provisórios | C — Phase 08 | Não bloqueia correção, segurança ou operação do MVP. |
| Revisão automatizada em navegador indisponível nesta execução | A — verificação humana de release | Breakpoints, semântica, build e testes estão cobertos; a checklist exige inspeção antes da promoção. |

## Observabilidade

O Portal preserva request/correlation IDs seguros retornados pelo backend e os apresenta nos estados de erro que oferecem referência de suporte. Não existe provider externo de erro no MVP; sua adoção pode ser avaliada após a release. O frontend não deve consultar health continuamente: readiness pertence ao deploy, ao monitoramento e a este runbook.

## Resultado da auditoria Phase 07

CRITICAL: nenhum. HIGH: nenhum. MEDIUM: nenhum. LOW: somente os itens aceitos acima. O backend permaneceu inalterado.
