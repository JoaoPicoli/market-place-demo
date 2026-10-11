import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, BadgeCheck, CheckCircle2, FileText, Move, RotateCcw, Search, Trash2, Users } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { acceptQuoteVersion, getRequestQuotes, getServiceRequest, rejectQuoteVersion, restoreQuoteVersion, startConversation, type QuoteSummary, type QuoteVersionSummary } from "../api";
import { Avatar } from "../components/Avatar";
import { applyCardTilt, resetCardTilt } from "../components/cardMotion";
import { SiteHeader } from "../components/SiteHeader";
import { useDemoIdentity } from "../components/useDemoIdentity";
import { WorkflowState } from "./MyRequestsPage";
import type { PaperCrumpleStartPointer, PaperCrumpleStartPosition, PaperCrumpleState } from "../components/PaperCrumple";

const loadPaperCrumple = () => import("../components/PaperCrumple");
const PaperCrumple = lazy(loadPaperCrumple);

const statusLabels: Record<string, string> = { OPEN: "Aberta", PAUSED: "Pausada", IN_PROGRESS: "Em andamento", COMPLETED: "Concluída", CANCELLED: "Cancelada" };
type QuotePaperPreview = { quoteId: number; width: number; height: number; startPosition: PaperCrumpleStartPosition; startPointer: PaperCrumpleStartPointer | null };

