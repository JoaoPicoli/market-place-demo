import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileText, MessageCircle, Plus, Send } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getConversation, getConversationMessages, getQuote, sendConversationMessage } from "../api";
import { Avatar } from "../components/Avatar";
import { applyCardTilt, resetCardTilt } from "../components/cardMotion";
import { QuoteComposer } from "../components/QuoteComposer";
import { SiteHeader } from "../components/SiteHeader";
import { useDemoIdentity } from "../components/useDemoIdentity";
import { WorkflowState } from "./MyRequestsPage";

export function ConversationPage() {
  const { id } = useParams();
  const conversationId = Number(id);
  const validId = Number.isSafeInteger(conversationId) && conversationId > 0;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const revisionQuoteId = Number(searchParams.get("revisar"));
  const validRevisionId = Number.isSafeInteger(revisionQuoteId) && revisionQuoteId > 0;
  const { identityId, isLoading: identityLoading, error: identityError } = useDemoIdentity();
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [manuallyOpenQuoteComposer, setManuallyOpenQuoteComposer] = useState(false);
  const [quoteMenuOpen, setQuoteMenuOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatPanelRef = useRef<HTMLElement>(null);
  const quoteMenuRef = useRef<HTMLDivElement>(null);
  const quoteComposerRef = useRef<HTMLDivElement>(null);
  const conversationQuery = useQuery({
    queryKey: ["conversation", identityId, conversationId],
    queryFn: () => getConversation(identityId!, conversationId),
    enabled: identityId !== null && validId,
  });
  const messagesQuery = useQuery({
    queryKey: ["conversation-messages", identityId, conversationId],
    queryFn: () => getConversationMessages(identityId!, conversationId),
    enabled: identityId !== null && validId && conversationQuery.isSuccess,
  });
  const revisionQuery = useQuery({
    queryKey: ["quote", identityId, revisionQuoteId],
    queryFn: () => getQuote(identityId!, revisionQuoteId),
    enabled: identityId !== null && validRevisionId,
  });
  const sendMutation = useMutation({
    mutationFn: (text: string) => sendConversationMessage(identityId!, conversationId, text),
    onSuccess: async () => {
      setBody("");
      setFormError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["conversation-messages", identityId, conversationId] }),
        queryClient.invalidateQueries({ queryKey: ["service-request"] }),
      ]);
    },
  });
  const conversation = conversationQuery.data?.data;
  const messages = messagesQuery.data?.data ?? [];
  const revision = revisionQuery.data?.data;

  const showQuoteComposer = manuallyOpenQuoteComposer || validRevisionId;

  useEffect(() => {
    if (!quoteMenuOpen) return;
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!quoteMenuRef.current?.contains(event.target as Node)) setQuoteMenuOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setQuoteMenuOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [quoteMenuOpen]);

  useEffect(() => {
    if (!showQuoteComposer || validRevisionId) return;
    requestAnimationFrame(() => quoteComposerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [showQuoteComposer, validRevisionId]);

  useEffect(() => {
    const panel = chatPanelRef.current;
    if (panel) panel.scrollTo({ top: panel.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = body.trim();
    if (!text) return setFormError("Escreva uma mensagem antes de enviar.");
    if (text.length > 4_000) return setFormError("A mensagem deve ter no máximo 4.000 caracteres.");
    setFormError(null);
    sendMutation.mutate(text);
  }

  return (
    <div className="app-shell">
      <SiteHeader />
      <main className="shell workflow-main chat-main">
        {identityLoading ? <WorkflowState title="Carregando identidade" message="Preparando o modo de demonstração." loading /> : identityError ? <WorkflowState title="Identidades indisponíveis" message={identityError} /> : !validId ? <WorkflowState title="Conversa inválida" message="O identificador informado não é válido." /> : conversationQuery.isPending ? <WorkflowState title="Carregando conversa" message="Buscando o histórico de mensagens." loading /> : conversationQuery.isError ? <WorkflowState title="Conversa indisponível" message={conversationQuery.error.message} retry={() => void conversationQuery.refetch()} /> : conversation ? (
          <>
            <Link className="back-link" to={`/solicitacoes/${conversation.serviceRequest.id}`}><ArrowLeft size={16} /> Voltar para a solicitação</Link>
            <section className="chat-header-card">
              <Avatar name={conversation.otherParticipant.name} imageUrl={conversation.otherParticipant.avatarUrl} className="avatar-card" />
              <div><span className="eyebrow">Conversa com {conversation.role === "CUSTOMER" ? "o prestador" : "o cliente"}</span><h1>{conversation.otherParticipant.name}</h1><p>{conversation.serviceRequest.title} · {conversation.serviceRequest.neighborhood?.name ?? "Curitiba"}</p></div>
              <span className={`status-pill status-${conversation.status.toLowerCase()}`}>{conversation.status === "OPEN" ? "Aberta" : "Encerrada"}</span>
            </section>
            <div className="chat-context"><MessageCircle size={16} /><span>{conversation.serviceRequest.description}</span><span className="chat-role-label">Identidade atual: {conversation.role === "CUSTOMER" ? "consumidor" : "prestador"}</span></div>

            {showQuoteComposer && conversation.canCreateQuote && <div ref={quoteComposerRef} className="quote-composer-slot">{validRevisionId && revisionQuery.isPending ? <WorkflowState title="Carregando proposta" message="Preparando uma nova versão do orçamento." loading /> : validRevisionId && revisionQuery.isError ? <WorkflowState title="Não foi possível abrir a revisão" message={revisionQuery.error.message} retry={() => void revisionQuery.refetch()} /> : <QuoteComposer
              identityId={identityId!}
              conversationId={conversationId}
              requestId={conversation.serviceRequest.id}
              services={conversation.providerProfile.services}
              quoteId={revision?.id}
              initialServiceId={revision?.service?.id ?? null}
              initialServiceTitle={revision?.versions.find((version) => version.isCurrent)?.serviceTitleSnapshot ?? null}
              onCancel={() => { setManuallyOpenQuoteComposer(false); if (validRevisionId) navigate(`/conversas/${conversationId}`, { replace: true }); }}
            />}</div>}

            <section ref={chatPanelRef} className="chat-panel" aria-label="Histórico da conversa">
              {messagesQuery.isPending ? <WorkflowState title="Carregando mensagens" message="Um instante." loading /> : messagesQuery.isError ? <WorkflowState title="Não foi possível carregar as mensagens" message={messagesQuery.error.message} retry={() => void messagesQuery.refetch()} /> : messages.length === 0 ? <div className="chat-empty"><MessageCircle size={24} /><strong>Esta conversa ainda não tem mensagens</strong><span>Envie uma mensagem para iniciar o diálogo.</span></div> : (
                <div className="message-list">
                  {messages.map((message) => {
                    const mine = message.sender.id === identityId;
                    return <article className={`message-row ${mine ? "message-mine" : "message-theirs"}`} key={message.id}>
                      {!mine && <Avatar name={message.sender.name} imageUrl={message.sender.avatarUrl} className="avatar-message" />}
                      <div className={`message-bubble ${message.type === "QUOTE" ? "message-quote-bubble" : ""}`}>
                        <span className="message-author">{mine ? "Você" : message.sender.name}</span>
                        {message.type === "QUOTE" && message.quoteVersion ? <div className="chat-quote-card interactive-card" onPointerMove={applyCardTilt} onPointerLeave={resetCardTilt}>
                          <div className="chat-quote-title"><FileText size={16} /><strong>Orçamento · versão {message.quoteVersion.version}</strong></div>
                          <b>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(message.quoteVersion.totalAmount))}</b>
                          <p>{message.quoteVersion.scopeDescription}</p>
                          <span className={`status-pill status-${message.quoteVersion.status.toLowerCase()}`}>{message.quoteVersion.status === "SUPERSEDED" ? "Substituída" : message.quoteVersion.status === "ACCEPTED" ? "Aceita" : message.quoteVersion.status === "SENT" ? "Enviada" : message.quoteVersion.status}</span>
                          <div className="chat-quote-actions"><Link to={`/orcamentos/${message.quoteVersion.quoteId}`}>Ver proposta e histórico</Link>{conversation.role === "PROVIDER" && message.quoteVersion.status === "SENT" && message.quoteVersion.nextVersion === null && <Link to={`/conversas/${conversationId}?revisar=${message.quoteVersion.quoteId}`}>Criar revisão</Link>}</div>
                        </div> : <p>{message.body}</p>}
                        <time dateTime={message.createdAt}>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(message.createdAt))}</time>
                      </div>
                    </article>;
                  })}
                  <div ref={bottomRef} />
                </div>
              )}
            </section>
            {messagesQuery.isError && <button className="button-secondary" onClick={() => void messagesQuery.refetch()}>Tentar novamente</button>}
            {conversation.canSend ? <form className="chat-composer" onSubmit={submit}>
              <div className="chat-input-row">
                {conversation.canCreateQuote && <div className="glide-action-menu" ref={quoteMenuRef}>
                  <button className="chat-add-action" type="button" aria-label="Abrir opções da conversa" aria-haspopup="menu" aria-expanded={quoteMenuOpen} aria-controls="chat-action-menu" onClick={() => setQuoteMenuOpen((open) => !open)}>
                    <Plus size={21} aria-hidden="true" />
                  </button>
                  {quoteMenuOpen && <div className="glide-select-menu" id="chat-action-menu" role="menu" aria-label="Opções da conversa">
                    <span className="glide-menu-eyebrow">Adicionar à conversa</span>
                    <button className="glide-menu-option" type="button" role="menuitem" onClick={() => { setQuoteMenuOpen(false); setManuallyOpenQuoteComposer(true); }}>
                      <FileText size={18} aria-hidden="true" />
                      <span><strong>Criar orçamento</strong><small>Enviar uma proposta formal</small></span>
                    </button>
                  </div>}
                </div>}
                <label className="sr-only" htmlFor="chat-message">Sua mensagem</label>
                <textarea id="chat-message" value={body} maxLength={4_000} rows={2} placeholder="Escreva uma mensagem…" onChange={(event) => setBody(event.target.value)} disabled={sendMutation.isPending} />
              </div>
              <div className="composer-footer"><span>{body.length}/4000</span><button className="button-primary" type="submit" disabled={sendMutation.isPending || messagesQuery.isPending || messagesQuery.isError}><Send size={16} />{sendMutation.isPending ? "Enviando…" : "Enviar"}</button></div>
              {(formError || sendMutation.isError) && <p className="form-error" role="alert">{formError ?? (sendMutation.isError ? sendMutation.error.message : "Não foi possível enviar a mensagem.")}</p>}
            </form> : <div className="closed-conversation-note">Esta conversa está encerrada e não aceita novas mensagens.</div>}
          </>
        ) : null}
      </main>
      <footer className="site-footer"><div className="shell">Fechou! · Ambiente demonstrativo</div></footer>
    </div>
  );
}
