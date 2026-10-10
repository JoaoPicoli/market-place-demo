import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, BadgeCheck, CheckCircle2, FileText, Search, Users } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { acceptQuoteVersion, getRequestQuotes, getServiceRequest, startConversation } from "../api";
import { Avatar } from "../components/Avatar";
import { SiteHeader } from "../components/SiteHeader";
import { useDemoIdentity } from "../components/useDemoIdentity";
import { WorkflowState } from "./MyRequestsPage";

const statusLabels: Record<string, string> = { OPEN: "Aberta", PAUSED: "Pausada", IN_PROGRESS: "Em andamento", COMPLETED: "Concluída", CANCELLED: "Cancelada" };

export function ServiceRequestPage() {
  const { id } = useParams();
  const requestId = Number(id);
  const validId = Number.isSafeInteger(requestId) && requestId > 0;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { identityId, isLoading: identityLoading, error: identityError } = useDemoIdentity();
  const requestQuery = useQuery({
    queryKey: ["service-request", identityId, requestId],
    queryFn: () => getServiceRequest(identityId!, requestId),
    enabled: identityId !== null && validId,
  });
  const startMutation = useMutation({
    mutationFn: (providerProfileId: number) => startConversation(identityId!, requestId, providerProfileId),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["service-request", identityId, requestId] });
      navigate(`/conversas/${result.data.id}`);
    },
  });
  const serviceRequest = requestQuery.data?.data;
  const quotesQuery = useQuery({
    queryKey: ["service-request-quotes", identityId, requestId],
    queryFn: () => getRequestQuotes(identityId!, requestId),
    enabled: identityId !== null && serviceRequest?.viewerRole === "CUSTOMER",
  });
  const acceptMutation = useMutation({
    mutationFn: (versionId: number) => acceptQuoteVersion(identityId!, versionId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["service-request", identityId, requestId] }),
        queryClient.invalidateQueries({ queryKey: ["service-request-quotes", identityId, requestId] }),
        queryClient.invalidateQueries({ queryKey: ["my-service-requests", identityId] }),
      ]);
    },
  });
  const quotes = quotesQuery.data?.data.quotes ?? [];
  const directoryParams = new URLSearchParams({ requestId: String(requestId) });
  if (serviceRequest?.category) directoryParams.set("categoryId", String(serviceRequest.category.id));
  if (serviceRequest?.neighborhood) directoryParams.set("neighborhoodId", String(serviceRequest.neighborhood.id));

  return (
    <div className="app-shell">
      <SiteHeader />
      <main className="shell workflow-main">
        <Link className="back-link" to="/solicitacoes"><ArrowLeft size={16} /> Minhas solicitações</Link>
        {identityLoading ? <WorkflowState title="Carregando identidade" message="Preparando o modo de demonstração." loading /> : identityError ? <WorkflowState title="Identidades indisponíveis" message={identityError} /> : !validId ? <WorkflowState title="Solicitação inválida" message="O identificador informado não é válido." /> : requestQuery.isPending ? <WorkflowState title="Carregando solicitação" message="Buscando os detalhes e as conversas." loading /> : requestQuery.isError ? <WorkflowState title="Solicitação indisponível" message={requestQuery.error.message} retry={() => void requestQuery.refetch()} /> : serviceRequest ? (
          <>
            <section className="request-detail-card">
              <div className="request-card-heading"><span className={`status-pill status-${serviceRequest.status.toLowerCase()}`}>{statusLabels[serviceRequest.status] ?? serviceRequest.status}</span><span className="request-date">Criada em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(serviceRequest.createdAt))}</span></div>
              <h1>{serviceRequest.title}</h1>
              <p className="request-description">{serviceRequest.description}</p>
              <div className="request-card-meta">{serviceRequest.category && <span>{serviceRequest.category.name}</span>}{serviceRequest.neighborhood && <span>{serviceRequest.neighborhood.name}, Curitiba</span>}{serviceRequest.budgetMin !== null && <span>Mín. R$ {serviceRequest.budgetMin.toFixed(2)}</span>}{serviceRequest.budgetMax !== null && <span>Máx. R$ {serviceRequest.budgetMax.toFixed(2)}</span>}</div>
            </section>

            {serviceRequest.serviceOrders.length > 0 && <section className="workflow-section">
              <div className="workflow-heading"><div><span className="eyebrow">Contratações desta necessidade</span><h2>Histórico de pedidos</h2><p>O pedido preserva a versão exata do orçamento que foi aceita.</p></div></div>
              <div className="request-orders-list">{serviceRequest.serviceOrders.map((order) => <article className="request-order-card" key={order.id}>
                <div className="request-order-heading"><strong>{order.provider.name}</strong><span className={`status-pill status-${order.status.toLowerCase()}`}>{order.status === "ACCEPTED" ? "Aceito" : order.status === "IN_PROGRESS" ? "Em andamento" : order.status === "COMPLETED" ? "Concluído" : "Cancelado"}</span></div>
                <p>{order.acceptedVersion.serviceTitleSnapshot ?? "Serviço contratado"} · versão {order.acceptedVersion.version}</p>
                <div className="request-order-footer"><strong>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(order.acceptedVersion.totalAmount))}</strong><Link to={`/orcamentos/${order.acceptedVersion.quoteId}`}>Ver versão aceita</Link></div>
              </article>)}</div>
            </section>}

            <section className="workflow-section">
              <div className="workflow-heading section-heading-row"><div><span className="eyebrow">Acompanhamento</span><h2>Conversas com profissionais</h2><p>{serviceRequest.viewerRole === "CUSTOMER" ? "Cada conversa é independente e fica vinculada a esta necessidade." : "Você está vendo a conversa da sua identidade demonstrativa com este cliente."}</p></div>{serviceRequest.viewerRole === "CUSTOMER" && serviceRequest.status === "OPEN" && <Link className="button-primary" to={`/?${directoryParams.toString()}`}><Search size={16} /> Procurar outro prestador</Link>}</div>

              {serviceRequest.conversations.length ? (
                <div className="conversation-list">
                  {serviceRequest.conversations.map((conversation) => (
                    <Link className="conversation-list-card" key={conversation.id} to={`/conversas/${conversation.id}`}>
                      <Avatar name={conversation.providerProfile.name} imageUrl={conversation.providerProfile.avatarUrl} className="avatar-card" />
                      <div className="conversation-list-main"><strong>{conversation.providerProfile.name}</strong><span>{conversation.latestMessage ? (conversation.latestMessage.type === "QUOTE" ? "Orçamento enviado" : conversation.latestMessage.body) : "Ainda não há mensagens"}</span><small>{conversation.messageCount} {conversation.messageCount === 1 ? "mensagem" : "mensagens"}</small></div>
                      <span className="status-pill">{conversation.status === "OPEN" ? "Aberta" : "Encerrada"}</span><ArrowUpRight size={18} />
                    </Link>
                  ))}
                </div>
              ) : <div className="state-card empty-state"><div className="state-icon"><Users size={22} /></div><h3>Ainda não há conversas</h3><p>Procure um profissional para começar a conversar sobre esta necessidade.</p>{serviceRequest.viewerRole === "CUSTOMER" && <Link className="button-primary" to={`/?${directoryParams.toString()}`}><Search size={16} /> Encontrar prestadores</Link>}</div>}
              {startMutation.isError && <p className="form-error" role="alert">{startMutation.error.message}</p>}
            </section>

            {serviceRequest.viewerRole === "CUSTOMER" && <section className="workflow-section quote-comparison-section" id="orcamentos">
              <div className="workflow-heading"><div><span className="eyebrow">Propostas formais</span><h2>Comparar orçamentos</h2><p>As ofertas vêm das conversas desta solicitação. Escopo, itens, validade e prazo ajudam a comparar além do preço.</p></div></div>
              {quotesQuery.isPending ? <WorkflowState title="Carregando orçamentos" message="Buscando as propostas vinculadas a esta necessidade." loading />
                : quotesQuery.isError ? <WorkflowState title="Não foi possível carregar os orçamentos" message={quotesQuery.error.message} retry={() => void quotesQuery.refetch()} />
                  : quotes.length === 0 ? <div className="state-card empty-state"><div className="state-icon"><FileText size={21} /></div><h3>Ainda não há propostas formais</h3><p>Quando um prestador enviar um orçamento pelo chat, ele aparecerá aqui para comparação.</p></div>
                    : <div className="quote-comparison-grid">{quotes.map((quote) => {
                      const current = quote.versions.find((version) => version.isCurrent);
                      return <article className="quote-compare-card" key={quote.id}>
                        <header className="quote-compare-provider"><Avatar name={quote.provider.name} imageUrl={quote.provider.avatarUrl} className="avatar-card" /><div><strong>{quote.provider.name}</strong><span>{quote.service?.title ?? "Serviço sob medida"}</span></div></header>
                        <div className="quote-reputation-line">{quote.provider.reputation.count > 0 ? <><BadgeCheck size={15} /> {quote.provider.reputation.average?.toFixed(1)} · {quote.provider.reputation.count} avaliações reais</> : <span>Sem avaliações reais</span>}{quote.provider.isDemo && <small>Perfil demonstrativo</small>}</div>
                        {current ? <>
                          <div className="quote-compare-price"><strong>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(current.totalAmount))}</strong><span>Versão {current.version} · {current.status === "SUPERSEDED" ? "substituída" : current.status === "EXPIRED" ? "expirada" : current.status === "ACCEPTED" ? "aceita" : current.status === "SENT" ? "enviada" : current.status.toLowerCase()}</span></div>
                          <p className="quote-compare-scope">{current.scopeDescription}</p>
                          <div className="quote-compare-items"><strong>Inclui</strong>{current.items.map((item) => <span key={item.id}>{item.description} · {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(item.quantity) * Number(item.unitPrice))}</span>)}</div>
                          <div className="quote-compare-meta"><span>Prazo: {current.estimatedDurationDays ? `${current.estimatedDurationDays} dias` : "não informado"}</span><span>Validade: {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(current.validUntil))}</span><span>Atendimento: {current.proposedStartAt ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(current.proposedStartAt)) : "não informado"}</span></div>
                          {current.terms && <p className="quote-compare-terms"><strong>Condições:</strong> {current.terms}</p>}
                        </> : <p className="muted-copy">Não foi possível identificar uma versão vigente desta proposta.</p>}
                        <div className="quote-compare-actions"><Link className="button-secondary" to={`/orcamentos/${quote.id}`}>Detalhes e histórico ({quote.versions.length} {quote.versions.length === 1 ? "versão" : "versões"})</Link>{current?.canAccept && <button className="button-primary" disabled={acceptMutation.isPending} onClick={() => acceptMutation.mutate(current.id)}><CheckCircle2 size={15} />{acceptMutation.isPending ? "Confirmando…" : "Aceitar versão"}</button>}</div>
                      </article>;
                    })}</div>}
              {acceptMutation.isError && <p className="form-error" role="alert">{acceptMutation.error.message}</p>}
              {acceptMutation.isSuccess && <p className="form-success" role="status">Pedido criado a partir da versão aceita. O histórico da proposta foi preservado.</p>}
            </section>}
          </>
        ) : null}
      </main>
      <footer className="site-footer"><div className="shell">Fechou! · Ambiente demonstrativo</div></footer>
    </div>
  );
}