export function ServiceRequestPage() {
  const { id } = useParams();
  const requestId = Number(id);
  const validId = Number.isSafeInteger(requestId) && requestId > 0;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { identityId, isLoading: identityLoading, error: identityError } = useDemoIdentity();
  const [paperPreview, setPaperPreview] = useState<QuotePaperPreview | null>(null);
  const [paperInteractionError, setPaperInteractionError] = useState<string | null>(null);
  const paperTriggerButtonRef = useRef<HTMLButtonElement>(null);
  const quoteComparisonHeadingRef = useRef<HTMLHeadingElement>(null);
  const paperGestureActiveRef = useRef(false);
  const paperStartPointerRef = useRef<PaperCrumpleStartPointer | null>(null);
  const paperCloseTimerRef = useRef<number | null>(null);
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
  const rejectMutation = useMutation({
    mutationFn: ({ versionId }: { quoteId: number; versionId: number }) => rejectQuoteVersion(identityId!, versionId),
    onSuccess: async (result, variables) => {
      window.requestAnimationFrame(() => quoteComparisonHeadingRef.current?.focus());
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["service-request", identityId, requestId] }),
        queryClient.invalidateQueries({ queryKey: ["service-request-quotes", identityId, requestId] }),
        queryClient.invalidateQueries({ queryKey: ["quote", identityId, variables.quoteId] }),
        queryClient.invalidateQueries({ queryKey: ["conversation-messages", identityId, result.data.conversationId] }),
        queryClient.invalidateQueries({ queryKey: ["conversations-inbox", identityId] }),
      ]);
    },
  });
  const restoreMutation = useMutation({
    mutationFn: ({ versionId }: { quoteId: number; versionId: number }) => restoreQuoteVersion(identityId!, versionId),
    onSuccess: async (result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["service-request-quotes", identityId, requestId] }),
        queryClient.invalidateQueries({ queryKey: ["quote", identityId, variables.quoteId] }),
        queryClient.invalidateQueries({ queryKey: ["conversation-messages", identityId, result.data.conversationId] }),
        queryClient.invalidateQueries({ queryKey: ["conversations-inbox", identityId] }),
        queryClient.invalidateQueries({ queryKey: ["service-request", identityId, requestId] }),
      ]);
    },
  });
  const rejectQuoteRequest = rejectMutation.mutate;
  const rejectPending = rejectMutation.isPending;
  const quotes = useMemo(() => quotesQuery.data?.data.quotes ?? [], [quotesQuery.data]);
  const rejectedQuotes = quotes.filter((quote) => quote.versions.some((version) => version.isCurrent && version.storedStatus === "REJECTED"));
  const rejectedQuoteIds = new Set(rejectedQuotes.map((quote) => quote.id));
  const activeQuotes = quotes.filter((quote) => !rejectedQuoteIds.has(quote.id));
  const directoryParams = new URLSearchParams({ requestId: String(requestId) });
  if (serviceRequest?.category) directoryParams.set("categoryId", String(serviceRequest.category.id));
  if (serviceRequest?.neighborhood) directoryParams.set("neighborhoodId", String(serviceRequest.neighborhood.id));

  const submitReject = useCallback((quoteId: number, versionId: number) => {
    if (rejectPending) return;
    rejectQuoteRequest({ quoteId, versionId });
  }, [rejectPending, rejectQuoteRequest]);

  const selectedPaperQuote = quotes.find((quote) => quote.id === paperPreview?.quoteId);
  const selectedPaperVersion = selectedPaperQuote
    ? selectedPaperQuote.versions.find((version) => version.isCurrent) ?? selectedPaperQuote.versions[selectedPaperQuote.versions.length - 1]
    : undefined;
  const paperImage = selectedPaperQuote && selectedPaperVersion
    ? createQuotePaperImage(selectedPaperQuote, selectedPaperVersion, paperPreview ? paperPreview.height / paperPreview.width : 1.2)
    : null;

  function openPaperPreview(quoteId: number, card: HTMLElement, trigger?: HTMLButtonElement, startPointer?: PaperCrumpleStartPointer) {
    if (paperCloseTimerRef.current !== null) window.clearTimeout(paperCloseTimerRef.current);
    paperTriggerButtonRef.current = trigger ?? null;
    paperStartPointerRef.current = startPointer ?? null;
    const rect = card.getBoundingClientRect();
    setPaperPreview({
      quoteId,
      width: Math.max(1, rect.width),
      height: Math.max(1, rect.height),
      startPosition: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
      startPointer: startPointer ?? null,
    });
    paperGestureActiveRef.current = false;
    setPaperInteractionError(null);
  }

  const closePaperPreview = useCallback(() => {
    if (paperCloseTimerRef.current !== null) window.clearTimeout(paperCloseTimerRef.current);
    paperCloseTimerRef.current = null;
    setPaperPreview(null);
    paperGestureActiveRef.current = false;
    paperStartPointerRef.current = null;
    window.requestAnimationFrame(() => (paperTriggerButtonRef.current ?? quoteComparisonHeadingRef.current)?.focus());
  }, []);

  function startPaperGesture(event: ReactPointerEvent<HTMLElement>, quoteId: number, trigger?: HTMLButtonElement) {
    if (event.button !== 0 || !event.isPrimary) return;
    if (event.pointerType === "touch" && !trigger) return;
    if (!trigger && event.target instanceof Element && event.target.closest("a,button,input,textarea,select")) return;
    event.preventDefault();
    const card = trigger?.closest<HTMLElement>(".quote-compare-card") ?? event.currentTarget.closest<HTMLElement>(".quote-compare-card");
    if (!card) return;
    openPaperPreview(quoteId, card, trigger, { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY });
  }

  function openKeyboardPaperPreview(quoteId: number, trigger: HTMLButtonElement) {
    const card = trigger.closest<HTMLElement>(".quote-compare-card");
    if (card) openPaperPreview(quoteId, card, trigger);
  }

  useEffect(() => {
    if (!paperPreview || paperPreview.startPointer) return;
    const frame = window.requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(".quote-paper-stage .paper-crumple-hit")?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
  }, [paperPreview]);

  useEffect(() => () => {
    if (paperCloseTimerRef.current !== null) window.clearTimeout(paperCloseTimerRef.current);
  }, []);

  useEffect(() => {
    function finishQuoteHold(event: PointerEvent) {
      if (paperStartPointerRef.current?.pointerId !== event.pointerId) return;
      paperStartPointerRef.current = null;
      if (!paperGestureActiveRef.current) {
        setPaperPreview(null);
        return;
      }
      paperGestureActiveRef.current = false;
      const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 30 : 190;
      paperCloseTimerRef.current = window.setTimeout(() => {
        paperCloseTimerRef.current = null;
        setPaperPreview(null);
      }, duration);
    }
    window.addEventListener("pointerup", finishQuoteHold, true);
    window.addEventListener("pointercancel", finishQuoteHold, true);
    return () => {
      window.removeEventListener("pointerup", finishQuoteHold, true);
      window.removeEventListener("pointercancel", finishQuoteHold, true);
    };
  }, []);

  useEffect(() => {
    if (!paperPreview) return;
    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closePaperPreview();
    }
    window.addEventListener("keydown", dismissOnEscape, true);
    return () => window.removeEventListener("keydown", dismissOnEscape, true);
  }, [paperPreview, closePaperPreview]);

  const handlePaperStateChange = useCallback((state: PaperCrumpleState) => {
    if (state === "holding") paperGestureActiveRef.current = true;
    else if (state === "flat" || state === "creased" || state === "crumpled") paperGestureActiveRef.current = false;
  }, []);

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
              <div className="request-orders-list">{serviceRequest.serviceOrders.map((order) => <article className="request-order-card interactive-card" key={order.id} onPointerMove={applyCardTilt} onPointerLeave={resetCardTilt}>
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
                    <Link className="conversation-list-card interactive-card" key={conversation.id} to={`/conversas/${conversation.id}`} onPointerMove={applyCardTilt} onPointerLeave={resetCardTilt}>
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
              <div className="workflow-heading"><div><span className="eyebrow">Propostas formais</span><h2 id="quote-comparison-title" ref={quoteComparisonHeadingRef} tabIndex={-1}>Comparar orçamentos</h2><p>As ofertas vêm das conversas desta solicitação. Escopo, itens, validade e prazo ajudam a comparar além do preço.</p></div></div>
              {quotesQuery.isPending ? <WorkflowState title="Carregando orçamentos" message="Buscando as propostas vinculadas a esta necessidade." loading />
                : quotesQuery.isError ? <WorkflowState title="Não foi possível carregar os orçamentos" message={quotesQuery.error.message} retry={() => void quotesQuery.refetch()} />
                  : quotes.length === 0 ? <div className="state-card empty-state"><div className="state-icon"><FileText size={21} /></div><h3>Ainda não há propostas formais</h3><p>Quando um prestador enviar um orçamento pelo chat, ele aparecerá aqui para comparação.</p></div>
                    : <>
                      {activeQuotes.length > 0 ? <div className="quote-comparison-grid">{activeQuotes.map((quote) => {
                      const current = quote.versions.find((version) => version.isCurrent);
                      const canReject = current !== undefined && current.isCurrent && current.storedStatus === "SENT";
                      return <article className={`quote-compare-card receipt-quote-card interactive-card${paperPreview?.quoteId === quote.id ? " is-paper-crumpling" : ""}`} key={quote.id} data-quote-id={quote.id} data-paper-draggable={quote.versions.length > 0 ? "true" : undefined} onPointerDownCapture={(event) => startPaperGesture(event, quote.id)} onPointerEnter={(event) => { if (quote.versions.length > 0 && event.pointerType !== "touch") void loadPaperCrumple().catch(() => undefined); }} onPointerMove={applyCardTilt} onPointerLeave={resetCardTilt}>
                        <header className="quote-receipt-header">
                          <div className="quote-receipt-brandline"><strong>FECHOU! · PROPOSTA</strong><span>{current ? `VERSÃO ${current.version} · ${current.status === "SUPERSEDED" ? "SUBSTITUÍDA" : current.status === "EXPIRED" ? "EXPIRADA" : current.status === "ACCEPTED" ? "ACEITA" : current.status === "SENT" ? "ENVIADA" : current.status}` : "HISTÓRICO"}</span></div>
                          <div className="quote-compare-provider"><Avatar name={quote.provider.name} imageUrl={quote.provider.avatarUrl} className="avatar-card" /><div><strong>{quote.provider.name}</strong><span>{quote.service?.title ?? "Serviço sob medida"}</span></div>{quote.versions.length > 0 && <button className="quote-crumple-handle" type="button" aria-label={`Amassar a prévia do orçamento de ${quote.provider.name}`} title="Arraste o cartão para amassá-lo" onPointerDown={(event) => startPaperGesture(event, quote.id, event.currentTarget)} onClick={(event) => { if (event.detail === 0) openKeyboardPaperPreview(quote.id, event.currentTarget); }}><Move size={18} aria-hidden="true" /></button>}</div>
                          <div className="quote-reputation-line">{quote.provider.reputation.count > 0 ? <><BadgeCheck size={15} /> {quote.provider.reputation.average?.toFixed(1)} · {quote.provider.reputation.count} avaliações reais</> : <span>Sem avaliações reais</span>}{quote.provider.isDemo && <small>Perfil demonstrativo</small>}</div>
                        </header>
                        {current ? <>
                          <section className="quote-receipt-section"><h3>Serviço / escopo</h3><p className="quote-compare-scope">{current.scopeDescription}</p></section>
                          <section className="quote-receipt-section quote-receipt-items"><h3>Itens do orçamento</h3>{current.items.length > 0 ? current.items.map((item) => <div className="quote-receipt-item" key={item.id}><span>{item.description}</span><strong>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(item.quantity) * Number(item.unitPrice))}</strong><small>{new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(Number(item.quantity))} × {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(item.unitPrice))} por unidade</small></div>) : <p className="quote-receipt-no-items">Sem itens discriminados neste orçamento.</p>}</section>
                          <div className="quote-receipt-total"><span>Total proposto</span><strong>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(current.totalAmount))}</strong></div>
                          <section className="quote-receipt-meta"><div><span>Prazo estimado</span><strong>{current.estimatedDurationDays ? `${current.estimatedDurationDays} dias` : "Não informado"}</strong></div><div><span>Atendimento</span><strong>{current.proposedStartAt ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(current.proposedStartAt)) : "Não informado"}</strong></div><div><span>Válida até</span><strong>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(current.validUntil))}</strong></div></section>
                          {current.terms && <p className="quote-receipt-terms"><strong>Condições:</strong> {current.terms}</p>}
                        </> : <p className="muted-copy quote-receipt-missing">Não foi possível identificar uma versão vigente desta proposta.</p>}
                        {quote.versions.length > 0 && <p className="quote-drag-hint">Segure e arraste o cartão para ver a animação de papel. Soltar não altera a proposta.</p>}
                        <div className="quote-compare-actions"><Link className="button-secondary" to={`/orcamentos/${quote.id}`}>Detalhes e histórico ({quote.versions.length} {quote.versions.length === 1 ? "versão" : "versões"})</Link>{current?.canAccept && <button className="button-primary" disabled={acceptMutation.isPending || rejectMutation.isPending} onClick={() => acceptMutation.mutate(current.id)}><CheckCircle2 size={15} />{acceptMutation.isPending ? "Confirmando…" : "Aceitar versão"}</button>}{canReject && <button className="quote-reject-action" disabled={rejectMutation.isPending || acceptMutation.isPending} onClick={() => submitReject(quote.id, current.id)}><Trash2 size={15} aria-hidden="true" />Recusar e retirar da comparação</button>}</div>
                      </article>;                    })}</div> : <div className="state-card empty-state"><div className="state-icon"><FileText size={21} /></div><h3>Nenhuma proposta disponível para contratar</h3><p>As propostas recusadas continuam no histórico, mas não podem mais ser aceitas.</p></div>}
                      {rejectedQuotes.length > 0 && <div className="rejected-quotes-panel"><h3>Propostas recusadas</h3><p>Restaurar reativa os mesmos valores e condições. O histórico do chat registra a recusa e a restauração.</p><div className="rejected-quotes-list">{rejectedQuotes.map((quote) => {
                        const version = quote.versions.find((item) => item.isCurrent);
                        const restoreUnavailableReason = version?.restoreUnavailableReason;
                        return <article className="rejected-quote-row" key={quote.id}><div><strong>{quote.provider.name}</strong><span>{quote.service?.title ?? "Serviço sob medida"}{version ? ` · ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(version.totalAmount))}` : ""}</span></div><span className="status-pill status-rejected">Recusada</span><Link to={`/orcamentos/${quote.id}`}>Ver histórico</Link>{version && <div className="quote-restore-control"><button className="button-secondary quote-restore-action" type="button" disabled={!version.canRestore || restoreMutation.isPending || rejectMutation.isPending || acceptMutation.isPending} title={restoreUnavailableReason ?? "Restaurar esta proposta para voltar à comparação."} aria-describedby={restoreUnavailableReason ? `restore-reason-${version.id}` : undefined} onClick={() => restoreMutation.mutate({ quoteId: quote.id, versionId: version.id })}><RotateCcw size={15} aria-hidden="true" />{restoreMutation.isPending ? "Restaurando…" : "Restaurar proposta"}</button>{restoreUnavailableReason && <small id={`restore-reason-${version.id}`} className="quote-restore-reason">{restoreUnavailableReason}</small>}</div>}</article>;
                      })}</div></div>}
                    </>}
              {acceptMutation.isError && <p className="form-error" role="alert">{acceptMutation.error.message}</p>}
              {acceptMutation.isSuccess && <p className="form-success" role="status">Pedido criado a partir da versão aceita. O histórico da proposta foi preservado.</p>}
              {rejectMutation.isError && <p className="form-error" role="alert">{rejectMutation.error.message}</p>}
              {rejectMutation.isSuccess && <p className="form-success" role="status">Proposta recusada. O orçamento e as mensagens continuam disponíveis no histórico.</p>}
              {restoreMutation.isError && <p className="form-error" role="alert">{restoreMutation.error.message}</p>}
              {restoreMutation.isSuccess && <p className="form-success" role="status">Proposta restaurada e de volta à comparação. A conversa registra essa ação.</p>}
              {paperPreview && selectedPaperQuote && selectedPaperVersion && paperImage && <Suspense fallback={<img className="quote-paper-flat-preview" src={paperImage} alt={`Prévia do orçamento de ${selectedPaperQuote.provider.name}`} style={{ left: paperPreview.startPosition.x, top: paperPreview.startPosition.y, width: paperPreview.width, height: paperPreview.height }} />}>
                <PaperCrumple src={paperImage} alt={`Prévia animada do orçamento de ${selectedPaperQuote.provider.name}, versão ${selectedPaperVersion.version}`} width={paperPreview.width} height={paperPreview.height} sceneHeight={window.innerHeight} imageFit="contain" releaseBehavior="restore" crumpleAmount={0.92} crumpleDuration={0.42} releaseDuration={0.11} paperColor="#fffdf6" foldCount={8} foldSharpness={0.72} wrinkleDepth={0.9} paperTexture={0.16} detail={56} dragRadius={Math.max(window.innerWidth, window.innerHeight)} startPointer={paperPreview.startPointer} startPosition={paperPreview.startPosition} autoFocus={!paperPreview.startPointer} onStateChange={handlePaperStateChange} onError={(error) => setPaperInteractionError(error.message)} className="quote-paper-stage" style={{ height: "100dvh" }} />
              </Suspense>}
              {paperInteractionError && <p className="quote-paper-error" role="status">Não foi possível iniciar o efeito 3D neste navegador.</p>}
            </section>}
          </>
        ) : null}
      </main>
      <footer className="site-footer"><div className="shell">Fechou! · Ambiente demonstrativo</div></footer>
    </div>
  );
}

