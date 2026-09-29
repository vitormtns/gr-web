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

## Operações em lote e custódia do rebanho

A seleção de animais ativos permite registrar pesagens individuais em lote, mover animais entre piquetes e transferir a custódia entre fazendas. Cada lote tem até 100 animais, conserva as versões consultadas e exige revisão antes da confirmação. Uma nova tentativa de confirmação reutiliza o comando e o identificador da operação. Pesagens aceitam até três casas decimais e datas entre o nascimento e o dia atual.

Proprietário, administrador, gestor e operador podem pesar e movimentar animais. A transferência entre fazendas é permitida a proprietário, administrador e gestor. O visualizador consulta os registros sem ações de escrita. A autorização continua sendo validada pelo backend.

Os piquetes de destino são consultados em todas as páginas do catálogo. Na transferência, a consulta usa explicitamente a fazenda escolhida entre as fazendas acessíveis, sem alterar o contexto operacional da tela. O piquete de destino é opcional nesse fluxo.

Em **Movimentações**, as opções **Entre piquetes** e **Entre fazendas** levam aos históricos correspondentes. Movimentos internos têm filtros de período, animal, origem e destino, incluindo piquetes inativos. O histórico de custódia oferece filtros de direção e animal, paginação e consulta individual com horário, responsável, versão e observações. O acesso ao perfil na fazenda de destino confirma a mudança de contexto antes da navegação.

Ao trocar organização ou fazenda, as consultas em andamento são canceladas e a seleção, os formulários, os detalhes e os filtros anteriores são apagados.

O perfil do animal oferece abas de pesagens, saúde, gestações e crias. Pesagens e tratamentos usam a contagem real do backend; gestações preservam situação, confirmação, previsão e desfecho. A consulta de crias tem navegação por páginas de 20 registros, sem inventar uma contagem total que o contrato não fornece. Os vínculos maternos e as crias levam aos perfis relacionados. O histórico auditado pode ser filtrado pelo tipo de evento.

A correção cadastral individual exige revisão antes da confirmação. Movimentação e transferência individuais consultam o catálogo completo; a transferência permite definir o piquete na fazenda de destino. As operações validam a data, bloqueiam envio duplicado e apagam os formulários na troca de contexto. Falhas de consultas operacionais são exibidas; apenas a ausência legítima de vínculo materno é tratada como ausência de registro.

## Agenda e indicadores da Home

A agenda possui consultas independentes para a sequência unificada, pendências derivadas e atividades planejadas. Os filtros e a paginação utilizam o backend. Atividades planejadas incluem registros abertos, concluídos e cancelados; a consulta individual mostra versões e datas de encerramento.

Proprietários, administradores, gestores e operadores planejam, corrigem, concluem e cancelam atividades. O visualizador consulta. A criação e a correção exigem revisão; alterações em atividades existentes consultam sua versão atual. A confirmação conserva o comando em novas tentativas e é cancelada na troca de contexto. Concluir uma atividade não registra automaticamente pesagem, tratamento ou parto.

A Home oferece acesso direto a insumos, financeiro e administração. Os indicadores de pesagens, saúde, reprodução, partos, atividades e movimentações abrem as consultas correspondentes com os filtros do domínio. A consulta de atividades concluídas abre o histórico completo; o período do gráfico permanece identificado separadamente. Falhas no resumo ou no catálogo de piquetes oferecem nova tentativa e não substituem os dados indisponíveis por zero.

O teste local criou duas atividades fictícias pelo portal. A primeira recebeu correção da data e cancelamento; a segunda foi concluída. Ambas permanecem encerradas no histórico, sem pendências de teste abertas.

## Troca de contexto e falhas

Ao trocar organização ou fazenda, essas áreas cancelam consultas, invalidam respostas antigas e limpam cadastros abertos, seleções e confirmações. Respostas de escritas anteriores não abrem detalhes nem exibem mensagens na nova fazenda.

Falhas de carregamento oferecem nova tentativa e não apresentam totais fictícios. Mensagens de conflito orientam a recarregar e revisar dados. Repetir a confirmação de uma movimentação ou lançamento conserva o identificador da operação.

## Validação

Execute `npm run check` para verificar tipos, testes e build. Os testes focados cobrem contratos HTTP, permissões, presença de campos e versões, revisão e confirmação, repetição de comandos, filtros, paginação, precisão decimal, falhas e troca de contexto.

O smoke usa o shell renderizado e a API conectada exclusivamente ao Supabase local. Cadastros temporários de insumos e piquetes são encerrados pela aplicação após a conferência. No financeiro, lançamentos concluídos permanecem no histórico conforme o contrato; a conferência utiliza valores mínimos, encerra pendências e desativa a categoria de teste.

No teste de lotes, dois animais fictícios foram criados pelo portal, pesados, movimentados, transferidos com piquete de destino e retornados à fazenda de origem. Ambos foram encerrados pelo fluxo de baixa, com motivo e observações que identificam explicitamente o teste local. Esses fatos continuam no histórico, e os animais anteriores foram preservados. Um cadastro fictício também recebeu correção de nome com revisão e confirmação.
