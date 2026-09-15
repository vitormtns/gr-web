# Fundação do portal

## Limites

O portal é um cliente Angular standalone, desktop-first e responsivo. Rotas públicas e autenticadas são separadas; áreas futuras são carregadas sob o shell por lazy loading e exibem apenas estados de preparação, sem antecipar regras de negócio.

## Estado

Estado simples usa Signals em stores focados:

- `AuthStore`: sessão, restauração, autenticação e logout;
- `ContextStore`: identidade interna, organizações, fazendas e versão do contexto;
- `PermissionService`: capacidades calculadas a partir do papel atual.

`contextVersion` muda sempre que organização ou fazenda muda. Durante a transição, o shell oculta o conteúdo anterior e anuncia a validação do novo contexto. Features futuras devem observar a versão ou encapsular cache em serviços que o invalidem, evitando mostrar dados de outro contexto.

## Roteamento e guards

`authGuard` restaura a sessão antes de abrir o shell. `contextGuard` inicializa identidade e opções autorizadas; falhas transitórias permanecem em um estado de erro dentro do shell, enquanto 401 limpa a sessão. `permissionGuard` oferece proteção de UX por capacidade, sem substituir a autorização do backend.

## Adicionando uma feature

1. Crie a rota lazy em `app.routes.ts`.
2. Coloque contratos HTTP no domínio da feature ou reutilize somente contratos estáveis de `core/api`.
3. Marque com `requiresContext = true` apenas chamadas documentadas como `CTX`.
4. Derive ações de `PermissionService`; não compare papéis em templates.
5. Use tokens e componentes do Design System.
6. Trate estado local quando precisar de mensagem específica; deixe transporte e normalização na infraestrutura.
7. Adicione testes de contexto, permissão e erro pertinentes.

## Renderização e desempenho

Componentes usam `OnPush`, rotas de tela são lazy e a iconografia Lucide é registrada de forma explícita. Não há biblioteca de estado global nem pacote de animação. Inter Variable é empacotada localmente para renderização consistente e independência de CDN.