function escapeSvg(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function paperLine(value: string, maxLength = 76) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}

function paperLines(value: string, maxLength: number, maxLines: number) {
  const words = value.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxLength && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else line = next;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    lines[maxLines - 1] = paperLine(lines[maxLines - 1], maxLength - 1) + "…";
  }
  return lines;
}

function createQuotePaperImage(quote: QuoteSummary, version: QuoteVersionSummary, aspectRatio: number) {
  const width = 720;
  const height = Math.max(780, Math.round(width * Math.max(1.083, aspectRatio)));
  const money = (amount: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount);
  const date = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(value));
  const provider = escapeSvg(paperLine(quote.provider.name, 42));
  const service = escapeSvg(paperLine(quote.service?.title ?? version.serviceTitleSnapshot ?? "Serviço sob medida", 48));
  const scope = paperLines(version.scopeDescription, 68, 3).map(escapeSvg);
  const total = escapeSvg(money(Number(version.totalAmount)));
  const issuedAt = version.message?.createdAt ? date(version.message.createdAt) : null;
  const terms = version.terms ? paperLines(version.terms, 68, 2).map(escapeSvg) : [];
  const scopeTop = 278;
  const scopeRows = scope.map((line, index) => `<text x="54" y="${scopeTop + 29 + index * 25}" class="receipt-text">${line}</text>`).join("");
  const itemHeadingY = Math.max(370, scopeTop + 36 + scope.length * 25);
  const itemStartY = itemHeadingY + 30;
  const totalRuleY = height - 280;
  const itemCapacity = Math.max(0, Math.min(5, Math.floor((totalRuleY - itemStartY - 16) / 46)));
  const visibleItems = version.items.slice(0, itemCapacity);
  const quantityFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
  const itemRows = visibleItems.map((item, index) => {
    const y = itemStartY + index * 46;
    const label = escapeSvg(paperLine(item.description, 42));
    const quantity = quantityFormat.format(Number(item.quantity));
    const unitPrice = escapeSvg(money(Number(item.unitPrice)));
    const lineTotal = escapeSvg(money(Number(item.quantity) * Number(item.unitPrice)));
    return `<text x="54" y="${y}" class="receipt-item">${label}</text><text x="666" y="${y}" text-anchor="end" class="receipt-value">${lineTotal}</text><text x="54" y="${y + 19}" class="receipt-muted">${quantity} × ${unitPrice} por unidade</text>`;
  }).join("");
  const omittedItems = version.items.length - visibleItems.length;
  const itemNote = omittedItems > 0
    ? `<text x="54" y="${itemStartY + (visibleItems.length ? visibleItems.length * 46 : 0)}" class="receipt-muted">${visibleItems.length ? "+ " : ""}${omittedItems} ${omittedItems === 1 ? "item" : "itens"} no orçamento completo</text>`
    : version.items.length === 0
      ? `<text x="54" y="${itemStartY}" class="receipt-muted">Sem itens discriminados</text>`
      : "";
  const footer = height - 28;
  const validUntil = escapeSvg(date(version.validUntil));
  const duration = version.estimatedDurationDays ? `${version.estimatedDurationDays} dias` : "Não informado";
  const proposedDate = version.proposedStartAt ? date(version.proposedStartAt) : "Não informado";
  const termsRows = terms.map((line, index) => `<text x="54" y="${height - 173 + index * 19}" class="receipt-muted">${index === 0 ? "CONDIÇÕES: " : "            "}${line}</text>`).join("");
  const receiptStyles = `font-family="Consolas, 'Courier New', monospace" fill="#282820"`;
  const rule = (y: number) => `<path d="M48 ${y}H672" class="receipt-rule"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect x="9" y="8" width="702" height="${height - 16}" rx="5" fill="#fffdf6" stroke="#e5dfd2" stroke-width="2"/><g ${receiptStyles}><text x="360" y="49" text-anchor="middle" class="receipt-brand">FECHOU! · PROPOSTA</text><text x="360" y="91" text-anchor="middle" class="receipt-provider">${provider}</text><text x="360" y="122" text-anchor="middle" class="receipt-service">${service}</text><text x="360" y="151" text-anchor="middle" class="receipt-muted">VERSÃO ${version.version}${issuedAt ? ` · ENVIADA EM ${escapeSvg(issuedAt)}` : ""}</text>${rule(177)}<text x="54" y="211" class="receipt-label">PRESTADOR</text><text x="54" y="240" class="receipt-text">${provider}</text>${rule(257)}<text x="54" y="${scopeTop}" class="receipt-label">SERVIÇO / ESCOPO</text>${scopeRows}${rule(itemHeadingY - 12)}<text x="54" y="${itemHeadingY + 14}" class="receipt-label">ITENS DO ORÇAMENTO</text>${itemRows}${itemNote}${rule(totalRuleY)}<text x="54" y="${totalRuleY + 31}" class="receipt-total-label">TOTAL PROPOSTO</text><text x="666" y="${totalRuleY + 78}" text-anchor="end" class="receipt-total">${total}</text>${rule(height - 188)}${termsRows}<text x="54" y="${height - 126}" class="receipt-text">PRAZO: ${escapeSvg(duration)}</text><text x="54" y="${height - 98}" class="receipt-text">ATENDIMENTO: ${escapeSvg(proposedDate)}</text><text x="54" y="${height - 70}" class="receipt-text">VÁLIDA ATÉ: ${validUntil}</text><text x="360" y="${footer}" text-anchor="middle" class="receipt-footer">PROPOSTA COMERCIAL · NÃO É DOCUMENTO FISCAL</text></g><style>.receipt-brand{font-size:19px;font-weight:700;letter-spacing:3px;fill:#526554}.receipt-provider{font-size:31px;font-weight:700}.receipt-service{font-size:20px;fill:#55594f}.receipt-label{font-size:17px;font-weight:700;letter-spacing:1px;fill:#686456}.receipt-text{font-size:20px}.receipt-muted{font-size:15px;fill:#66665e}.receipt-rule{stroke:#8e887b;stroke-width:2;stroke-dasharray:3 8}.receipt-item{font-size:19px}.receipt-value{font-size:19px;font-weight:700}.receipt-total-label{font-size:21px;font-weight:700;letter-spacing:1px}.receipt-total{font-size:43px;font-weight:700;fill:#243f31}.receipt-footer{font-size:13px;letter-spacing:.4px;fill:#6c6a61}</style></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
