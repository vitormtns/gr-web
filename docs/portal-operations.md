# Operações de gestão no portal eBov

## Insumos

O menu **Gestão → Insumos** reúne estoque, produtos, depósitos e movimentações. O catálogo de produtos pertence à organização; depósitos, saldos e movimentos pertencem à fazenda selecionada.

Proprietários, administradores e gerentes administram os cadastros. Operadores também registram entradas, saídas, ajustes e transferências entre depósitos. Visualizadores podem consultar estoque e histórico.

A unidade base permanece fixa após o cadastro. Cada movimentação passa por revisão e confirmação. Ajustes exigem justificativa; transferências exigem depósitos diferentes. A API valida saldos e atualiza a operação completa. Produtos e depósitos com saldo não podem ser desativados. Movimentos registrados permanecem no histórico.

Os filtros e a paginação de estoque e histórico usam os contratos da API. O detalhe do depósito inclui sua posição de estoque; o detalhe do movimento apresenta os saldos resultantes e o responsável.

## Financeiro

O menu **Gestão → Financeiro** reúne lançamentos, resumo e categorias. Categorias pertencem à organização; lançamentos e valores pertencem à fazenda selecionada.

Proprietários, administradores e gerentes administram categorias. Operadores também registram, corrigem, liquidam e cancelam lançamentos. Visualizadores consultam dados e histórico.

O cadastro de receita ou despesa exige categoria ativa compatível, descrição, valor positivo e vencimento. O tipo permanece fixo após o registro. Somente lançamentos pendentes podem ser corrigidos, liquidados ou cancelados. Cada operação passa por revisão e confirmação; correções e conclusões utilizam a versão carregada do lançamento. O histórico permanece disponível após a conclusão.

O período do resumo corresponde ao **vencimento**. Totais pendentes, liquidados e vencidos são calculados pelo serviço. Lançamentos cancelados ficam fora desses totais. O detalhamento por categoria inclui todas as categorias do período, com paginação de apresentação.

Vendas de animais e saídas de insumos não criam lançamentos financeiros automaticamente. O portal informa essa condição e permite registrar o lançamento correspondente.

Valores monetários e quantidades preservam a representação decimal enviada e recebida. A interface aplica a formatação brasileira sem recalcular saldos ou totais.

## Piquetes

O menu **Rebanho → Piquetes** permite buscar cadastros ativos e inativos, revisar nome, código e situação, consultar ocupação, abrir animais e acompanhar o histórico de movimentações. Proprietários, administradores e gerentes administram piquetes; operadores e visualizadores consultam.

A ocupação é calculada pelo serviço e não pela quantidade de animais na página atual. Animais e movimentos possuem paginações independentes. Piquetes ocupados não podem ser desativados. O perfil do animal concentra suas operações individuais.

## Administração

O menu **Gestão → Administração** reúne organizações, visão geral, fazendas, perfil da fazenda atual, pessoas e acessos, e auditoria administrativa.

A lista de organizações inclui todos os ambientes associados por um vínculo ativo, inclusive suspensos ou arquivados. Uma conta autenticada pode cadastrar sua própria organização sem uma fazenda selecionada. Apenas proprietários alteram nome ou situação da organização; a consulta administrativa permite descobrir e reativar um ambiente que saiu do seletor de operação.

Proprietários e administradores cadastram, corrigem, arquivam e reativam fazendas, com consulta individual da versão atual e confirmação. A página **Fazenda atual** usa exclusivamente o contexto operacional autorizado. Os demais papéis consultam os cadastros.

Todos os papéis consultam pessoas e escopos da organização. Proprietários e administradores gerenciam acessos, respeitando a proteção do último proprietário e a restrição de administradores sobre papéis elevados. Para incluir uma conta já cadastrada, o identificador está disponível no menu da própria conta. Para uma nova pessoa, use o convite por e-mail e compartilhe manualmente o link gerado uma única vez. Não há envio automático de e-mail.

Pessoas e convites possuem paginações independentes. Convites incluem consulta de pendentes, aceitos, cancelados e expirados. A auditoria, restrita a proprietários e administradores, filtra evento e fazenda e apresenta data e hora no fuso do navegador, sem JSON bruto.

Cadastros de organizações e fazendas conservam o UUID em novas tentativas. O serviço reconhece a repetição do comando original sem duplicar cadastro, vínculo ou evento de auditoria. Os testes locais de criação e recuperação encerram organizações e fazendas temporárias pelo arquivamento; seu histórico permanece preservado.

## Troca de contexto e falhas

Ao trocar organização ou fazenda, essas áreas cancelam consultas, invalidam respostas antigas e limpam cadastros abertos, seleções e confirmações. Respostas de escritas anteriores não abrem detalhes nem exibem mensagens na nova fazenda.

Falhas de carregamento oferecem nova tentativa e não apresentam totais fictícios. Mensagens de conflito orientam a recarregar e revisar dados. Repetir a confirmação de uma movimentação ou lançamento conserva o identificador da operação.

## Validação

Execute `npm run check` para verificar tipos, testes e build. Os testes focados cobrem contratos HTTP, permissões, presença de campos e versões, revisão e confirmação, repetição de comandos, filtros, paginação, precisão decimal, falhas e troca de contexto.

O smoke usa o shell renderizado e a API conectada exclusivamente ao Supabase local. Cadastros temporários de insumos e piquetes são encerrados pela aplicação após a conferência. No financeiro, lançamentos concluídos permanecem no histórico conforme o contrato; a conferência utiliza valores mínimos, encerra pendências e desativa a categoria de teste.
