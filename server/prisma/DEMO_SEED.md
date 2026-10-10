# Seed demonstrativo do marketplace

`npm run seed:check` monta e valida o fixture em memória; não instancia o Prisma Client nem acessa o banco. `npm run seed` é o comando explícito de escrita. O seed não roda junto com a inicialização do servidor nem com migrações. O seed e as migrações não foram executados nesta etapa.

## Volume e cenários

- 100 usuários, 84 perfis profissionais; algumas contas atuam também como clientes.
- 13 categorias, 23 bairros de Curitiba/PR, 210 serviços e 200 itens de portfólio.
- 64 solicitações, 170 conversas, 201 propostas independentes e 231 versões.
- 571 mensagens, 39 ordens, 24 avaliações e disponibilidade semanal para 55 prestadores.
- Sessenta conversas têm pelo menos duas propostas independentes. Trinta propostas têm uma revisão; cada versão enviada tem seu próprio card no chat.
- Há conversas sem proposta, propostas expiradas/retiradas/rejeitadas, solicitações pausadas sem aceitação e solicitações abertas para comparar prestadores de chats diferentes.
- `request-061` demonstra recontratação: uma ordem cancelada e sua versão aceita permanecem no histórico; `reopenedAt` registra a reabertura, uma nova proposta independente é aceita e uma segunda ordem fica em andamento na mesma solicitação. Nenhuma das duas ordens foi apagada.

Todas as contas usam o domínio reservado `.invalid` e `User.isDemo = true`. Solicitações, ordens, avaliações e itens de portfólio têm `isDemo = true`. As avaliações demonstrativas não entram na reputação real. Os portfólios não têm ordem vinculada e não são verificados. O frontend não possui retratos nem imagens de portfólio adequados; por isso o seed deixa `avatarUrl` nulo e não cria referências quebradas nem imagens. A interface deve apresentar um fallback estável.

## Datas

Os dados usam a referência fixa `2026-10-10T15:00:00Z`. Criação, envio, mensagens e eventos concluídos/cancelados ficam até essa referência. A validação local rejeita versões já criadas/enviadas ou mensagens posteriores à referência e confirma que a revisão vem depois do envio anterior e que o card não antecede sua versão. Validade, data desejada e janela de atendimento são datas previstas e podem estar no futuro.

## Propriedade e reexecução

O seed registra, em `DemoSeedOwnership`, o `seedKey`, o tipo da entidade e o ID de cada registro que ele criou. Esse manifesto polimórfico não tem FK para as tabelas de domínio; por isso, antes de excluir, o script confirma que todos os IDs registrados ainda existem e que todos os registros encontrados pelas relações das contas reservadas estão no manifesto. Também verifica os vínculos entre solicitação, conversa, prestador, serviço, portfólio, ordem, proposta, versão, mensagem e avaliação. Em particular, `PortfolioItem.serviceId` e `serviceOrderId` precisam ser nulos ou apontar para registros do mesmo conjunto.

Se não houver manifesto mas algum email reservado já existir, se um ID estiver ausente, se houver linha relacionada sem registro de propriedade, imagem de portfólio não registrada, referência externa ou qualquer divergência, o seed interrompe a transação com erro. Não tenta inferir propriedade pela associação a um usuário `isDemo = true` e não corrige a inconsistência automaticamente.

A reconstrução exclui somente IDs explicitamente registrados, na ordem das dependências, e remove as linhas correspondentes do manifesto. Usuários reservados são preservados, não apagados. Categorias e bairros são catálogos compartilhados: registros compatíveis são reutilizados, conflitos interrompem sem atualização. Toda a reconstrução e a gravação do novo manifesto ocorrem numa transação serializável. A execução exige a migração de propriedade aplicada antes do primeiro seed.

## Estados e contratação

- Uma solicitação `PAUSED` não permite aceitação. Propostas `SENT` podem permanecer registradas durante a pausa e podem voltar à consideração se a solicitação for reaberta, desde que continuem válidas e elegíveis.
- Propostas `EXPIRED`, `WITHDRAWN`, `REJECTED` e `SUPERSEDED` não podem ser aceitas. Revisões anteriores ficam no histórico; somente a folha da cadeia pode ser vigente.
- Uma ordem cancelada permanece no histórico. A versão que ela aceitou continua com estado histórico `ACCEPTED`; a ordem registra execução/cancelamento. A versão aceita não pode ser reutilizada porque `acceptedQuoteVersionId` é único.
- Propostas concorrentes rejeitadas, retiradas ou expiradas não são reativadas após cancelamento. Para negociar novamente, cria-se uma nova proposta independente. Solicitação concluída não pode receber nova ordem; outra necessidade usa outra solicitação.
- Nenhuma mensagem comum cria ordem. A contratação exige aceitação explícita de uma versão formal.

O schema permite várias ordens históricas por solicitação e tem índice comum em `[serviceRequestId, status]` para consulta; esse índice **não** garante unicidade entre ordens ativas. A futura aceitação precisa ser transacional: bloquear a linha de `ServiceRequest`, exigir estado elegível/reaberto, verificar que não há ordem `ACCEPTED` ou `IN_PROGRESS` e que não há ordem `COMPLETED`, validar uma versão vigente `SENT`, válida e ainda não aceita, e criar a ordem enquanto atualiza a solicitação. A transação deve serializar as tentativas concorrentes da mesma solicitação. No cancelamento, preserva a ordem e a aceitação histórica e registra `reopenedAt` ao reabrir a solicitação. Após conclusão, a solicitação não é reaberta para uma nova contratação.

Também dependem do backend: garantir que a cadeia de versões pertence à mesma proposta e é sequencial; impedir edições de snapshots enviados/aceitos; validar conversa e solicitação da versão aceita; validar remetente e coerência entre `Message.type`, corpo, card e conversa; conferir soma decimal dos itens; e excluir demos da reputação. O fixture estático valida relações, cronologia, itens, flags de demonstração, ordem exata aceita, estados, ausência de duas ordens em andamento e o cenário de recontratação. Ele não testa concorrência nem a lógica transacional do backend.

## Antes de executar

1. Revise o banco de destino e aplique as migrações pendentes pelo procedimento do projeto. A migração incremental `20261010175900_recontract_and_seed_ownership` depende da migração `20261010175858_marketplace_core`; nenhuma migração foi aplicada por este seed.
2. Configure a conexão em privado no ambiente do servidor e confirme que é um banco de desenvolvimento/demonstração.
3. Execute `npm run seed:check` e resolva erros do fixture.
4. Se o seed encontrar contas reservadas sem manifesto ou qualquer vínculo inesperado, pare e investigue manualmente; não remova nem altere esses dados para forçar a execução.
5. Só então execute `npm run seed` no banco pretendido.
