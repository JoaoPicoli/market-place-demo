import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, CalendarClock, CheckCircle2, Clock3, PackageCheck, RotateCcw } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { acceptQuoteVersion, getQuote, getServiceRequest, restoreQuoteVersion } from "../api";
import { Avatar } from "../components/Avatar";
import { applyCardTilt, resetCardTilt } from "../components/cardMotion";
import { SiteHeader } from "../components/SiteHeader";
import { useDemoIdentity } from "../components/useDemoIdentity";
import { WorkflowState } from "./MyRequestsPage";

const currency = (value: string) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
const dateTime = (value: string | null) => value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Não informado";
const statusLabels: Record<string, string> = { SENT: "Enviada", ACCEPTED: "Aceita", SUPERSEDED: "Substituída", REJECTED: "Rejeitada", WITHDRAWN: "Retirada", EXPIRED: "Expirada", DRAFT: "Rascunho" };

export function QuoteDetailPage() {
  const { id } = useParams();
  const quoteId = Number(id);
  const validId = Number.isSafeInteger(quoteId) && quoteId > 0;
  const queryClient = useQueryClient();
  const { identityId, identity, isLoading: identityLoading, error: identityError } = useDemoIdentity();
  const quoteQuery = useQuery({
    queryKey: ["quote", identityId, quoteId],
    queryFn: () => getQuote(identityId!, quoteId),
    enabled: identityId !== null && validId,
  });
  const quote = quoteQuery.data?.data;
  const requestQuery = useQuery({
    queryKey: ["service-request", identityId, quote?.serviceRequestId],
    queryFn: () => getServiceRequest(identityId!, quote!.serviceRequestId),
    enabled: identityId !== null && quote !== undefined,
  });
  const acceptMutation = useMutation({
    mutationFn: (versionId: number) => acceptQuoteVersion(identityId!, versionId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["quote", identityId] }),
        queryClient.invalidateQueries({ queryKey: ["service-request", identityId, quote?.serviceRequestId] }),
        queryClient.invalidateQueries({ queryKey: ["service-request-quotes", identityId, quote?.serviceRequestId] }),
        queryClient.invalidateQueries({ queryKey: ["my-service-requests", identityId] }),
      ]);
    },
  });
  const restoreMutation = useMutation({
    mutationFn: (versionId: number) => restoreQuoteVersion(identityId!, versionId),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["quote", identityId, quoteId] }),
        queryClient.invalidateQueries({ queryKey: ["service-request", identityId, quote?.serviceRequestId] }),
        queryClient.invalidateQueries({ queryKey: ["service-request-quotes", identityId, quote?.serviceRequestId] }),
        queryClient.invalidateQueries({ queryKey: ["conversation-messages", identityId, result.data.conversationId] }),
        queryClient.invalidateQueries({ queryKey: ["conversations-inbox", identityId] }),
      ]);
    },
  });
  const isProvider = quote !== undefined && identity?.providerProfileId === quote.provider.id;
  const matchingOrder = requestQuery.data?.data.serviceOrders.find((order) => quote?.versions.some((version) => version.id === order.acceptedVersion.id));

  return <div className="app-shell">
    <SiteHeader />
    <main className="shell workflow-main quote-detail-main">
      {identityLoading ? <WorkflowState title="Carregando identidade" message="Preparando o modo de demonstração." loading />
        : identityError ? <WorkflowState title="Identidades indisponíveis" message={identityError} />
          : !validId ? <WorkflowState title="Orçamento inválido" message="O identificador informado não é válido." />
            : quoteQuery.isPending ? <WorkflowState title="Carregando proposta" message="Buscando os dados comerciais e o histórico de versões." loading />
              : quoteQuery.isError ? <WorkflowState title="Proposta indisponível" message={quoteQuery.error.message} retry={() => void quoteQuery.refetch()} />
                : quote ? <>
                  <Link className="back-link" to={`/solicitacoes/${quote.serviceRequestId}`}><ArrowLeft size={16} /> Voltar para a solicitação</Link>
                  <section className="quote-provider-card">
                    <Avatar name={quote.provider.name} imageUrl={quote.provider.avatarUrl} className="avatar-card" />
                    <div><span className="eyebrow">Proposta para esta necessidade</span><h1>{quote.provider.name}</h1><p>{quote.service?.title ?? "Serviço sob medida"}</p></div>
                    {quote.provider.reputation.count > 0 ? <span className="real-rating"><BadgeCheck size={15} /> {quote.provider.reputation.average?.toFixed(1)} · {quote.provider.reputation.count} avaliações reais</span> : <span className="demo-rating">Sem avaliações reais</span>}
                  </section>
                  {quote.provider.isDemo && <div className="demo-notice quote-demo-notice"><strong>Perfil demonstrativo.</strong> Os dados e eventuais avaliações demonstrativas não representam reputação real.</div>}
                  {requestQuery.isError && <WorkflowState title="Não foi possível consultar o estado do pedido" message={requestQuery.error.message} retry={() => void requestQuery.refetch()} />}
                  {matchingOrder && <section className="order-result-card"><PackageCheck size={20} /><div><strong>Pedido {matchingOrder.status === "CANCELLED" ? "cancelado" : matchingOrder.status === "COMPLETED" ? "concluído" : matchingOrder.status === "IN_PROGRESS" ? "em andamento" : "aceito"}</strong><span>Versão {matchingOrder.acceptedVersion.version} · {currency(matchingOrder.acceptedVersion.totalAmount)} · contratação #{matchingOrder.id}</span></div></section>}
                  <section className="workflow-section quote-history-section">
                    <div className="workflow-heading"><div><span className="eyebrow">Histórico imutável</span><h2>Versões desta proposta</h2><p>Cada versão registra exatamente o escopo e as condições enviados naquele momento.</p></div>
                      {isProvider && quote.canRevise && <Link className="button-secondary" to={`/conversas/${quote.conversationId}?revisar=${quote.id}`}>Criar nova revisão</Link>}
                    </div>
                    <div className="quote-version-list">
                      {quote.versions.map((version) => <article className={`quote-version-card interactive-card ${version.isCurrent ? "quote-version-current" : ""}`} key={version.id} onPointerMove={applyCardTilt} onPointerLeave={resetCardTilt}>
                        <header><div><span className="eyebrow">Versão {version.version}{version.isCurrent ? " · vigente" : " · histórico"}</span><h3>{version.serviceTitleSnapshot ?? quote.service?.title ?? "Serviço sob medida"}</h3></div><span className={`status-pill status-${version.status.toLowerCase()}`}>{statusLabels[version.status] ?? version.status}</span></header>
                        <div className="quote-total-line"><strong>{currency(version.totalAmount)}</strong><span>{version.estimatedDurationDays ? `${version.estimatedDurationDays} dias estimados` : "Prazo não informado"}</span></div>
                        <p className="quote-scope">{version.scopeDescription}</p>
                        <div className="quote-detail-grid">
                          <div><strong>Itens incluídos</strong><ul className="quote-line-items">{version.items.map((item) => <li key={item.id}><span>{item.description} <small>× {item.quantity}</small></span><b>{currency((Number(item.quantity) * Number(item.unitPrice)).toFixed(2))}</b></li>)}</ul></div>
                          <div className="quote-conditions"><strong>Validade</strong><span>{dateTime(version.validUntil)}</span><strong>Janela proposta</strong><span>{version.proposedStartAt ? `${dateTime(version.proposedStartAt)} – ${dateTime(version.proposedEndAt)}` : "Não informada"}</span><strong>Condições</strong><span>{version.terms ?? "Não informadas"}</span></div>
                        </div>
                        {version.status === "SUPERSEDED" && <p className="superseded-note"><Clock3 size={14} /> Esta versão foi substituída e permanece disponível apenas para consulta.</p>}
                        {version.canAccept && !isProvider && <div className="quote-accept-row"><span><CalendarClock size={15} /> Válida até {dateTime(version.validUntil)}</span><button className="button-primary" onClick={() => acceptMutation.mutate(version.id)} disabled={acceptMutation.isPending}><CheckCircle2 size={16} />{acceptMutation.isPending ? "Confirmando…" : "Aceitar esta versão"}</button></div>}
                        {version.storedStatus === "REJECTED" && requestQuery.data?.data.viewerRole === "CUSTOMER" && <div className="quote-restore-row"><button className="button-secondary quote-restore-action" type="button" disabled={!version.canRestore || restoreMutation.isPending || acceptMutation.isPending} title={version.restoreUnavailableReason ?? "Restaurar esta proposta para voltar à comparação."} onClick={() => restoreMutation.mutate(version.id)}><RotateCcw size={15} aria-hidden="true" />{restoreMutation.isPending ? "Restaurando…" : "Restaurar proposta"}</button>{version.restoreUnavailableReason && <small className="quote-restore-reason">{version.restoreUnavailableReason}</small>}</div>}
                      </article>)}
                    </div>
                    {acceptMutation.isError && <p className="form-error quote-operation-error" role="alert">{acceptMutation.error.message}</p>}
                    {acceptMutation.isSuccess && <p className="form-success quote-operation-error" role="status">Pedido criado a partir da versão selecionada. O conteúdo comercial foi preservado.</p>}
                    {restoreMutation.isError && <p className="form-error quote-operation-error" role="alert">{restoreMutation.error.message}</p>}
                    {restoreMutation.isSuccess && <p className="form-success quote-operation-error" role="status">Proposta restaurada e disponível novamente na comparação. A recusa anterior continua no histórico da conversa.</p>}
                    {isProvider && <p className="demo-form-note">A identidade atual pertence ao prestador. Apenas o consumidor proprietário da solicitação pode aceitar.</p>}
                  </section>
                  <div className="quote-detail-footer"><Link to={`/conversas/${quote.conversationId}`} className="button-secondary">Abrir conversa</Link></div>
                </> : null}
    </main>
    <footer className="site-footer"><div className="shell">Fechou! · Ambiente demonstrativo</div></footer>
  </div>;
}
