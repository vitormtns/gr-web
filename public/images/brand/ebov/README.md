# eBov — brand assets oficiais

Arquivos temporários. Serão SUBSTITUÍDOS MANUALMENTE pelos assets
oficiais, mantendo EXATAMENTE os mesmos filenames. Nenhuma mudança
de código é necessária após a substituição.

## Arquivos referenciados pelo código

- `sidebar-logo.png`
  Uso: logo horizontal/negativo sobre a sidebar verde (expandida).
  O arquivo `sidebar-logo.svg` no mesmo diretório está vazio
  (grupo sem paths) e NÃO é referenciado — não voltar a usá-lo
  até que um vetorial oficial válido seja colocado no seu lugar.

- `symbol.svg`
  Uso: símbolo isolado eBov, exibido quando a sidebar está recolhida.
  Arquivo ainda placeholder; será substituído pelo símbolo oficial.

- `logo-horizontal.svg`
  Uso: logo principal para fundos claros. Reservado para login,
  páginas institucionais e futuras superfícies.

- `favicon.svg`
  Uso: favicon do browser (`src/index.html`).
  A cada troca manual do arquivo, incremente o cache-buster no link
  (`?v=ebov-2`, `?v=ebov-3`, …) para invalidar o cache agressivo
  de favicon do navegador. Nunca use timestamp dinâmico.

## Arquivos futuros (não referenciar no código ainda)

- `app-icon-192.png`
- `app-icon-512.png`
- `apple-touch-icon.png`

Não criar PWA, manifest ou requests para arquivos inexistentes.
