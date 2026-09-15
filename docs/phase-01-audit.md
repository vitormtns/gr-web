# Auditoria — Phase 01

Data: 15/09/2026

## Resultado

- CRITICAL: nenhum.
- HIGH: nenhum.
- MEDIUM: nenhum.
- LOW: revisão visual em navegador pendente porque nenhuma superfície de navegador estava disponível; placeholders de produção precisam ser preenchidos pelo pipeline de cada ambiente; o inventário do backend rotula `GET /organizations/{id}/members` como administrativo, mas o código atual permite leitura por membership ativa. O portal não depende dessa divergência.

Visual browser review: PENDING MANUAL REVIEW. A leitura estática do CSS cobriu os breakpoints de 1440, aproximadamente 1280 e 1024 px, mas não substitui uma inspeção de pixels, clipping, contraste e foco nesses viewports. Essa revisão é um gate antes de implementação visual pesada da Phase 02.

## Integração real

O smoke local contra Supabase Auth e `gr-service` confirmou login válido, JWT, restauração da sessão em um novo cliente, evento de refresh, logout e remoção da sessão persistida. Foram lidas identidade, organizações, fazendas, contexto autorizado e perfil da fazenda atual com `Authorization`, `X-Organization-Id` e `X-Farm-Id` exatamente como no contrato. A segunda organização e a segunda fazenda provaram a troca e a ausência de fazenda antiga nas requisições seguintes.

Os cenários negativos reais retornaram 400 (headers ausentes), 401 (JWT ausente), 403 (visualizador sem acesso administrativo), 404 (organização/fazenda inacessível) e 409 (versão desatualizada sem alteração). Backend indisponível falhou como erro de rede. Não foi criada falha destrutiva para induzir 500/503; ambos são cobertos pelo normalizador e testes.

## Arquitetura, UX e segurança

- Angular standalone, lazy routes, Signals, `OnPush`, guards e capacidades por papel continuam separados do contrato de autorização do backend.
- IDs persistidos são revalidados com opções acessíveis; a resposta de `/api/v1/context` também precisa coincidir com a seleção antes da persistência.
- A transição oculta o conteúdo anterior, limpa imediatamente a fazenda antiga e restaura a seleção anterior após falha. O menu móvel expõe os dois seletores.
- JWT e headers de contexto só são anexados a caminhos `/api/` da URL base exata; URL externa com prefixo parecido não recebe credenciais.
- O status HTTP, não o campo do envelope, classifica o erro. Mensagens de UI são seguras e naturais em pt-BR; o ID de correlação é validado e uma referência curta pode aparecer no estado de erro.
- A chave pública real de desenvolvimento fica apenas em `environment.local.ts`, ignorado pelo Git. Arquivos versionados têm placeholders; o bundle de produção não contém a chave local. Não há `service_role`, senha de banco, segredo JWT, HTML arbitrário nem logs de tokens.
- O builder Angular foi fixado em 21.2.13 por um problema de encerramento de processo em versões posteriores. `overrides` mantêm Babel, esbuild, Piscina, Undici e Vite em versões auditadas como seguras.

## Design System e acessibilidade

“Território Vivo” mantém Inter Variable, verde profundo, superfícies claras e cartografia sutil; não foram introduzidos gradientes decorativos, sombras pesadas ou componentes da Phase 02. Login possui `h1` acessível; campos associam rótulos e erros; select de contexto apresenta foco visível; abas aceitam setas/Home/End; popover usa `summary` sem botão aninhado e fecha com Escape; Dialog/Drawer usam `<dialog>` nativo. A tabela possui rolagem horizontal focável. `prefers-reduced-motion` reduz animações e transições.

## Evidências

- `npm run smoke:local`: passou contra serviços reais.
- `npm test`: 57 testes verdes, código de saída 0.
- `npx tsc --noEmit -p tsconfig.app.json` e `tsconfig.spec.json`: sem erros.
- `npm run build`: produção compilada, código de saída 0.
- `npm audit --audit-level=low`: 0 vulnerabilidades.
- `git diff --check`: sem erros de whitespace.
