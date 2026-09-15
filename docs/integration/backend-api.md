# Integração com o backend

Autoridade de contrato: `gr-service` no SHA `8281424b6ba0b01f68dea138f8c99f9e4996a217`, especialmente `docs/api/consumer-guide.md`, `docs/api/endpoint-inventory.md` e OpenAPI local.

## Fluxo inicial

1. O Supabase restaura ou cria a sessão de autenticação.
2. O portal chama `GET /api/v1/me`.
3. Carrega `GET /api/v1/me/organizations`.
4. Revalida o ID persistido ou escolhe a primeira organização autorizada.
5. Carrega `GET /api/v1/me/organizations/{organizationId}/farms`.
6. Revalida a fazenda persistida ou escolhe a primeira autorizada.
7. Confirma com `GET /api/v1/context`.
8. Só então persiste os IDs e libera o contexto operacional.

Trocas limpam imediatamente a fazenda anterior, aumentam `contextVersion` e confirmam o novo contexto. Em falha, o contexto anterior é restaurado.

## Headers

Todas as chamadas ao `gr-service` recebem `Authorization: Bearer <token>`. Chamadas marcadas explicitamente como tenant-aware também recebem:

```http
X-Organization-Id: <uuid>
X-Farm-Id: <uuid>
```

Bootstrap não recebe headers tenant. O cliente não gera correlation ID por padrão; erros capturam `requestId` do envelope e, como fallback, `X-Correlation-ID` ou `X-Request-ID` da resposta.

## Erros

`AppError` normaliza validation, unauthorized, forbidden, not-found, conflict, unavailable e unexpected. O status HTTP é a autoridade; código, erros de campo e referência são preservados, enquanto a mensagem mostrada ao usuário é curta e segura. Um 401 durante sessão ativa limpa autenticação e contexto e navega para `/entrar`. Erros de rede sem resposta HTTP são classificados como indisponibilidade.

O smoke local opcional (`npm run smoke:local`) usa apenas Supabase Auth e endpoints reais do `gr-service`, sem acesso direto às tabelas. Ele confirmou os headers documentados na leitura de `/api/v1/context` e `/api/v1/farms/current`, inclusive após trocas de organização/fazenda. Para o cenário 403 de um `VIEWER`, usa `GET /api/v1/organizations/{organizationId}/invitations`: o código do backend exige `OWNER`/`ADMIN` nessa rota. O inventário de endpoints rotula a leitura de membros como administrativa, mas o código atual permite qualquer membership ativa; essa divergência documental não é usada como regra pelo portal.

## Regra de freeze

O Backend MVP está funcionalmente congelado. O portal nunca acessa tabelas Supabase, cria RPC direta ou inventa endpoints/campos para contornar um contrato ausente. Um gap real deve ser documentado e só justifica mudança no backend por bug, contrato ausente ou requisito real de cliente.
