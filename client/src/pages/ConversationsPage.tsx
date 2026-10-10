import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FileText, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { getMyConversations } from "../api";
import { Avatar } from "../components/Avatar";
import { SiteHeader } from "../components/SiteHeader";
import { useDemoIdentity } from "../components/useDemoIdentity";
import { WorkflowState } from "./MyRequestsPage";

const requestStatus: Record<string, string> = {
  OPEN: "Aberta", PAUSED: "Pausada", IN_PROGRESS: "Em andamento", COMPLETED: "Concluída", CANCELLED: "Cancelada",
};
const orderStatus: Record<string, string> = {
  ACCEPTED: "Pedido aceito", IN_PROGRESS: "Serviço em andamento", COMPLETED: "Serviço concluído", CANCELLED: "Pedido cancelado",
};
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function activityLabel(value: string) {
  const date = new Date(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? `Hoje, ${new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(date)}`
    : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

export function ConversationsPage() {
  const { identityId, identity, isLoading: identityLoading, error: identityError } = useDemoIdentity();
  const conversationsQuery = useQuery({
    queryKey: ["conversations-inbox", identityId],
    queryFn: () => getMyConversations(identityId!),
    enabled: identityId !== null,
  });

  return <div className="app-shell">
    <SiteHeader />
    <main className="shell workflow-main inbox-main">
      <div className="workflow-heading">
        <div><span className="eyebrow">Sua caixa de entrada</span><h1>Conversas</h1><p>Mensagens e propostas das solicitações em que você participa.</p></div>
        <Link className="button-secondary" to="/solicitacoes">Ver minhas solicitações</Link>
      </div>

      {identityLoading ? <WorkflowState title="Carregando identidade" message="Preparando o modo de demonstração." loading />
        : identityError ? <WorkflowState title="Identidades indisponíveis" message={identityError} />
          : conversationsQuery.isPending ? <WorkflowState title="Carregando conversas" message="Buscando as conversas desta identidade." loading />
            : conversationsQuery.isError ? <WorkflowState title="Não foi possível carregar as conversas" message={conversationsQuery.error.message} retry={() => void conversationsQuery.refetch()} />
              : conversationsQuery.data.data.length === 0 ? <section className="state-card empty-state">
                <div className="state-icon"><MessageCircle size={22} /></div><h2>Nenhuma conversa por aqui</h2>
                <p>{identity?.providerProfileId ? "Quando um cliente iniciar uma conversa com seu perfil, ela aparecerá aqui." : "Encontre um profissional e inicie uma conversa sobre o que você precisa."}</p>
                <Link className="button-primary" to="/">Explorar serviços</Link>
              </section> : <div className="inbox-list" aria-label="Conversas recentes">
                {conversationsQuery.data.data.map((conversation) => {
                  const last = conversation.lastMessage;
                  const preview = !last ? "Ainda não há mensagens" : last.type === "QUOTE"
                    ? `Proposta · ${last.quoteVersion ? currency.format(Number(last.quoteVersion.totalAmount)) : "abrir orçamento"}`
                    : last.body ?? "Mensagem";
                  return <Link className="inbox-row" key={conversation.id} to={`/conversas/${conversation.id}`}>
                    <Avatar name={conversation.otherParticipant.name} imageUrl={conversation.otherParticipant.avatarUrl} className="avatar-inbox" />
                    <div className="inbox-row-content">
                      <div className="inbox-title-line"><strong>{conversation.otherParticipant.name}</strong><time dateTime={conversation.lastActivityAt}>{activityLabel(conversation.lastActivityAt)}</time></div>
                      <span className="inbox-request-title">{conversation.serviceRequest.title}</span>
                      <p className="inbox-preview">{last && last.senderId === identityId ? "Você: " : ""}{preview}</p>
                      <div className="inbox-meta">
                        <span>{conversation.serviceRequest.neighborhood?.name ?? "Curitiba"}</span>
                        <span>{conversation.quoteCount} {conversation.quoteCount === 1 ? "proposta" : "propostas"}</span>
                        {conversation.orderStatus && <span>{orderStatus[conversation.orderStatus] ?? conversation.orderStatus}</span>}
                        {!conversation.orderStatus && <span>{requestStatus[conversation.serviceRequest.status] ?? "Solicitação"}</span>}
                      </div>
                    </div>
                    {last?.type === "QUOTE" ? <FileText className="inbox-kind-icon" size={20} aria-label="Última mensagem é uma proposta" /> : null}
                    <ArrowRight className="inbox-arrow" size={19} aria-hidden="true" />
                  </Link>;
                })}
              </div>}
    </main>
    <footer className="site-footer"><div className="shell">Fechou! · Ambiente demonstrativo</div></footer>
  </div>;
}
